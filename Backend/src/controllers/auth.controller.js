const authService = require("../services/auth.service");

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

async function signup(req, res, next) {
  try {
    const user = await authService.signup(req.validatedBody);

    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.validatedBody);

    res.cookie("token", result.token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, user: result.user });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie("token", cookieOptions);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = { signup, login, logout };