import { apiFetch } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  success: boolean;
  user: User;
};

export function signupUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(data: {
  email: string;
  password: string;
}) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return apiFetch<AuthResponse>("/auth/me");
}

export function logoutUser() {
  return apiFetch<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}

export type MessageResponse = {
  success: boolean;
  message: string;
};

export type VerifyResetOtpResponse = MessageResponse & {
  resetToken: string;
};

// Step 1: Send password reset OTP
export function forgotPassword(data: {
  email: string;
}) {
  return apiFetch<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Step 2: Verify the reset OTP
export function verifyResetOtp(data: {
  email: string;
  code: string;
}) {
  return apiFetch<VerifyResetOtpResponse>(
    "/auth/verify-reset-otp",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

// Step 3: Set a new password
export function resetPassword(data: {
  resetToken: string;
  newPassword: string;
}) {
  return apiFetch<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
