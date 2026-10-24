
async function sendVerificationEmail(email, code) {
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
        subject: "Verify your email",
        textContent:
          `Your verification code is ${code}. ` +
          "It expires in 10 minutes.",
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Brevo error:", {
      status: response.status,
      message: result.message,
      code: result.code,
    });

    throw new Error("Unable to send verification email");
  }

  return result.messageId;
}

module.exports = { sendVerificationEmail };
