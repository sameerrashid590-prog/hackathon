
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Link to employee's login account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Unique employee identification
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Department created by Admin
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    // Monthly basic salary in PKR
    basicSalary: {
      type: Number,
      required: true,
      min: 1,
      select: false,
    },

    // Employee contact information
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    employmentStatus: {
      type: String,
      enum: ["active", "probation", "resigned"],
      default: "active",
    },
  },
  { timestamps: true }
);

employeeSchema.index({ department: 1 });
employeeSchema.index({ employmentStatus: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
