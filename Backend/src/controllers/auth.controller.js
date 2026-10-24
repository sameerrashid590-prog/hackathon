
const authService = require("../services/auth.service");

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

// Signup
async function signup(req, res, next) {
  try {
    const user = await authService.signup(req.validatedBody);

    res.status(201).json({
      success: true,
      message: "Account created. Check your email for the verification code.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

// Verify signup email
async function verifyEmail(req, res, next) {
  try {
    const user = await authService.verifyEmail(
      req.validatedBody
    );

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

// Resend signup verification OTP
async function resendVerification(req, res, next) {
  try {
    await authService.resendVerification(
      req.validatedBody
    );

    res.json({
      success: true,
      message:
        "If an unverified account exists, a new code will be sent when eligible.",
    });
  } catch (error) {
    next(error);
  }
}

// Forgot password: send OTP
async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(
      req.validatedBody
    );

    res.json({
      success: true,
      message:
        "If an account exists with this email, a reset code will be sent.",
    });
  } catch (error) {
    next(error);
  }
}

// Verify password reset OTP
async function verifyResetOtp(req, res, next) {
  try {
    const result = await authService.verifyResetOtp(
      req.validatedBody
    );

    res.json({
      success: true,
      message: "Reset code verified successfully.",
      resetToken: result.resetToken,
    });
  } catch (error) {
    next(error);
  }
}

// Set a new password
async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(
      req.validatedBody
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// Login
async function login(req, res, next) {
  try {
    const result = await authService.login(
      req.validatedBody
    );

    res.cookie("token", result.token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

// Logout
function logout(req, res) {
  res.clearCookie("token", cookieOptions);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
}

module.exports = {
  signup,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  login,
  logout,
};
