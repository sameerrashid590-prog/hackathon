"use client";
import { App, ConfigProvider, theme } from "antd";
import { useSyncExternalStore, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-provider";
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function snapshot() { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
function serverSnapshot() { return false; }
export default function Providers({ children }: { children: ReactNode }) {
  const dark = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: "#1677ff", borderRadius: 8 } }}>
    <App><AuthProvider>{children}</AuthProvider></App>
  </ConfigProvider>;
}
