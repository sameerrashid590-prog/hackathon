const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middleware/error-handler");
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", (req, res) => res.json({ success: true, message: "API is running" }));

app.use("/api/auth", authRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);
module.exports = app;
