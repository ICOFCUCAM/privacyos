import { Share2, Linkedin, Twitter, Facebook, Instagram, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getModuleData } from "@/lib/data/modules";
import { socialStrategies, type PlatformStrategy, type SocialPlatform } from "@/lib/reputation/os/social";
import { cn } from "@/lib/ui";
import { ReputationTabs } from "../tabs";

export const metadata = { title: "Reputation — Social" };

const ICON: Record<SocialPlatform, LucideIcon> = {
  LinkedIn: Linkedin, X: Twitter, Facebook: Facebook, Instagram: Instagram, YouTube: Youtube,
};

const PRIORITY: Record<PlatformStrategy["priority"], string> = {
  high: "text-risk-high bg-risk-high/10 ring-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 ring-risk-medium/30",
  low: "text-slate-400 bg-bg-elevated ring-border",
};

export default async function SocialPage() {
  const { mentions } = await getModuleData();
  const strategies = socialStrategies(mentions);

  return (
    <div className="space-y-5">
      <PageHeader icon={Share2} title="Social Strategy" subtitle="Per-platform brand strategy across LinkedIn, X, Facebook, Instagram and YouTube." />
      <ReputationTabs />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((s) => {
          const Icon = ICON[s.platform];
          return (
            <Card key={s.platform} className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-brand-fg" /> {s.platform}
                </span>
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1", PRIORITY[s.priority])}>{s.priority}</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">{s.objective}</p>
              <p className="mt-1.5 text-[11px] text-slate-500">Cadence: <span className="text-slate-300">{s.cadence}</span></p>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.contentMix.map((c, i) => (
                  <span key={i} className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-border">{c}</span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
