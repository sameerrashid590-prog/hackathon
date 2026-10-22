const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function signup({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({
    email: normalizedEmail,
  });

  if (existing) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  const valid = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!valid) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
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
    },
  };
}

module.exports = { signup, login };