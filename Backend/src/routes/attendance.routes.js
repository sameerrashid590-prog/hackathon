
const router = require("express").Router();

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Company = require("../models/Company");

const authMiddleware = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const requirePasswordChanged = require(
  "../middleware/require-password-change.middleware"
);

const TIME_ZONE = "Asia/Karachi";

router.use(authMiddleware, requirePasswordChanged);

// Get local date and time in Pakistan
function localTime(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function officeMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

async function findEmployee(req) {
  return Employee.findOne({ user: req.user.id });
}

// Employee check-in
router.post(
  "/check-in",
  allowRoles("employee"),
  async (req, res, next) => {
    try {
      const employee = await findEmployee(req);

      if (!employee || employee.employmentStatus !== "active") {
        return res.status(403).json({
          success: false,
          message: "Active employee profile required",
        });
      }

      const company = await Company.findOne();

      if (!company) {
        return res.status(409).json({
          success: false,
          message: "Company settings not configured",
        });
      }

      const now = new Date();
      const local = localTime(now);

      const existing = await Attendance.findOne({
        employee: employee._id,
        date: local.date,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today",
        });
      }

      const grace = company.graceMinutes || 0;
      const start = officeMinutes(company.officeStart);

      const isLate = local.minutes > start + grace;

      const attendance = await Attendance.create({
        employee: employee._id,
        date: local.date,
        checkIn: now,
        status: isLate ? "late" : "present",
      });

      res.status(201).json({
        success: true,
        message: isLate
          ? "Checked in successfully (late)"
          : "Checked in successfully",
        attendance,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today",
        });
      }
      next(error);
    }
  }
);

// Employee check-out
router.post(
  "/check-out",
  allowRoles("employee"),
  async (req, res, next) => {
    try {
      const employee = await findEmployee(req);

      if (!employee || employee.employmentStatus !== "active") {
        return res.status(403).json({
          success: false,
          message: "Active employee profile required",
        });
      }

      const now = new Date();
      const today = localTime(now).date;

      const company = await Company.findOne();

      if (!company) {
        return res.status(409).json({
          success: false,
          message: "Company settings not configured",
        });
      }

      const attendance = await Attendance.findOne({
        employee: employee._id,
        date: today,
      });

      if (!attendance) {
        return res.status(400).json({
          success: false,
          message: "Check in before checking out",
        });
      }

      if (attendance.checkOut) {
        return res.status(409).json({
          success: false,
          message: "Already checked out today",
        });
      }

      const workedMinutes = Math.max(
        0,
        Math.floor(
          (now.getTime() - attendance.checkIn.getTime()) / 60000
        )
      );

      const halfDayMinutes = company.halfDayHours * 60;

      const status =
        workedMinutes < halfDayMinutes
          ? "half-day"
          : attendance.status;

      // Atomic update: prevents duplicate checkout requests
      const updated = await Attendance.findOneAndUpdate(
        {
          _id: attendance._id,
          checkOut: null,
        },
        {
          $set: {
            checkOut: now,
            workedMinutes,
            status,
          },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(409).json({
          success: false,
          message: "Already checked out",
        });
      }

      res.json({
        success: true,
        message: "Checked out successfully",
        attendance: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Employee's own attendance
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

      const attendance = await Attendance.find({
        employee: employee._id,
      }).sort({ date: -1 }).limit(60);

      res.json({
        success: true,
        attendance,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin / HR attendance records
router.get(
  "/",
  allowRoles("admin", "hr"),
  async (req, res, next) => {
    try {
      const attendance = await Attendance.find()
        .sort({ date: -1, checkIn: -1 })
        .limit(200)
        .populate({
          path: "employee",
          select: "employeeCode user department",
          populate: [
            { path: "user", select: "name email" },
            { path: "department", select: "name" },
          ],
        });

      res.json({
        success: true,
        attendance,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
