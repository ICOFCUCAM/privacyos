/**
 * Legal automation engine.
 *
 * Generates jurisdiction-aware legal/privacy documents from templates. Produces
 * clean, ready-to-send text that can be exported (see /api/legal). An LLM can be
 * layered on top later for tone/jurisdiction refinement, but deterministic
 * templates guarantee the platform always produces a usable document.
 */

import type { LegalRequestType } from "@/lib/suite-types";

export interface LegalDocInput {
  type: LegalRequestType;
  subjectName: string;
  recipient: string;
  /** What is being contested / requested for removal. */
  matter?: string;
  jurisdiction?: "EU" | "US-CA" | "US" | "UK" | "other";
  contactEmail?: string;
}

export interface LegalDoc {
  type: LegalRequestType;
  title: string;
  body: string;
}

export const LEGAL_TYPE_LABELS: Record<LegalRequestType, string> = {
  gdpr_erasure: "GDPR Article 17 Erasure Request",
  ccpa_delete: "CCPA Right-to-Delete Request",
  broker_optout: "Data Broker Opt-Out Request",
  defamation_complaint: "Defamation Complaint & Takedown Demand",
  platform_abuse: "Platform Abuse Report",
  privacy_violation: "Privacy Violation Notice",
};

const DATE = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function signature(input: LegalDocInput): string {
  return `\n\nSincerely,\n${input.subjectName}${input.contactEmail ? `\n${input.contactEmail}` : ""}`;
}

const TEMPLATES: Record<LegalRequestType, (i: LegalDocInput) => string> = {
  gdpr_erasure: (i) =>
    `Date: ${DATE()}
To: ${i.recipient} — Data Protection Officer

Re: Request for Erasure of Personal Data (GDPR Article 17)

To whom it may concern,

I, ${i.subjectName}, am exercising my right to erasure under Article 17 of the General Data Protection Regulation (GDPR). I request that you erase all personal data you hold relating to me, including ${i.matter ?? "names, contact details, addresses, and any associated identifiers"}.

This request is made on the grounds that the personal data is no longer necessary for the purposes for which it was collected, and I withdraw any consent previously given. Please confirm completion within one month as required by Article 12(3), and identify any third parties with whom this data was shared.${signature(i)}`,

  ccpa_delete: (i) =>
    `Date: ${DATE()}
To: ${i.recipient} — Privacy Team

Re: Request to Delete Personal Information (CCPA/CPRA §1798.105)

To whom it may concern,

I, ${i.subjectName}, a California resident, request deletion of all personal information you have collected about me under the California Consumer Privacy Act. This includes ${i.matter ?? "identifiers, contact information, and inferences drawn about me"}.

Please confirm deletion and direct your service providers to do the same within 45 days. Do not sell or share my personal information.${signature(i)}`,

  broker_optout: (i) =>
    `Date: ${DATE()}
To: ${i.recipient} — Opt-Out / Privacy

Re: Opt-Out and Removal of My Listing

To whom it may concern,

I, ${i.subjectName}, request that you suppress and remove my personal profile and any associated records (${i.matter ?? "name, address, phone, relatives, and aliases"}) from your website and from any partner or syndicated listings.

Please process this opt-out, confirm removal, and ensure my information does not reappear. I reserve the right to escalate under applicable privacy law if the listing persists.${signature(i)}`,

  defamation_complaint: (i) =>
    `Date: ${DATE()}
To: ${i.recipient}

Re: Defamation Complaint and Demand for Removal

To whom it may concern,

The content identified below (${i.matter ?? "the referenced publication"}) contains false statements of fact concerning ${i.subjectName} that are defamatory and have caused reputational harm. I demand that you remove the content within 7 days.

Failure to act may result in further legal action, including a claim for damages. Please preserve all related records pending resolution.${signature(i)}`,

  platform_abuse: (i) =>
    `Date: ${DATE()}
To: ${i.recipient} — Trust & Safety

Re: Abuse / Policy Violation Report

To whom it may concern,

I am reporting content/accounts that violate your platform policies and target ${i.subjectName}: ${i.matter ?? "harassment, impersonation, and non-consensual sharing of personal information"}.

I request immediate review and removal under your community standards, and that you take action against the responsible account(s). I am available to provide an evidence package on request.${signature(i)}`,

  privacy_violation: (i) =>
    `Date: ${DATE()}
To: ${i.recipient}

Re: Notice of Privacy Violation

To whom it may concern,

It has come to my attention that you have published or processed personal information about ${i.subjectName} without a lawful basis: ${i.matter ?? "personal identifiers and private details"}. This constitutes a privacy violation.

I request that you cease processing, remove the information, and confirm the steps taken within 14 days.${signature(i)}`,
};

export function generateLegalDoc(input: LegalDocInput): LegalDoc {
  const body = TEMPLATES[input.type](input);
  return { type: input.type, title: LEGAL_TYPE_LABELS[input.type], body };
}
