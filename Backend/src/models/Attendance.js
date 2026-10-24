
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    workedMinutes: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["present", "late", "half-day"],
      default: "present",
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { employee: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
