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