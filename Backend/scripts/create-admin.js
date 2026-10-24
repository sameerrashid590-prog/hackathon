
require("dotenv").config();
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);


const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (
    !email ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error(
      "Provide ADMIN_EMAIL and ADMIN_PASSWORD (12–72 UTF-8 bytes)"
    );
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existingAdmin = await User.exists({
    role: "admin",
  });

  if (existingAdmin) {
    console.log("Admin already exists. No changes made.");
    return;
  }

  const existingEmail = await User.exists({ email });

  if (existingEmail) {
    throw new Error(
      "Email already belongs to an existing account"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.create({
    name: "System Admin",
    email,
    password: hashedPassword,
    role: "admin",
    isActive: true,
    isEmailVerified: true,
    mustChangePassword: false,
  });

  console.log("Initial Admin account created.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
