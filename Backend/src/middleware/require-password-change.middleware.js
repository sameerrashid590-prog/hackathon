
function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword === true) {
    return res.status(403).json({
      success: false,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "Please change your temporary password first",
    });
  }

  next();
}

module.exports = requirePasswordChanged;
