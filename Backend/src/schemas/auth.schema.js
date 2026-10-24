
const { z } = require("zod");

// Shared password validation
const passwordSchema = z.string().min(8).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  { message: "Password must be at most 72 UTF-8 bytes" }
);

// Shared email validation
const emailSchema = z.string().trim().email().max(254);

// Signup
const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

// Login
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Verify signup email OTP
const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, {
    message: "Verification code must contain 6 digits",
  }),
});

// Resend signup verification OTP
const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Forgot password: request OTP
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Verify password-reset OTP
const verifyResetOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, {
    message: "Reset code must contain 6 digits",
  }),
});

// Reset password using verified reset token
const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: passwordSchema,
});

module.exports = {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
};

