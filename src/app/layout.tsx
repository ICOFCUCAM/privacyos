import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

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
  // Favicon/app icons are provided by the App Router conventions
  // (src/app/icon.png + src/app/apple-icon.png), generated from the transparent
  // PrivacyOS shield — Next.js injects the correct <link> tags automatically.
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
