/**
 * Threat-correlation / exposure-relationship graph.
 *
 * Builds a deterministic node-link graph that connects the protected subject to
 * the sources their data surfaces on and the categories of data exposed, with
 * edge weights from the underlying exposures and threats. This is genuine
 * situational awareness derived from the real dataset — no synthetic geography —
 * and it powers the Command Center relationship view. Pure and unit-tested.
 */

import type { Exposure, RiskLevel, Threat } from "@/lib/types";

export type NodeKind = "subject" | "source" | "category";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Number of items attached to this node. */
  weight: number;
  /** Dominant risk among attached items. */
  level: RiskLevel;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  level: RiskLevel;
}

export interface CorrelationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_RANK[b] > RISK_RANK[a] ? b : a;
}

const SOURCE_LABEL: Record<string, string> = {
  data_broker: "Data Brokers",
  search_engine: "Search Engines",
  social_media: "Social Media",
  forum: "Forums",
  breach_db: "Breach DBs",
  dark_web: "Dark Web",
  news: "News",
  public_record: "Public Records",
  archive: "Archives",
  ai_generated: "Synthetic Media",
};

const CATEGORY_LABEL: Record<string, string> = {
  name: "Name", alias: "Alias", email: "Email", phone: "Phone", address: "Address",
  family: "Family", photo: "Photo", username: "Username", employer: "Employer",
  financial: "Financial", credential: "Credentials",
};

function titleize(s: string): string {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Build the correlation graph. The subject is the hub; each distinct exposure
 * source and data category becomes a node, linked to the subject with a weight =
 * the count of items and a level = the dominant severity. Threats attach to
 * their source node, deepening the source's weight/severity.
 */
export function buildCorrelationGraph(
  subjectName: string,
  exposures: Exposure[],
  threats: Threat[] = [],
): CorrelationGraph {
  const sources = new Map<string, { weight: number; level: RiskLevel }>();
  const categories = new Map<string, { weight: number; level: RiskLevel }>();

  for (const e of exposures) {
    const s = sources.get(e.source) ?? { weight: 0, level: "low" as RiskLevel };
    s.weight += 1;
    s.level = maxLevel(s.level, e.riskLevel);
    sources.set(e.source, s);

    const c = categories.get(e.category) ?? { weight: 0, level: "low" as RiskLevel };
    c.weight += 1;
    c.level = maxLevel(c.level, e.riskLevel);
    categories.set(e.category, c);
  }
  for (const t of threats) {
    const s = sources.get(t.source) ?? { weight: 0, level: "low" as RiskLevel };
    s.weight += 1;
    s.level = maxLevel(s.level, t.riskLevel);
    sources.set(t.source, s);
  }

  const subjectId = "subject";
  const subjectLevel = [...sources.values(), ...categories.values()].reduce<RiskLevel>(
    (acc, v) => maxLevel(acc, v.level),
    "low",
  );

  const nodes: GraphNode[] = [
    { id: subjectId, kind: "subject", label: subjectName, weight: exposures.length + threats.length, level: subjectLevel },
  ];
  const edges: GraphEdge[] = [];

  for (const [source, v] of sources) {
    const id = `src:${source}`;
    nodes.push({ id, kind: "source", label: SOURCE_LABEL[source] ?? titleize(source), weight: v.weight, level: v.level });
    edges.push({ from: subjectId, to: id, weight: v.weight, level: v.level });
  }
  for (const [category, v] of categories) {
    const id = `cat:${category}`;
    nodes.push({ id, kind: "category", label: CATEGORY_LABEL[category] ?? titleize(category), weight: v.weight, level: v.level });
    edges.push({ from: subjectId, to: id, weight: v.weight, level: v.level });
  }

  return { nodes, edges };
}

export interface CorrelationStats {
  sources: number;
  categories: number;
  /** The source node carrying the most exposure. */
  topSource?: GraphNode;
  /** The most-exposed data category. */
  topCategory?: GraphNode;
  /** Count of high/critical edges. */
  criticalLinks: number;
}

export function correlationStats(graph: CorrelationGraph): CorrelationStats {
  const sources = graph.nodes.filter((n) => n.kind === "source");
  const categories = graph.nodes.filter((n) => n.kind === "category");
  const byWeight = (a: GraphNode, b: GraphNode) => b.weight - a.weight;
  return {
    sources: sources.length,
    categories: categories.length,
    topSource: [...sources].sort(byWeight)[0],
    topCategory: [...categories].sort(byWeight)[0],
    criticalLinks: graph.edges.filter((e) => e.level === "high" || e.level === "critical").length,
  };
}
