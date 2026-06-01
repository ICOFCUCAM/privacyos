/**
 * Executive Protection OS — residence protection.
 *
 * Detects exposure of the principal's home: public address listings, property
 * records, satellite/street-view visibility and real-estate listings. Derived
 * from the address/public-record exposures the platform collects. Pure and
 * unit-tested.
 */

import type { Exposure, RiskLevel } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type ResidenceCheck = "address_exposure" | "property_records" | "satellite_view" | "home_listing";
export type ResidenceStatus = "clear" | "monitoring" | "exposed";

export interface ResidenceFinding {
  check: ResidenceCheck;
  label: string;
  status: ResidenceStatus;
  detail: string;
  sources: string[];
  action: string;
}

export interface ResidenceReport {
  findings: ResidenceFinding[];
  addressExposures: Exposure[];
  exposedCount: number;
  /** 0–100 residence protection (higher = better protected). */
  protection: number;
}

const REALTY = /zillow|realtor|redfin|trulia|homes\.com|property|realty/i;

function highest(exposures: Exposure[]): RiskLevel | null {
  return exposures.length === 0 ? null : exposures.reduce<RiskLevel>((a, e) => (RISK_RANK[e.riskLevel] > RISK_RANK[a] ? e.riskLevel : a), "low");
}

export function residenceReport(exposures: Exposure[]): ResidenceReport {
  const address = exposures.filter((e) => e.category === "address");
  const publicRecords = exposures.filter((e) => e.source === "public_record");
  const listings = exposures.filter((e) => REALTY.test(e.sourceName) || REALTY.test(e.url ?? ""));
  const sourcesOf = (es: Exposure[]) => [...new Set(es.map((e) => e.sourceName))];

  const addressStatus: ResidenceStatus = address.length === 0 ? "clear" : highest(address) === "low" ? "monitoring" : "exposed";
  // If the home address is public, the satellite view and property records are at risk too.
  const propertyStatus: ResidenceStatus = publicRecords.length > 0 ? "exposed" : address.length > 0 ? "monitoring" : "clear";
  const satelliteStatus: ResidenceStatus = address.length > 0 ? (highest(address) === "critical" || highest(address) === "high" ? "exposed" : "monitoring") : "clear";
  const listingStatus: ResidenceStatus = listings.length > 0 ? "exposed" : address.length > 0 ? "monitoring" : "clear";

  const findings: ResidenceFinding[] = [
    { check: "address_exposure", label: "Address exposure", status: addressStatus, detail: address.length ? `Home address found in ${address.length} place(s).` : "No public address listings found.", sources: sourcesOf(address), action: "File opt-outs with the listing brokers." },
    { check: "property_records", label: "Property records", status: propertyStatus, detail: publicRecords.length ? `${publicRecords.length} public-record exposure(s) tied to the residence.` : address.length ? "Address public — property records may be linkable." : "No property-record exposure detected.", sources: sourcesOf(publicRecords), action: "Request redaction / use an LLC or trust for the title." },
    { check: "satellite_view", label: "Satellite / street view", status: satelliteStatus, detail: address.length ? "Residence likely visible on map/street-view services." : "Residence not linkable to a map view.", sources: [], action: "Submit blur requests to Google/Apple/Bing street view." },
    { check: "home_listing", label: "Home listing", status: listingStatus, detail: listings.length ? `Residence appears on ${listings.length} real-estate site(s).` : address.length ? "No active listing, but address is public." : "No real-estate listings found.", sources: sourcesOf(listings), action: "Request de-listing of historical sale/rental records." },
  ];

  const exposedCount = findings.filter((f) => f.status === "exposed").length;
  const load = findings.reduce((s, f) => s + (f.status === "exposed" ? 22 : f.status === "monitoring" ? 8 : 0), 0);
  const protection = Math.max(0, Math.min(100, 100 - load));

  return { findings, addressExposures: address, exposedCount, protection };
}
