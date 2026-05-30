import { describe, expect, it } from "vitest";
import { computeSignature, parseSigHeader, verifyStripeSignature } from "./webhook";

const SECRET = "whsec_test";
const PAYLOAD = '{"id":"evt_1","type":"checkout.session.completed"}';

function header(ts: string, payload = PAYLOAD, secret = SECRET): string {
  return `t=${ts},v1=${computeSignature(payload, ts, secret)}`;
}

describe("stripe webhook verification", () => {
  it("parses the signature header", () => {
    const parsed = parseSigHeader("t=123,v1=abc,v1=def");
    expect(parsed.t).toBe("123");
    expect(parsed.v1).toEqual(["abc", "def"]);
  });

  it("accepts a valid, in-tolerance signature", () => {
    const now = 1_700_000_000_000;
    const ts = String(Math.floor(now / 1000));
    expect(verifyStripeSignature(PAYLOAD, header(ts), SECRET, 300, now).valid).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const now = 1_700_000_000_000;
    const ts = String(Math.floor(now / 1000));
    const res = verifyStripeSignature('{"id":"evt_evil"}', header(ts), SECRET, 300, now);
    expect(res.valid).toBe(false);
  });

  it("rejects an out-of-tolerance timestamp (replay)", () => {
    const now = 1_700_000_000_000;
    const oldTs = String(Math.floor(now / 1000) - 10_000);
    expect(verifyStripeSignature(PAYLOAD, header(oldTs), SECRET, 300, now).valid).toBe(false);
  });

  it("rejects a missing/malformed header", () => {
    expect(verifyStripeSignature(PAYLOAD, null, SECRET).valid).toBe(false);
    expect(verifyStripeSignature(PAYLOAD, "garbage", SECRET).valid).toBe(false);
  });
});
