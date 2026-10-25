
const router = require("express").Router();
const mongoose = require("mongoose");

const LeaveRequest = require("../models/LeaveRequest");
const Employee = require("../models/Employee");

const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const requirePasswordChanged = require(
  "../middleware/require-password-change.middleware"
);

router.use(authMiddleware, requirePasswordChanged);

const VALID_TYPES = [
  "annual",
  "sick",
  "casual",
  "unpaid",
];

function parseDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

async function findEmployee(req) {
  return Employee.findOne({ user: req.user.id });
}

const employeePopulate = {
  path: "employee",
  select: "employeeCode user department designation",
  populate: [
    {
      path: "user",
      select: "name email",
    },
    {
      path: "department",
      select: "name",
    },
  ],
};

// EMPLOYEE: APPLY FOR LEAVE
router.post(
  "/",
  allowRoles("employee"),
  async (req, res, next) => {
    try {
      const {
        leaveType,
        startDate,
        endDate,
        reason,
      } = req.body || {};

      if (!VALID_TYPES.includes(leaveType)) {
        return res.status(400).json({
          success: false,
          message: "Select a valid leave type",
        });
      }

      const start = parseDate(startDate);
      const end = parseDate(endDate);

      if (!start || !end || end < start) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid date range",
        });
      }

      const totalDays =
        Math.round(
          (end.getTime() - start.getTime()) / 86400000
        ) + 1;

      if (totalDays > 60) {
        return res.status(400).json({
          success: false,
          message: "Leave cannot exceed 60 calendar days",
        });
      }

      if (
        typeof reason !== "string" ||
        reason.trim().length < 5 ||
        reason.trim().length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Reason must contain 5 to 1000 characters",
        });
      }

      const employee = await findEmployee(req);

      if (
        !employee ||
        employee.employmentStatus !== "active"
      ) {
        return res.status(403).json({
          success: false,
          message: "Active employee profile required",
        });
      }

      // Prevent overlapping pending or approved leave.
      const overlapping = await LeaveRequest.findOne({
        employee: employee._id,
        status: { $in: ["pending", "approved"] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      });

      if (overlapping) {
        return res.status(409).json({
          success: false,
          message:
            "You already have a pending or approved leave in this date range",
        });
      }

      const leave = await LeaveRequest.create({
        employee: employee._id,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: reason.trim(),
      });

      return res.status(201).json({
        success: true,
        message: "Leave request submitted successfully",
        leave,
      });
    } catch (error) {
      next(error);
    }
  }
);

// EMPLOYEE: VIEW OWN REQUESTS
router.get(
  "/me",
  allowRoles("employee"),
  async (req, res, next) => {
    try {
      const employee = await findEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
        });
      }

      const leaves = await LeaveRequest.find({
        employee: employee._id,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("reviewedBy", "name");

      res.json({
        success: true,
        leaves,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ADMIN / HR: VIEW ALL REQUESTS
router.get(
  "/",
  allowRoles("admin", "hr"),
  async (req, res, next) => {
    try {
      const leaves = await LeaveRequest.find()
        .sort({ createdAt: -1 })
        .limit(200)
        .populate(employeePopulate)
        .populate("reviewedBy", "name");

      res.json({
        success: true,
        leaves,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ADMIN / HR: APPROVE OR REJECT
router.patch(
  "/:id/decision",
  allowRoles("admin", "hr"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, reviewNote = "" } = req.body || {};

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid leave request ID",
        });
      }

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Decision must be approved or rejected",
        });
      }

      if (
        typeof reviewNote !== "string" ||
        reviewNote.length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Review note cannot exceed 1000 characters",
        });
      }

      // Only pending requests can be decided.
      // Atomic update prevents a second review.
      const leave = await LeaveRequest.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
        },
        {
          $set: {
            status,
            reviewNote: reviewNote.trim(),
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(employeePopulate)
        .populate("reviewedBy", "name");

      if (!leave) {
        return res.status(409).json({
          success: false,
          message:
            "Leave request not found or already reviewed",
        });
      }

      res.json({
        success: true,
        message:
          status === "approved"
            ? "Leave approved successfully"
            : "Leave rejected successfully",
        leave,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
