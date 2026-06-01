import { describe, it, expect, vi } from "vitest";
import { mapHunterDomainSearch, bestContact, resolveHunterSource, HunterApiSource, NoHunterSource, type HunterContact } from "./hunter-connector";
import { attachContact, type JournalistRecord } from "./journalist-connector";
import { isFresh } from "./serp-cache";
import { CONTACT_TTL_MS } from "./contact-cache";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("hunter connector", () => {
  it("maps domain-search emails", () => {
    const c = mapHunterDomainSearch({ data: { emails: [
      { value: "a@x.com", confidence: 90, first_name: "Ann", last_name: "Lee", position: "Editor" },
      { value: null as never },
    ] } });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ email: "a@x.com", firstName: "Ann", confidence: 90 });
  });

  it("resolves NoHunterSource without a key, HunterApiSource with one", () => {
    expect(resolveHunterSource({})).toBeInstanceOf(NoHunterSource);
    expect(resolveHunterSource({ HUNTER_API_KEY: "k" })).toBeInstanceOf(HunterApiSource);
  });

  it("goes live on response, falls back on error", async () => {
    const ok = new HunterApiSource("k", vi.fn(async () => jsonResponse({ data: { emails: [{ value: "p@x.com", confidence: 80 }] } })) as unknown as typeof fetch);
    const a = await ok.findContacts("x.com");
    expect(a.live).toBe(true);
    expect(a.contacts[0].email).toBe("p@x.com");

    const bad = new HunterApiSource("k", vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch);
    expect((await bad.findContacts("x.com")).live).toBe(false);
    // no key → no-op, no fetch
    const fetchSpy = vi.fn();
    const none = new HunterApiSource(undefined, fetchSpy as unknown as typeof fetch);
    expect((await none.findContacts("x.com")).live).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bestContact prefers an editorial role, then confidence", () => {
    const contacts: HunterContact[] = [
      { email: "ceo@x.com", position: "CEO", confidence: 99 },
      { email: "editor@x.com", position: "News Editor", confidence: 70 },
      { email: "press@x.com", position: "Press Officer", confidence: 85 },
    ];
    expect(bestContact(contacts)!.email).toBe("press@x.com"); // editorial + highest confidence
    expect(bestContact([{ email: "only@x.com", confidence: 50 }])!.email).toBe("only@x.com");
    expect(bestContact([])).toBeNull();
  });
});

describe("attachContact", () => {
  const base: JournalistRecord = { name: "x.com — newsroom", outlet: "x.com", beat: "News", relevance: 80, provider: "coverage" };

  it("promotes the desk record to the named contact when found", () => {
    const out = attachContact(base, [{ email: "ann@x.com", firstName: "Ann", lastName: "Lee", position: "Editor", confidence: 92 }]);
    expect(out.email).toBe("ann@x.com");
    expect(out.contactName).toBe("Ann Lee");
    expect(out.name).toMatch(/Ann Lee · Editor/);
    expect(out.contactConfidence).toBe(92);
  });

  it("is a no-op with no contacts", () => {
    expect(attachContact(base, [])).toEqual(base);
  });
});

describe("contact cache TTL", () => {
  it("is 30 days and uses the shared isFresh", () => {
    const now = Date.now();
    expect(CONTACT_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(isFresh(new Date(now - 1000).toISOString(), now, CONTACT_TTL_MS)).toBe(true);
    expect(isFresh(new Date(now - CONTACT_TTL_MS - 1000).toISOString(), now, CONTACT_TTL_MS)).toBe(false);
  });
});
