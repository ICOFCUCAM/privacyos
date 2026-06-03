/**
 * Route-handler integration tests.
 *
 * Exercise the API routes end-to-end in demo mode (no Supabase configured), so
 * they run with zero external dependencies. They verify status codes, payload
 * shape and headers — the contract the dashboard and external schedulers rely on.
 */
import { describe, expect, it } from "vitest";
import { AGENT_COUNT } from "@/lib/agents/orchestrator";
import { POST as protectPOST } from "./protect/route";
import { POST as discoverPOST } from "./discover/route";
import { GET as legalGET } from "./legal/route";
import { GET as reportGET } from "./reports/[type]/route";
import { GET as cronGET } from "./cron/route";

describe("POST /api/protect", () => {
  it("returns a full protection outcome", async () => {
    const res = await protectPOST(new Request("http://t/api/protect", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agentStates).toHaveLength(AGENT_COUNT);
    expect(Array.isArray(body.recommendations)).toBe(true);
    expect(body.persisted).toBe(false); // demo mode
  });
});

describe("POST /api/discover", () => {
  it("returns discovery findings", async () => {
    const res = await discoverPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("newExposures");
    expect(body).toHaveProperty("newThreats");
    expect(Array.isArray(body.log)).toBe(true);
  });
});

describe("GET /api/legal", () => {
  it("generates a downloadable GDPR document", async () => {
    const res = await legalGET(new Request("http://t/api/legal?type=gdpr_erasure&recipient=Spokeo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const text = await res.text();
    expect(text).toContain("Article 17");
    expect(text).toContain("Spokeo");
  });

  it("rejects an unknown document type", async () => {
    const res = await legalGET(new Request("http://t/api/legal?type=bogus"));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/reports/[type]", () => {
  it("renders a print-ready HTML report", async () => {
    const res = await reportGET(new Request("http://t/api/reports/privacy"), {
      params: Promise.resolve({ type: "privacy" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Privacy Report");
  });

  it("rejects an unknown report type", async () => {
    const res = await reportGET(new Request("http://t/api/reports/bogus"), {
      params: Promise.resolve({ type: "bogus" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/cron", () => {
  it("returns 503 when the scheduler is not configured (no service role)", async () => {
    const res = await cronGET(new Request("http://t/api/cron"));
    expect(res.status).toBe(503);
  });
});
