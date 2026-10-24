
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in",
      });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    if (
      typeof payload.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const user = await User.findById(payload.sub);

    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Account unavailable or session expired",
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      mustChangePassword: user.mustChangePassword,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    next(error);
  }
}

module.exports = authMiddleware;
