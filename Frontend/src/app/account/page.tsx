"use client";
import Link from "next/link";
import { App, Button, Spin } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
export default function AccountPage() {
  const { user, loading, error, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const { message } = App.useApp();
  const router = useRouter();
  async function logout() {
    setBusy(true);
    try { await signOut(); router.replace("/login"); }
    catch (cause) { message.error(cause instanceof Error ? cause.message : "Unable to sign out"); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell">
    <Link href="/">← Home</Link>
    <h1>Your account</h1>
    {loading ? <Spin aria-label="Checking your session" /> : user ? <>
      <p>Welcome, {user.name}.</p><p>{user.email}</p>
      <Button onClick={logout} loading={busy}>Sign out</Button>
    </> : <><p role={error ? "alert" : undefined}>{error || "Sign in to view your account."}</p><Link href="/login">Sign in</Link></>}
  </main>;
}
