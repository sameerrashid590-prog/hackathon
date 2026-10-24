
const User = require("../models/User");

async function requireVerifiedEmail(req, res, next) {
  try {
    const userId =
      req.user?._id ||
      req.user?.id ||
      req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (user.isEmailVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireVerifiedEmail;
