/**
 * Stripe webhook signature verification (no SDK).
 *
 * Implements Stripe's `t=…,v1=…` scheme: HMAC-SHA256 over `${t}.${payload}`
 * keyed by the webhook signing secret, compared in constant time, with a
 * tolerance window to reject replays. Pure and unit-testable.
 */

import crypto from "node:crypto";

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export function parseSigHeader(header: string): { t?: string; v1: string[] } {
  const out: { t?: string; v1: string[] } = { v1: [] };
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") out.t = v;
    if (k === "v1" && v) out.v1.push(v);
  }
  return out;
}

export function computeSignature(payload: string, timestamp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

export function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Date.now(),
): VerifyResult {
  if (!sigHeader) return { valid: false, reason: "missing signature" };
  const { t, v1 } = parseSigHeader(sigHeader);
  if (!t || v1.length === 0) return { valid: false, reason: "malformed signature" };

  if (Math.abs(now / 1000 - Number(t)) > toleranceSeconds) {
    return { valid: false, reason: "timestamp outside tolerance" };
  }

  const expected = computeSignature(payload, t, secret);
  const expectedBuf = Buffer.from(expected);
  const matched = v1.some((sig) => {
    const b = Buffer.from(sig);
    return b.length === expectedBuf.length && crypto.timingSafeEqual(b, expectedBuf);
  });
  return matched ? { valid: true } : { valid: false, reason: "no matching signature" };
}
