
const router = require("express").Router();
const { z } = require("zod");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const createHrSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 UTF-8 bytes" }
  ),
});

// All routes here require Admin authentication.
router.use(authMiddleware, allowRoles("admin"));

// Admin creates an HR account.
router.post("/hr", async (req, res, next) => {
  try {
    const result = createHrSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid HR details",
        errors: result.error.issues,
      });
    }

    const { name, password } = result.data;
    const email = result.data.email.toLowerCase();

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "hr",
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message: "HR account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    next(error);
  }
});

// Admin views HR accounts.
router.get("/hr", async (req, res, next) => {
  try {
    const users = await User.find({ role: "hr" })
      .select("name email role isActive mustChangePassword")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
