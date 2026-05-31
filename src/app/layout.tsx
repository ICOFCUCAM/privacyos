import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privacyos.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PrivacyOS — The Digital Risk Operating System",
    template: "%s · PrivacyOS",
  },
  description:
    "AI-powered Privacy, Reputation, Identity Protection and Digital Risk Management. Autonomous agents discover, remove and defend your digital footprint 24/7.",
  keywords: [
    "privacy", "digital risk", "data broker removal", "dark web monitoring",
    "reputation management", "executive protection", "identity protection",
    "deepfake detection", "GDPR", "CCPA",
  ],
  authors: [{ name: "PrivacyOS" }],
  openGraph: {
    type: "website",
    siteName: "PrivacyOS",
    title: "PrivacyOS — The Digital Risk Operating System",
    description:
      "Autonomous AI agents discover, remove and defend your digital footprint across search, brokers, social, dark web and AI-generated threats.",
    url: SITE_URL,
    images: [{ url: "/hero-dashboard.png", width: 1412, height: 1086, alt: "PrivacyOS dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrivacyOS — The Digital Risk Operating System",
    description: "Autonomous digital risk protection for individuals, executives, families and enterprises.",
    images: ["/hero-dashboard.png"],
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
