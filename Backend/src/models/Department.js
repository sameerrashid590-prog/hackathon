
const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Department",
  departmentSchema
);
