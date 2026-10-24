const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

const User = require("../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("./email.service");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const VERIFICATION_FIELDS = [
  "+emailVerificationCodeHash",
  "+emailVerificationExpiresAt",
  "+emailVerificationSentAt",
  "+emailVerificationAttempts",
].join(" ");

const RESET_FIELDS = [
  "+passwordResetCodeHash",
  "+passwordResetExpiresAt",
  "+passwordResetSentAt",
  "+passwordResetAttempts",
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
function hashOtp(userId, code, purpose = "verification") {
  const secret = process.env.OTP_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_SECRET is missing or too short");
  }

  const value =
    purpose === "verification"
      ? `${userId}:${code}`
      : `${purpose}:${userId}:${code}`;

  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

// -------------------------------------
// EXISTING EMAIL VERIFICATION
// -------------------------------------

async function sendNewVerificationCode(user) {
  const now = Date.now();

  if (
    user.emailVerificationSentAt &&
    now - new Date(user.emailVerificationSentAt).getTime() <
      RESEND_COOLDOWN_MS
  ) {
    return false;
  }

  const code = generateOtp();

  user.emailVerificationCodeHash = hashOtp(
    user._id.toString(),
    code
  );
  user.emailVerificationExpiresAt = new Date(
    now + OTP_EXPIRY_MS
  );
  user.emailVerificationAttempts = 0;

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
    console.error(
      "Signup verification email failed:",
      error.message
    );

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

  if (!user || user.isEmailVerified) {
    return;
  }

  await sendNewVerificationCode(user);
}

// -------------------------------------
// FORGOT PASSWORD
// -------------------------------------

async function forgotPassword({ email }) {
  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select(RESET_FIELDS);

  // Do not reveal whether the email exists.
  if (!user) {
    return;
  }

  const now = Date.now();

  if (
    user.passwordResetSentAt &&
    now - new Date(user.passwordResetSentAt).getTime() <
      RESEND_COOLDOWN_MS
  ) {
    return;
  }

  const code = generateOtp();

  user.passwordResetCodeHash = hashOtp(
    user._id.toString(),
    code,
    "password-reset"
  );

  user.passwordResetExpiresAt = new Date(
    now + OTP_EXPIRY_MS
  );
  user.passwordResetAttempts = 0;
  user.passwordResetSentAt = new Date(now);

  await user.save();

  await sendPasswordResetEmail(user.email, code);
}

async function verifyResetOtp({ email, code }) {
  const user = await User.findOne({
    email: normalizeEmail(email),
  }).select(RESET_FIELDS);

  if (
    !user ||
    !user.passwordResetCodeHash ||
    !user.passwordResetExpiresAt ||
    new Date(user.passwordResetExpiresAt).getTime() <=
      Date.now()
  ) {
    throw createError("Invalid or expired reset code");
  }

  if (user.passwordResetAttempts >= MAX_OTP_ATTEMPTS) {
    throw createError(
      "Too many attempts. Request a new code.",
      429
    );
  }

  const actualHash = Buffer.from(
    user.passwordResetCodeHash,
    "hex"
  );

  const expectedHash = Buffer.from(
    hashOtp(
      user._id.toString(),
      code,
      "password-reset"
    ),
    "hex"
  );

  const matches =
    actualHash.length === expectedHash.length &&
    crypto.timingSafeEqual(actualHash, expectedHash);

  if (!matches) {
    user.passwordResetAttempts += 1;
    await user.save();

    throw createError("Invalid reset code");
  }

  // The reset token is tied to the current OTP hash.
  // Generating another OTP invalidates older reset tokens.
  const resetToken = jwt.sign(
    {
      sub: user._id.toString(),
      purpose: "password-reset",
      otpHash: user.passwordResetCodeHash,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "5m",
      algorithm: "HS256",
    }
  );

  return { resetToken };
}


async function resetPassword({ resetToken, newPassword }) {
  let payload;

  // Step 1: Verify the reset JWT
  try {
    payload = jwt.verify(
      resetToken,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );
  } catch {
    throw createError(
      "Invalid or expired reset session",
      401
    );
  }

  // Step 2: Confirm this is a password-reset token
  if (
    payload.purpose !== "password-reset" ||
    typeof payload.sub !== "string" ||
    typeof payload.otpHash !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    throw createError("Invalid reset session", 401);
  }

  // Step 3: Hash the new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    12
  );

  // Step 4: Atomically update password and consume OTP
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: payload.sub,
      passwordResetCodeHash: payload.otpHash,
      passwordResetExpiresAt: { $gt: new Date() },
      passwordResetAttempts: { $lt: MAX_OTP_ATTEMPTS },
    },
    {
      $set: {
        password: hashedPassword,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
        passwordResetAttempts: 0,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedUser) {
    throw createError(
      "Invalid or expired reset session",
      401
    );
  }

  return {
    message: "Password reset successfully",
  };
}

// -------------------------------------
// EXISTING LOGIN
// -------------------------------------

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
if (user.isActive === false) {
  throw createError("Account is deactivated", 403);
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
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: true,
  mustChangePassword: user.mustChangePassword,
},
  };
}

module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
