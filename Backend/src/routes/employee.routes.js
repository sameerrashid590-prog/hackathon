
const router = require("express").Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const User = require("../models/User");
const Employee = require("../models/Employee");
const Department = require("../models/Department");

const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const requirePasswordChanged = require(
  "../middleware/require-password-change.middleware"
);

// All employee routes require authentication
router.use(authMiddleware, requirePasswordChanged);

// Validate employee details
const employeeSchema = z.object({
  name: z.string().trim().min(2).max(80),

  email: z.email().trim().max(254),

  employeeCode: z.string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9-]+$/),

  department: z.string().refine(
    (id) => mongoose.isValidObjectId(id),
    { message: "Invalid department ID" }
  ),

  designation: z.string().trim().min(2).max(80),

  joiningDate: z.iso.date(),

  basicSalary: z.number().positive(),

  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),

  password: z.string().min(8).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    { message: "Password must be at most 72 UTF-8 bytes" }
  ),
});

// -------------------------------------
// HR REGISTERS AN EMPLOYEE
// -------------------------------------

router.post(
  "/",
  allowRoles("hr"),
  async (req, res, next) => {
    try {
      const parsed = employeeSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee details",
          errors: parsed.error.issues,
        });
      }

      const data = parsed.data;
      const email = data.email.toLowerCase();
      const employeeCode = data.employeeCode.toUpperCase();

      const department = await Department.findById(
        data.department
      );

      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      const hashedPassword = await bcrypt.hash(
        data.password,
        12
      );

      let employee;

      // Create login and employee record together
      await mongoose.connection.transaction(async (session) => {
        const [user] = await User.create(
          [{
            name: data.name,
            email,
            password: hashedPassword,
            role: "employee",
            isActive: true,
            isEmailVerified: true,
            mustChangePassword: true,
          }],
          { session }
        );

        const [createdEmployee] = await Employee.create(
          [{
            user: user._id,
            employeeCode,
            department: department._id,
            designation: data.designation,
            joiningDate: new Date(
              `${data.joiningDate}T00:00:00.000Z`
            ),
            basicSalary: data.basicSalary,
            phone: data.phone || "",
            address: data.address || "",
            employmentStatus: "active",
          }],
          { session }
        );

        employee = createdEmployee;
      });

      res.status(201).json({
        success: true,
        message: "Employee registered successfully",
        employee: {
          id: employee._id,
          employeeCode: employee.employeeCode,
          name: data.name,
          email,
          department: department.name,
          designation: employee.designation,
          joiningDate: employee.joiningDate,
          basicSalary: data.basicSalary,
          mustChangePassword: true,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Employee email or code already exists",
        });
      }

      next(error);
    }
  }
);

// -------------------------------------
// HR AND ADMIN VIEW EMPLOYEES
// -------------------------------------

router.get(
  "/",
  allowRoles("admin", "hr"),
  async (req, res, next) => {
    try {
      const employees = await Employee.find()
        .select("+basicSalary")
        .populate("user", "name email isActive")
        .populate("department", "name")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        employees,
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------------------
// EMPLOYEE VIEWS OWN PROFILE
// -------------------------------------

router.get(
  "/me",
  allowRoles("employee"),
  async (req, res, next) => {
    try {
      const employee = await Employee.findOne({
        user: req.user.id,
      })
        .populate("user", "name email")
        .populate("department", "name");

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
        });
      }

      res.json({
        success: true,
        employee,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
