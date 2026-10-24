
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { App, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Values = {
  code: string;
};

export default function VerifyEmailPage() {
  const router = useRouter();
 const [email, setEmail] = useState("");

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setEmail(params.get("email") || "");
}, []);

  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify(values: Values) {
    if (!email) {
      message.error("Email address is missing");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: values.code,
        }),
      });

      message.success("Email verified successfully!");
      router.replace("/login");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Verification failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!email) return;

    setResending(true);

    try {
      await apiFetch("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      message.success("If eligible, a new code has been requested.");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to resend code"
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link href="/">← Home</Link>

      <h1>Verify your email</h1>

      <p>
        Enter the 6-digit verification code sent to
        <br />
        <strong>{email || "your email address"}</strong>
      </p>

      <Form
        layout="vertical"
        onFinish={verify}
        requiredMark={false}
      >
        <Form.Item
          label="Verification code"
          name="code"
          rules={[
            { required: true, message: "Enter your OTP" },
            {
              pattern: /^\d{6}$/,
              message: "Enter a valid 6-digit code",
            },
          ]}
        >
          <Input
            size="large"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
          />
        </Form.Item>

        <Button
          block
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!email}
        >
          Verify email
        </Button>
      </Form>

      <p>
        Didn't receive the code?{" "}
        <Button
          type="link"
          onClick={resendCode}
          loading={resending}
          disabled={!email}
        >
          Resend code
        </Button>
      </p>

      <p>
        <Link href="/login">Back to login</Link>
      </p>
    </main>
  );
}
