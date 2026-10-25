
const router = require("express").Router();

const User = require("../models/User");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");

const authMiddleware = require("../middleware/auth.middleware");
const requirePasswordChanged = require(
  "../middleware/require-password-change.middleware"
);

router.use(authMiddleware, requirePasswordChanged);

const TIME_ZONE = "Asia/Karachi";

function todayInPakistan() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(value) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleTimeString("en-PK", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matches(question, patterns) {
  return patterns.some((pattern) => pattern.test(question));
}

function reply(res, answer) {
  return res.json({
    success: true,
    answer,
  });
}

router.post("/chat", async (req, res, next) => {
  try {
    const { message } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a question under 500 characters",
      });
    }

    const question = message
      .trim()
      .toLowerCase()
      .replace(/[?!.,]/g, "");

    const role = req.user.role;
    const today = todayInPakistan();

    const isManager = role === "admin" || role === "hr";
    const isEmployee = role === "employee";

    if (!isManager && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // GREETING
    if (
      matches(question, [
        /^(hi|hello|hey|salam|assalamualaikum)$/,
      ])
    ) {
      return reply(
        res,
        `Hello! I'm HCM Lite's HR Smart Assistant. I can answer questions about ${isEmployee
          ? "your attendance and leave requests."
          : "employees, attendance, and leave requests."}`
      );
    }

    // EMPLOYEE-ONLY QUERIES
    if (isEmployee) {
      const employee = await Employee.findOne({
        user: req.user.id,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
        });
      }

      const employeeId = employee._id;

      // MY LEAVE QUESTIONS
      if (
        matches(question, [
          /leave/,
          /vacation/,
          /time off/,
          /holiday/,
        ])
      ) {
        const leaves = await LeaveRequest.find({
          employee: employeeId,
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        const pending = leaves.filter(
          (item) => item.status === "pending"
        ).length;

        const approved = leaves.filter(
          (item) => item.status === "approved"
        ).length;

        const rejected = leaves.filter(
          (item) => item.status === "rejected"
        ).length;

        if (
          matches(question, [
            /latest/,
            /last/,
            /recent/,
            /status/,
          ])
        ) {
          if (!leaves.length) {
            return reply(
              res,
              "You haven't submitted any leave requests yet."
            );
          }

          const latest = leaves[0];

          return reply(
            res,
            `Your latest leave request is ${latest.status.toUpperCase()}. Type: ${latest.leaveType}. Dates: ${latest.startDate} to ${latest.endDate}. Duration: ${latest.totalDays} calendar day(s).`
          );
        }

        return reply(
          res,
          `Your leave requests (up to the latest 100): ${leaves.length} total, ${pending} pending, ${approved} approved, and ${rejected} rejected.`
        );
      }

      // MY ATTENDANCE QUESTIONS
      if (
        matches(question, [
          /attendance/,
          /check.?in/,
          /check.?out/,
          /working hours/,
          /work hours/,
          /present/,
          /late/,
        ])
      ) {
        if (
          matches(question, [
            /history/,
            /record/,
            /how many/,
            /summary/,
          ]) &&
          !question.includes("today")
        ) {
          const records = await Attendance.find({
            employee: employeeId,
          })
            .sort({ date: -1 })
            .limit(60)
            .lean();

          const late = records.filter(
            (record) => record.status === "late"
          ).length;

          const halfDay = records.filter(
            (record) => record.status === "half-day"
          ).length;

          return reply(
            res,
            `You have ${records.length} attendance record(s) in your most recent 60 records: ${late} marked late and ${halfDay} marked half-day.`
          );
        }

        const attendance = await Attendance.findOne({
          employee: employeeId,
          date: today,
        }).lean();

        if (!attendance) {
          return reply(
            res,
            `You haven't checked in today (${today}).`
          );
        }

        return reply(
          res,
          `Your attendance for ${today}: ${attendance.status}. Check-in: ${formatTime(attendance.checkIn)}. Check-out: ${formatTime(attendance.checkOut)}. Worked time: ${attendance.workedMinutes} minute(s).`
        );
      }

      return reply(
        res,
        "I can help with your attendance today, attendance history, leave status, and leave request counts. Try asking 'What's my leave status?'"
      );
    }

    // ADMIN AND HR QUERIES

    // EMPLOYEE TOTAL
    if (
      matches(question, [
        /how many employees/,
        /total employees/,
        /employee count/,
        /number of employees/,
        /registered employees/,
      ])
    ) {
      const total = await Employee.countDocuments();

      return reply(
        res,
        `There are ${total} registered employee(s) in HCM Lite.`
      );
    }

    // LEAVE QUERIES
    if (
      matches(question, [
        /leave/,
        /vacation/,
        /time off/,
      ])
    ) {
      const [pending, approved, rejected] =
        await Promise.all([
          LeaveRequest.countDocuments({
            status: "pending",
          }),
          LeaveRequest.countDocuments({
            status: "approved",
          }),
          LeaveRequest.countDocuments({
            status: "rejected",
          }),
        ]);

      if (
        question.includes("who") &&
        question.includes("pending")
      ) {
        const leaves = await LeaveRequest.find({
          status: "pending",
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate({
            path: "employee",
            select: "employeeCode user",
            populate: {
              path: "user",
              select: "name",
            },
          });

        if (!leaves.length) {
          return reply(
            res,
            "There are no pending leave requests."
          );
        }

        const names = leaves.map((leave) => {
          const name =
            leave.employee?.user?.name || "Unknown";

          return `${name} (${leave.startDate} to ${leave.endDate})`;
        });

        return reply(
          res,
          `Pending leave requests (up to 10): ${names.join("; ")}.`
        );
      }

      return reply(
        res,
        `Leave summary: ${pending} pending, ${approved} approved, and ${rejected} rejected.`
      );
    }

    // ATTENDANCE AND LATE EMPLOYEES
    if (
      matches(question, [
        /attendance/,
        /check.?in/,
        /present/,
        /late/,
        /absent/,
        /working today/,
      ])
    ) {
      const records = await Attendance.find({
        date: today,
      })
        .populate({
          path: "employee",
          select: "employeeCode user",
          populate: {
            path: "user",
            select: "name",
          },
        })
        .lean();

      const lateRecords = records.filter(
        (record) => record.status === "late"
      );

      if (question.includes("who")) {
        const selected =
          question.includes("late")
            ? lateRecords
            : records;

        if (!selected.length) {
          return reply(
            res,
            question.includes("late")
              ? "No employees are currently marked late today."
              : "No attendance check-ins recorded today."
          );
        }

        const names = selected
          .slice(0, 20)
          .map(
            (record) =>
              record.employee?.user?.name ||
              "Unknown"
          );

        return reply(
          res,
          `${question.includes("late") ? "Employees marked late" : "Employees checked in"} today: ${names.join(", ")}${selected.length > 20 ? ` and ${selected.length - 20} more` : ""}.`
        );
      }

      const checkedOut = records.filter(
        (record) => Boolean(record.checkOut)
      ).length;

      return reply(
        res,
        `Attendance for ${today}: ${records.length} check-in(s), ${checkedOut} check-out(s), and ${lateRecords.length} currently marked late.`
      );
    }

    return reply(
      res,
      "I can answer questions about total employees, today's check-ins, employees marked late, and pending leave requests. Try 'How many employees do we have?'"
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
