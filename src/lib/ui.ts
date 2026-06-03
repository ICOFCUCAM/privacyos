import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const riskBg: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low ring-1 ring-risk-low/30",
  medium: "bg-risk-medium/15 text-risk-medium ring-1 ring-risk-medium/30",
  high: "bg-risk-high/15 text-risk-high ring-1 ring-risk-high/30",
  critical: "bg-risk-critical/15 text-risk-critical ring-1 ring-risk-critical/30",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
