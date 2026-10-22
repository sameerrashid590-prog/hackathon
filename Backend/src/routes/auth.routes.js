const router = require("express").Router();

const validate = require("../middleware/validate");
const authMiddleware = require("../middleware/auth.middleware");

const {
  signupSchema,
  loginSchema,
} = require("../schemas/auth.schema");

const {
  signup,
  login,
  logout,
} = require("../controllers/auth.controller");

const rateLimit = require("../middleware/rate-limit");
router.post("/signup", rateLimit({ limit: 10 }), validate(signupSchema), signup);
router.post("/login", rateLimit({ limit: 20 }), validate(loginSchema), login);
router.post("/logout", logout);

router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;