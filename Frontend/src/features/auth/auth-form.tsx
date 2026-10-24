
"use client";

import Link from "next/link";
import { useState } from "react";
import { App, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { signupUser } from "./auth.api";
import { useAuth } from "./auth-provider";

type Values = {
  name?: string;
  email: string;
  password: string;
};

export default function AuthForm({
  mode,
}: {
  mode: "signup" | "login";
}) {
  const signup = mode === "signup";

  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<Values>();

  const { message } = App.useApp();
  const { signIn } = useAuth();
  const router = useRouter();

  async function submit(values: Values) {
    setLoading(true);

    try {
      if (signup) {
        await signupUser({
          ...values,
          name: values.name?.trim() || "",
        });

        message.success(
          "Account created! Check your email for the OTP."
        );

        router.push(
          `/verify-email?email=${encodeURIComponent(
            values.email.trim()
          )}`
        );
      } else {
        await signIn(values);
        router.replace("/account");
      }
    } catch (error) {
      if (error instanceof ApiError && error.errors.length) {
        const fields = error.errors.filter((item) =>
          ["name", "email", "password"].includes(item.field)
        );

        form.setFields(
          fields.map((item) => ({
            name: item.field as keyof Values,
            errors: [item.message],
          }))
        );
      }

      message.error(
        error instanceof Error
          ? error.message
          : "Request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link href="/">← Home</Link>

      <h1>{signup ? "Create account" : "Welcome back"}</h1>

      <p>
        {signup
          ? "Create your account to get started."
          : "Sign in to access your account."}
      </p>

      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={loading}
        requiredMark={false}
      >
        {/* Name field - Signup only */}
        {signup && (
          <Form.Item
            label="Name"
            name="name"
            normalize={(value: string) => value.trimStart()}
            rules={[
              {
                required: true,
                message: "Enter your name",
              },
              {
                min: 2,
                max: 80,
                transform: (value: string) => value.trim(),
                message: "Use 2–80 characters",
              },
            ]}
          >
            <Input
              autoComplete="name"
              maxLength={80}
            />
          </Form.Item>
        )}

        {/* Email field */}
        <Form.Item
          label="Email"
          name="email"
          normalize={(value: string) => value.trim()}
          rules={[
            {
              required: true,
              message: "Enter your email",
            },
            {
              type: "email",
              message: "Enter a valid email",
            },
            {
              max: 254,
              message: "Use at most 254 characters",
            },
          ]}
        >
          <Input
            autoComplete="email"
            type="email"
            maxLength={254}
          />
        </Form.Item>

        {/* Password field */}
        <Form.Item
          label="Password"
          name="password"
          rules={[
            {
              required: true,
              message: "Enter your password",
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
            autoComplete={
              signup ? "new-password" : "current-password"
            }
          />
        </Form.Item>

        {/* Forgot password - Login only */}
        {!signup && (
          <div
            style={{
              textAlign: "right",
              marginBottom: 16,
            }}
          >
            <Link href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}

        {/* Submit button */}
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={loading}
        >
          {signup ? "Sign up" : "Sign in"}
        </Button>
      </Form>

      {/* Switch between login and signup */}
      <p>
        {signup
          ? "Already have an account? "
          : "Need an account? "}

        <Link href={signup ? "/login" : "/signup"}>
          {signup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </main>
  );
}
