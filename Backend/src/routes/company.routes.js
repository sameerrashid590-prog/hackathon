
const router = require("express").Router();
const { z } = require("zod");

const Company = require("../models/Company");
const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const companySchema = z.object({
  name: z.string().trim().min(2).max(100),
  officeStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("09:00"),
  graceMinutes: z.number().int().min(0).default(15),
  halfDayHours: z.number().min(1).default(5),
  weekends: z.array(z.number().int().min(0).max(6))
    .default([0, 6]),
});

// Read company details
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const company = await Company.findOne();

    res.json({
      success: true,
      company,
    });
  } catch (error) {
    next(error);
  }
});

// Initial company setup - Admin only
router.post(
  "/",
  authMiddleware,
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const data = companySchema.parse(req.body);

      const existing = await Company.findOne();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Company already configured",
        });
      }

      const company = await Company.create(data);

      res.status(201).json({
        success: true,
        company,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid company settings",
          errors: error.issues,
        });
      }

      next(error);
    }
  }
);

module.exports = router;
