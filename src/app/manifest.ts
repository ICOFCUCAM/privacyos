import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrivacyOS — Digital Risk Operating System",
    short_name: "PrivacyOS",
    description:
      "AI-powered Privacy, Reputation, Identity Protection and Digital Risk Management.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0b0f",
    theme_color: "#0a0b0f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
