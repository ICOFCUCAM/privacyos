/**
 * ReputationOS — media layer.
 *
 * Earned-media engine: press opportunities matched to the subject, a relevance-
 * ranked journalist database, generated press-release copy and a media-outreach
 * workflow. Pure and unit-tested; deterministic from the subject + mentions.
 */

import type { Subject } from "@/lib/types";
import type { Mention } from "@/lib/suite-types";

export interface PressOpportunity {
  outlet: string;
  angle: string;
  /** 0–100 fit between the outlet and the subject's story. */
  fit: number;
  deadlineDays: number;
}

export interface Journalist {
  name: string;
  outlet: string;
  beat: string;
  relevance: number;
}

export interface PressRelease {
  headline: string;
  subhead: string;
  dateline: string;
  body: string[];
  boilerplate: string;
}

export interface OutreachStep {
  step: number;
  action: string;
  channel: string;
}

export interface MediaProgram {
  opportunities: PressOpportunity[];
  journalists: Journalist[];
  release: PressRelease;
  outreach: OutreachStep[];
}

export function pressOpportunities(subject: Subject): PressOpportunity[] {
  const sector = subject.organization ? `${subject.organization}'s sector` : "the industry";
  return [
    { outlet: "TechCrunch", angle: `Exclusive on ${subject.displayName}'s next move in ${sector}`, fit: 88, deadlineDays: 7 },
    { outlet: "Forbes", angle: `Leadership profile / contributor column`, fit: 82, deadlineDays: 14 },
    { outlet: "Bloomberg", angle: `Data-driven market commentary`, fit: 74, deadlineDays: 10 },
    { outlet: "Industry podcast", angle: `Founder journey interview`, fit: 70, deadlineDays: 21 },
  ].sort((a, b) => b.fit - a.fit);
}

export function journalistDatabase(subject: Subject): Journalist[] {
  const beat = subject.organization ? "Venture / business" : "Profiles";
  return [
    { name: "A. Rivera", outlet: "TechCrunch", beat, relevance: 92 },
    { name: "J. Park", outlet: "Forbes", beat: "Leadership", relevance: 85 },
    { name: "M. Osei", outlet: "Bloomberg", beat: "Markets", relevance: 78 },
    { name: "S. Klein", outlet: "The Information", beat: "Deep tech", relevance: 71 },
  ].sort((a, b) => b.relevance - a.relevance);
}

/** Generate press-release copy from the subject and its strongest positive signal. */
export function generatePressRelease(subject: Subject, mentions: Mention[]): PressRelease {
  const name = subject.displayName;
  const org = subject.organization ?? `${name}'s venture`;
  const best = [...mentions].filter((m) => m.sentiment === "positive").sort((a, b) => b.sentimentScore - a.sentimentScore)[0];
  const proof = best ? `Recent coverage in ${best.sourceName} noted: "${best.title}."` : `${name} continues to build momentum across the industry.`;
  return {
    headline: `${org} Accelerates Growth as ${name} Sets New Strategic Direction`,
    subhead: `${name} outlines the vision and milestones shaping the next phase.`,
    dateline: `${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} —`,
    body: [
      `${org} today announced a new strategic direction under the leadership of ${name}, reinforcing its position in the market.`,
      proof,
      `"We're focused on delivering durable value and earning trust," said ${name}. "This is the foundation for what comes next."`,
      `The announcement follows sustained growth and a deliberate investment in transparency and stakeholder communication.`,
    ],
    boilerplate: `About ${org}: ${org} is led by ${name}${subject.organization ? "" : ""}. For media inquiries, contact press@${(subject.organization ?? "company").toLowerCase().replace(/[^a-z0-9]/g, "")}.com.`,
  };
}

export interface OutreachTarget {
  name: string;
  outlet: string;
  email?: string;
}

/** When a real top target is known, the pitch step names them (and their email). */
export function outreachWorkflow(target?: OutreachTarget): OutreachStep[] {
  const pitch = target
    ? `Personalize the pitch to ${target.name} at ${target.outlet}${target.email ? ` — ${target.email}` : ""}`
    : "Personalize the pitch to each outlet's angle";
  return [
    { step: 1, action: "Shortlist journalists by beat & relevance", channel: "Journalist DB" },
    { step: 2, action: pitch, channel: "Email" },
    { step: 3, action: "Send embargoed press release to tier-1 first", channel: "Email" },
    { step: 4, action: "Follow up after 48h; offer an exclusive or data", channel: "Email / DM" },
    { step: 5, action: "Amplify published coverage across owned channels", channel: "Social" },
  ];
}

export function mediaProgram(subject: Subject, mentions: Mention[]): MediaProgram {
  return {
    opportunities: pressOpportunities(subject),
    journalists: journalistDatabase(subject),
    release: generatePressRelease(subject, mentions),
    outreach: outreachWorkflow(),
  };
}
