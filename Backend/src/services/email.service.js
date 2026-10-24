

async function sendEmail(email, subject, message) {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Brevo email configuration is missing");
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Hackathon App",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email }],
        subject,
        textContent: message,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    console.error(
      "Brevo email request failed:",
      response.status,
      errorBody
    );

    throw new Error("Failed to send email");
  }
}

// Existing signup verification email
async function sendVerificationEmail(email, code) {
  return sendEmail(
    email,
    "Verify your email",
    `Your verification code is ${code}. It expires in 10 minutes.`
  );
}

// New forgot-password email
async function sendPasswordResetEmail(email, code) {
  return sendEmail(
    email,
    "Reset your password",
    `Your password reset code is ${code}. It expires in 10 minutes. ` +
      "If you did not request this, you can ignore this email."
  );
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
