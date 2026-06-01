/**
 * Assembles a ReportContext for a given report type from the live/demo data
 * source plus the module datasets and scoring services.
 */

import { getDataSource } from "@/lib/data";
import { getModuleData } from "@/lib/data/modules";
import { computeScoreSet } from "@/lib/scoring/scores";
import { executiveRiskIndices, RISK_INDEX_META } from "@/lib/executive/os/risk-indices";
import { residenceReport } from "@/lib/executive/os/residence";
import { getResidenceSignals } from "@/lib/executive/os/residence-cache";
import { doxxingReport, LEAK_LABEL, type LeakKind } from "@/lib/executive/os/doxxing";
import { buildThreatActors } from "@/lib/executive/os/threat-actors";
import { impersonationReport, IMPERSONATION_LABEL, type ImpersonationCategory } from "@/lib/executive/os/impersonation";
import { darkWebReport, DARKWEB_LABEL, type DarkWebCategory } from "@/lib/executive/os/darkweb";
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
    case "executive": {
      const indices = executiveRiskIndices({ exposures: data.exposures, threats: data.threats, family: mod.familyMembers, travel: mod.travelAlerts });
      // Use live property data for the residence section when available (keyed
      // + authenticated); otherwise residenceReport infers from address exposures.
      const topAddress = data.exposures.filter((e) => e.category === "address").sort((a, b) => b.riskScore - a.riskScore)[0];
      const { signals } = await getResidenceSignals(topAddress?.snippet ?? "");
      const residence = residenceReport(data.exposures, signals);
      const doxxing = doxxingReport({ exposures: data.exposures, threats: data.threats, family: mod.familyMembers, employees: mod.employeeExposures });
      const actors = buildThreatActors(data.threats);
      const impersonation = impersonationReport({ threats: data.threats, incidents: mod.incidents, domainRisks: mod.domainRisks, exposures: data.exposures });
      const darkweb = darkWebReport({ credentialLeaks: mod.credentialLeaks, threats: data.threats, exposures: data.exposures });
      return {
        ...base,
        stats: [
          { label: "Executive Risk Score", value: `${indices.overall}/100` },
          { label: "Physical security", value: `${indices.physical}/100` },
          { label: "Doxxing leaks", value: doxxing.total },
          { label: "Threat actors", value: actors.length },
        ],
        sections: [
          { heading: "Executive risk indices", rows: RISK_INDEX_META.map((m) => ({ label: m.label, value: `${indices[m.key]}/100` })) },
          { heading: "Residence protection", rows: residence.findings.map((f) => ({ label: f.label, value: `${titleCase(f.status)}${f.sources.length ? ` · ${f.sources.join(", ")}` : ""}` })) },
          { heading: "Doxxing exposure", rows: (Object.keys(doxxing.byKind) as LeakKind[]).map((k) => ({ label: LEAK_LABEL[k], value: `${doxxing.byKind[k]} leak(s)` })) },
          { heading: "Impersonation & deepfake", rows: (Object.keys(impersonation.byCategory) as ImpersonationCategory[]).map((c) => ({ label: IMPERSONATION_LABEL[c], value: `${impersonation.byCategory[c]} signal(s)` })) },
          { heading: "Dark-web exposure", rows: [
            ...(Object.keys(darkweb.byCategory) as DarkWebCategory[]).map((c) => ({ label: DARKWEB_LABEL[c], value: `${darkweb.byCategory[c]} signal(s)` })),
            { label: "Records exposed", value: darkweb.recordsExposed.toLocaleString() },
          ] },
          { heading: "Threat actors", rows: actors.length ? actors.map((a) => ({ label: a.label, value: `${titleCase(a.escalation)} · ${a.threatCount} threat(s) · ${titleCase(a.highestRisk)}${a.harassment ? " · harassment" : ""}` })) : [{ label: "None tracked", value: "No active threat actors" }] },
          { heading: "Family exposure", rows: mod.familyMembers.map((f) => ({ label: `${f.displayName} (${f.relation})`, value: `${f.exposuresCount} exposures · ${titleCase(f.riskLevel)}` })) },
        ],
      };
    }
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
