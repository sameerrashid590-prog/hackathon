
const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    officeStart: {
      type: String,
      default: "09:00",
    },

    graceMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },

    halfDayHours: {
      type: Number,
      default: 5,
      min: 1,
    },

    weekends: {
      type: [Number],
      default: [0, 6],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
