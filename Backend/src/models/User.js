
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // HCM role and account controls
    role: {
      type: String,
      enum: ["admin", "hr", "employee"],
      default: "employee",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // Existing email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Existing forgot-password fields
    passwordResetCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

