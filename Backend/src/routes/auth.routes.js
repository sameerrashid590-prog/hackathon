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
} = require("../schemas/auth.schema");

const {
  signup,
  login,
  logout,
  verifyEmail,
  resendVerification,
} = require("../controllers/auth.controller");

router.post(
  "/signup",
  rateLimit({ limit: 10 }),
  validate(signupSchema),
  signup
);

router.post(
  "/verify-email",
  rateLimit({ limit: 20 }),
  validate(verifyEmailSchema),
  verifyEmail
);

router.post(
  "/resend-verification",
  rateLimit({ limit: 5 }),
  validate(resendVerificationSchema),
  resendVerification
);

router.post(
  "/login",
  rateLimit({ limit: 20 }),
  validate(loginSchema),
  login
);

router.post("/logout", logout);

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
