
const requireVerifiedEmail = require(
  "../middleware/verified-email.middleware"
);
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { z } = require("zod");
const router = require("express").Router();

const validate = require("../middleware/validate");
const authMiddleware = require("../middleware/auth.middleware");
const rateLimit = require("../middleware/rate-limit");

const {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} = require("../schemas/auth.schema");

const {
  signup,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/auth.controller");

// // Signup
// router.post(
//   "/signup",
//   rateLimit({ limit: 10 }),
//   validate(signupSchema),
//   signup
// );

// Verify signup email
router.post(
  "/verify-email",
  rateLimit({ limit: 20 }),
  validate(verifyEmailSchema),
  verifyEmail
);

// Resend verification OTP
router.post(
  "/resend-verification",
  rateLimit({ limit: 5 }),
  validate(resendVerificationSchema),
  resendVerification
);

// Forgot password: send OTP
router.post(
  "/forgot-password",
  rateLimit({ limit: 5 }),
  validate(forgotPasswordSchema),
  forgotPassword
);

// Verify password reset OTP
router.post(
  "/verify-reset-otp",
  rateLimit({ limit: 10 }),
  validate(verifyResetOtpSchema),
  verifyResetOtp
);

// Set a new password
router.post(
  "/reset-password",
  rateLimit({ limit: 5 }),
  validate(resetPasswordSchema),
  resetPassword
);

// Login
router.post(
  "/login",
  rateLimit({ limit: 20 }),
  validate(loginSchema),
  login
);

// Logout
router.post("/logout", logout);

// Current authenticated user
router.get(
  "/me",
  authMiddleware,
  requireVerifiedEmail,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 UTF-8 bytes" }
  ),
});

router.post(
  "/change-password",
  authMiddleware,
  async (req, res, next) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid password details",
          errors: parsed.error.issues,
        });
      }

      const { currentPassword, newPassword } = parsed.data;

      const user = await User.findById(req.user.id)
        .select("+password");

      if (!user || user.isActive === false) {
        return res.status(401).json({
          success: false,
          message: "Account unavailable",
        });
      }

      const matches = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!matches) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different",
        });
      }

      user.password = await bcrypt.hash(newPassword, 12);
      user.mustChangePassword = false;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
