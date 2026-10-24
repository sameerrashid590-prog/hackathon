
const { z } = require("zod");

const passwordSchema = z.string().min(8).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  { message: "Password must be at most 72 UTF-8 bytes" }
);

const emailSchema = z.string().trim().email().max(254);

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, {
    message: "Verification code must contain 6 digits",
  }),
});

const resendVerificationSchema = z.object({
  email: emailSchema,
});

module.exports = {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
