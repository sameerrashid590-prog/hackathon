

const router = require("express").Router();
const { z } = require("zod");

const Department = require("../models/Department");

const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const requirePasswordChanged = require(
  "../middleware/require-password-change.middleware"
);

// Department validation
const departmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

// -------------------------------------
// GET ALL DEPARTMENTS
// Admin and HR only
// -------------------------------------

router.get(
  "/",
  authMiddleware,
  requirePasswordChanged,
  allowRoles("admin", "hr"),
  async (req, res, next) => {
    try {
      const departments = await Department.find().sort({
        name: 1,
      });

      res.status(200).json({
        success: true,
        departments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------
// CREATE DEPARTMENT
// Admin only
// -------------------------------------

router.post(
  "/",
  authMiddleware,
  requirePasswordChanged,
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const data = departmentSchema.parse(req.body);

      const department = await Department.create(data);

      res.status(201).json({
        success: true,
        message: "Department created successfully",
        department,
      });
    } catch (error) {
      // Validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid department name",
          errors: error.issues,
        });
      }

      // Duplicate department name
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Department already exists",
        });
      }

      next(error);
    }
  }
);

module.exports = router;
