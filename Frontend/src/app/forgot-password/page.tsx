
"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Form, Input } from "antd";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "@/features/auth/auth.api";

type EmailValues = { email: string };
type OtpValues = { code: string };
type PasswordValues = {
  newPassword: string;
  confirmPassword: string;
};

export default function ForgotPasswordPage() {
  const { message } = App.useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  async function sendCode(values: EmailValues) {
    setLoading(true);

    try {
      const normalizedEmail = values.email.trim();

      await forgotPassword({ email: normalizedEmail });

      setEmail(normalizedEmail);
      setStep(2);

      message.success(
        "If an account exists, a reset code will be sent."
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(values: OtpValues) {
    setLoading(true);

    try {
      const result = await verifyResetOtp({
        email,
        code: values.code,
      });

      setResetToken(result.resetToken);
      setStep(3);

      message.success("Code verified successfully!");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Invalid code"
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(values: PasswordValues) {
    setLoading(true);

    try {
      await resetPassword({
        resetToken,
        newPassword: values.newPassword,
      });

      message.success("Password reset successfully!");

      // Clear the reset credential after successful use.
      setResetToken("");
      setStep(1);
      setEmail("");
      setCompleted(true);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Reset failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const [completed, setCompleted] = useState(false);

  return (
    <main className="auth-shell">
      <Link href="/login">← Back to login</Link>

      <h1>Forgot password</h1>

      {completed ? (
        <>
          <p>Your password has been updated successfully.</p>
          <Link href="/login">Sign in with your new password</Link>
        </>
      ) : (
        <>
          {step === 1 && (
            <>
              <p>Enter your email to receive a reset code.</p>

              <Form
                layout="vertical"
                onFinish={sendCode}
                disabled={loading}
                requiredMark={false}
              >
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: "Enter your email" },
                    { type: "email", message: "Enter a valid email" },
                  ]}
                >
                  <Input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                  />
                </Form.Item>

                <Button
                  block
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                >
                  Send reset code
                </Button>
              </Form>
            </>
          )}

          {step === 2 && (
            <>
              <p>
                Enter the 6-digit code sent to {email}.
                The code expires in 10 minutes.
              </p>

              <Form
                layout="vertical"
                onFinish={verifyCode}
                disabled={loading}
                requiredMark={false}
              >
                <Form.Item
                  label="Reset code"
                  name="code"
                  rules={[
                    { required: true, message: "Enter the code" },
                    {
                      pattern: /^\d{6}$/,
                      message: "Enter exactly 6 digits",
                    },
                  ]}
                >
                  <Input
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                  />
                </Form.Item>

                <Button
                  block
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                >
                  Verify code
                </Button>
              </Form>

              <Button
                type="link"
                disabled={loading}
                onClick={() => setStep(1)}
              >
                Change email / request another code
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <p>Choose a new password for your account.</p>

              <Form
                layout="vertical"
                onFinish={changePassword}
                disabled={loading}
                requiredMark={false}
              >
                <Form.Item
                  label="New password"
                  name="newPassword"
                  rules={[
                    {
                      required: true,
                      message: "Enter a new password",
                    },
                    {
                      min: 8,
                      message: "Use at least 8 characters",
                    },
                    {
                      validator: (_, value: string | undefined) =>
                        !value ||
                        new TextEncoder().encode(value).length <= 72
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error("Use at most 72 UTF-8 bytes")
                            ),
                    },
                  ]}
                >
                  <Input.Password
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item
                  label="Confirm password"
                  name="confirmPassword"
                  dependencies={["newPassword"]}
                  rules={[
                    {
                      required: true,
                      message: "Confirm your password",
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (
                          !value ||
                          getFieldValue("newPassword") === value
                        ) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error("Passwords do not match")
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Button
                  block
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                >
                  Reset password
                </Button>
              </Form>
            </>
          )}
        </>
      )}
    </main>
  );
}
