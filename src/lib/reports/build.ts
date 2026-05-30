/**
 * Assembles a ReportContext for a given report type from the live/demo data
 * source plus the module datasets and scoring services.
 */

import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { computeScoreSet } from "@/lib/scoring/scores";
import { titleCase } from "@/lib/ui";
import type { ReportContext } from "./engine";
import type { ReportType } from "@/lib/suite-types";

export async function buildReportContext(type: ReportType): Promise<ReportContext> {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const mod = await getModuleData();

  const scores = computeScoreSet({
    risk: data.riskScore,
    mentions: mod.mentions,
    incidents: mod.incidents,
    credentialLeaks: mod.credentialLeaks,
    domainRisks: mod.domainRisks,
    employeeExposures: mod.employeeExposures,
  });

  const activeThreats = data.threats.filter((t) => !t.acknowledged);
  const openCases = data.cases.filter((c) => c.status !== "resolved");
  const openIncidents = mod.incidents.filter((i) => i.status !== "resolved" && i.status !== "dismissed");

  const base = {
    type,
    subjectName: data.subject.displayName,
    organization: data.subject.organization,
    generatedAt: new Date().toISOString(),
    scores,
  };

  const topExposures = {
    heading: "Highest-risk exposures",
    rows: [...data.exposures]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 6)
      .map((e) => ({ label: e.sourceName, value: `${titleCase(e.category)} · ${titleCase(e.riskLevel)} · ${titleCase(e.status)}` })),
  };

  const threatRows = {
    heading: "Active threats",
    rows: activeThreats.map((t) => ({ label: t.title, value: `${titleCase(t.kind)} · ${titleCase(t.riskLevel)}` })),
  };

  const incidentRows = {
    heading: "Open incidents",
    rows: openIncidents.map((i) => ({ label: i.title, value: `${titleCase(i.kind)} · ${titleCase(i.status)} · ${titleCase(i.riskLevel)}` })),
  };

  switch (type) {
    case "privacy":
      return {
        ...base,
        stats: [
          { label: "Exposures tracked", value: data.exposures.length },
          { label: "Removed", value: data.exposures.filter((e) => e.status === "removed").length },
          { label: "Active threats", value: activeThreats.length },
          { label: "Open cases", value: openCases.length },
        ],
        sections: [topExposures, threatRows],
      };
    case "executive":
      return {
        ...base,
        stats: [
          { label: "Open incidents", value: openIncidents.length },
          { label: "Deepfake", value: mod.incidents.filter((i) => i.kind === "deepfake").length },
          { label: "Doxxing", value: mod.incidents.filter((i) => i.kind === "doxxing").length },
          { label: "Family at risk", value: mod.familyMembers.filter((f) => f.riskLevel !== "low").length },
        ],
        sections: [incidentRows, { heading: "Family exposure", rows: mod.familyMembers.map((f) => ({ label: `${f.displayName} (${f.relation})`, value: `${f.exposuresCount} exposures · ${titleCase(f.riskLevel)}` })) }],
      };
    case "business":
      return {
        ...base,
        stats: [
          { label: "Credential leaks", value: mod.credentialLeaks.length },
          { label: "Employee exposures", value: mod.employeeExposures.length },
          { label: "Domain risks", value: mod.domainRisks.filter((d) => !d.resolved).length },
          { label: "3rd-party risks", value: mod.thirdPartyRisks.length },
        ],
        sections: [
          { heading: "Credential leaks", rows: mod.credentialLeaks.map((l) => ({ label: l.account, value: `${l.breachName} · ${titleCase(l.riskLevel)}` })) },
          { heading: "Domain risks", rows: mod.domainRisks.map((d) => ({ label: d.domain, value: `${titleCase(d.kind)} · ${titleCase(d.riskLevel)}` })) },
        ],
      };
    case "threat":
      return {
        ...base,
        stats: [
          { label: "Active threats", value: activeThreats.length },
          { label: "Open incidents", value: openIncidents.length },
          { label: "Critical", value: [...activeThreats, ...openIncidents].filter((x) => x.riskLevel === "critical").length },
          { label: "Escalations", value: mod.legalRequests.filter((l) => l.status === "escalated").length },
        ],
        sections: [threatRows, incidentRows],
      };
    case "compliance":
      return {
        ...base,
        stats: [
          { label: "Legal requests", value: mod.legalRequests.length },
          { label: "Completed", value: mod.legalRequests.filter((l) => l.status === "completed").length },
          { label: "Submitted", value: mod.legalRequests.filter((l) => l.status === "submitted").length },
          { label: "Escalated", value: mod.legalRequests.filter((l) => l.status === "escalated").length },
        ],
        sections: [
          { heading: "Legal & privacy requests", rows: mod.legalRequests.map((l) => ({ label: `${titleCase(l.type)} → ${l.recipient}`, value: titleCase(l.status) })) },
        ],
      };
    case "risk":
      return {
        ...base,
        stats: [
          { label: "Overall risk", value: scores.overall },
          { label: "Privacy", value: scores.privacy },
          { label: "Reputation", value: scores.reputation },
          { label: "Business", value: scores.business },
        ],
        sections: [topExposures, threatRows, incidentRows],
      };
    case "board":
    default:
      return {
        ...base,
        stats: [
          { label: "Overall risk", value: scores.overall },
          { label: "Active threats", value: activeThreats.length },
          { label: "Open incidents", value: openIncidents.length },
          { label: "Open cases", value: openCases.length },
        ],
        sections: [
          { heading: "Executive summary", rows: [
            { label: "Overall posture", value: `${scores.overall}/100 risk` },
            { label: "Top concern", value: activeThreats[0]?.title ?? "None active" },
            { label: "Remediation in flight", value: `${openCases.length} cases, ${mod.legalRequests.filter((l) => l.status !== "completed").length} legal requests` },
          ] },
          topExposures,
        ],
      };
  }
}
