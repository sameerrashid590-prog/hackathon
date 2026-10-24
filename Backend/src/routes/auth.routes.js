
const requireVerifiedEmail = require(
  "../middleware/verified-email.middleware"
);

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

// Signup
router.post(
  "/signup",
  rateLimit({ limit: 10 }),
  validate(signupSchema),
  signup
);

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

module.exports = router;
