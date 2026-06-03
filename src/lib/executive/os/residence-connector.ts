/**
 * Residence property-data connector (keyed, optional).
 *
 * Independently sources the residence checks — property records, map/satellite
 * visibility and active listings — from a property-data provider (ATTOM-style),
 * rather than inferring them from address exposures. Key-gated and best-effort:
 * no PROPERTY_DATA_API_KEY, an error, or no match all degrade to `live: false`
 * (the report falls back to the inferred model). Fetch is injectable for tests.
 */

import { fetchJsonWithTimeout } from "@/lib/net/keyed-fetch";

export interface ResidenceSignals {
  /** A public property record exists for the address. */
  propertyRecordFound: boolean;
  /** The residence is currently listed for sale/rent. */
  listingActive: boolean;
  /** Geocoded → visible on map/street-view services. */
  satelliteVisible: boolean;
  sources: string[];
  parcelId?: string;
  ownerOnRecord?: string;
}

export interface ResidenceSource {
  lookup(address: string): Promise<{ signals: ResidenceSignals | null; live: boolean }>;
}

interface AttomProperty {
  identifier?: { attomId?: number | string; apn?: string };
  location?: { latitude?: string | number | null; longitude?: string | number | null };
  owner?: { owner1?: { lastname?: string; firstname?: string } };
  sale?: { saleTransDate?: string | null; amount?: { saleamt?: number | null } };
  status?: string | null;
}

/** Map an ATTOM-style property response into residence signals. */
export function mapPropertyResponse(data: { property?: AttomProperty[] }, provider = "ATTOM"): ResidenceSignals | null {
  const props = data.property ?? [];
  if (props.length === 0) return null;
  const p = props[0];
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  const owner = p.owner?.owner1;
  return {
    propertyRecordFound: true,
    listingActive: (p.status ?? "").toLowerCase() === "active" || props.some((x) => (x.status ?? "").toLowerCase() === "active"),
    satelliteVisible: lat != null && lng != null && String(lat) !== "" && String(lng) !== "",
    sources: [provider],
    parcelId: p.identifier?.apn ?? (p.identifier?.attomId != null ? String(p.identifier.attomId) : undefined),
    ownerOnRecord: owner ? [owner.firstname, owner.lastname].filter(Boolean).join(" ") || undefined : undefined,
  };
}

export class PropertyApiSource implements ResidenceSource {
  constructor(
    private apiKey: string | undefined,
    private fetchImpl: typeof fetch = fetch,
    private baseUrl = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail",
  ) {}

  async lookup(address: string): Promise<{ signals: ResidenceSignals | null; live: boolean }> {
    if (!this.apiKey || !address) return { signals: null, live: false };
    try {
      const url = `${this.baseUrl}?address=${encodeURIComponent(address)}`;
      const data = await fetchJsonWithTimeout<{ property?: AttomProperty[] }>(url, {
        init: { headers: { apikey: this.apiKey, Accept: "application/json" } },
        fetchImpl: this.fetchImpl,
        label: "Property API",
      });
      return { signals: mapPropertyResponse(data), live: true };
    } catch {
      return { signals: null, live: false };
    }
  }
}

/** No-op source used when no property-data key is configured. */
export class NoResidenceSource implements ResidenceSource {
  async lookup(): Promise<{ signals: ResidenceSignals | null; live: boolean }> {
    return { signals: null, live: false };
  }
}

export function resolveResidenceSource(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): ResidenceSource {
  if (env.PROPERTY_DATA_API_KEY) return new PropertyApiSource(env.PROPERTY_DATA_API_KEY, fetchImpl);
  return new NoResidenceSource();
}
