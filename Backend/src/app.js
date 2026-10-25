const attendanceRoutes = require("./routes/attendance.routes");
const leaveRoutes = require("./routes/leave.routes");
const employeeRoutes = require("./routes/employee.routes");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const departmentRoutes = require("./routes/department.routes");
const adminRoutes = require("./routes/admin.routes");

const errorHandler = require("./middleware/error-handler");

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

// Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
