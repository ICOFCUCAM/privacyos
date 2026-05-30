import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrivacyOS — The antivirus for your personal information",
  description:
    "AI-powered Privacy, Reputation, Identity Protection and Digital Risk Management. Discover, monitor, and defend your digital presence 24/7.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
