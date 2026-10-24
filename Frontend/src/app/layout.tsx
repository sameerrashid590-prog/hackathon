import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HCM Lite | Human Capital Management",
  description:
    "Manage employees, departments, attendance, and HR operations with HCM Lite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}