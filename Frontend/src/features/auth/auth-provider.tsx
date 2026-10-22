"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { getCurrentUser, loginUser, logoutUser, type User } from "./auth.api";
type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (values: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getCurrentUser().then((result) => { if (active) setUser(result.user); }).catch((cause: unknown) => {
      if (active && !(cause instanceof ApiError && cause.status === 401)) setError(cause instanceof Error ? cause.message : "Unable to check your session");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function signIn(values: { email: string; password: string }) {
    const result = await loginUser(values);
    setUser(result.user);
    setError(null);
  }
  async function signOut() {
    await logoutUser();
    setUser(null);
    setError(null);
  }
  return <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
