
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

const User = require("../models/User");
const { sendVerificationEmail } = require("./email.service");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const VERIFICATION_FIELDS = [
  "+emailVerificationCodeHash",
  "+emailVerificationExpiresAt",
  "+emailVerificationSentAt",
  "+emailVerificationAttempts",
].join(" ");

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function generateOtp() {
  return crypto.randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function hashOtp(userId, code) {
  const secret = process.env.OTP_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_SECRET is missing or too short");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${code}`)
    .digest("hex");
}

async function sendNewVerificationCode(user) {
  const now = Date.now();

  if (
    user.emailVerificationSentAt &&
    now - new Date(user.emailVerificationSentAt).getTime()
      < RESEND_COOLDOWN_MS
  ) {
    return false;
  }

  const code = generateOtp();

  user.emailVerificationCodeHash = hashOtp(
    user._id.toString(),
    code
  );
  user.emailVerificationExpiresAt =
    new Date(now + OTP_EXPIRY_MS);
  user.emailVerificationAttempts = 0;

  // Save before sending so the recipient's code is valid.
  await user.save();

  await sendVerificationEmail(user.email, code);

  user.emailVerificationSentAt = new Date();
  await user.save();

  return true;
}

async function signup({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const existing = await User.findOne({
    email: normalizedEmail,
  });

  if (existing) {
    throw createError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let user;

  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Email already registered", 409);
    }
    throw error;
  }

  try {
    await sendNewVerificationCode(user);
  } catch (error) {
    console.error("Signup verification email failed:", error.message);
    // Keep the account so verification can be retried.
    throw createError(
      "Account created, but verification email could not be sent. Please request another code.",
      503
    );
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isEmailVerified: false,
  };
}

async function verifyEmail({ email, code }) {
  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select(VERIFICATION_FIELDS);

  if (!user || user.isEmailVerified) {
    throw createError("Invalid or expired verification code");
  }

  const expiresAt = user.emailVerificationExpiresAt;

  if (
    !user.emailVerificationCodeHash ||
    !expiresAt ||
    new Date(expiresAt).getTime() <= Date.now()
  ) {
    throw createError(
      "Verification code expired. Request a new code."
    );
  }

  if (user.emailVerificationAttempts >= MAX_OTP_ATTEMPTS) {
    throw createError(
      "Too many attempts. Request a new code.",
      429
    );
  }

  const actualHash = Buffer.from(
    user.emailVerificationCodeHash,
    "hex"
  );

  const expectedHash = Buffer.from(
    hashOtp(user._id.toString(), code),
    "hex"
  );

  const matches =
    actualHash.length === expectedHash.length &&
    crypto.timingSafeEqual(actualHash, expectedHash);

  if (!matches) {
    user.emailVerificationAttempts += 1;
    await user.save();

    throw createError("Invalid verification code");
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = null;
  user.emailVerificationExpiresAt = null;
  user.emailVerificationSentAt = null;
  user.emailVerificationAttempts = 0;

  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isEmailVerified: true,
  };
}

async function resendVerification({ email }) {
  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select(VERIFICATION_FIELDS);

  // Do not reveal whether an email address exists.
  if (!user || user.isEmailVerified) {
    return;
  }

  await sendNewVerificationCode(user);
}

async function login({ email, password }) {
  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select("+password");

  const valid = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!valid) {
    throw createError("Invalid email or password", 401);
  }

  if (user.isEmailVerified !== true) {
    throw createError(
      "Please verify your email before logging in.",
      403
    );
  }

  const token = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1d", algorithm: "HS256" }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: true,
    },
  };
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
};
