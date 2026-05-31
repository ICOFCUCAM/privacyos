import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { collectReputation } from "@/lib/reputation/collect";
import { NewsMentionSource } from "@/lib/reputation/news-connector";
import { resolveProvider } from "@/lib/agents/llm/provider";

/**
 * POST /api/reputation/scan — collect real news mentions for the primary
 * subject, score sentiment, and persist to `mentions` + `sentiment_records`.
 *
 * Uses GDELT (keyless) with a deterministic fallback when egress is blocked.
 * In demo mode (no live data source) findings are returned but not stored.
 */
export async function POST() {
  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();
  if (!subject) {
    return NextResponse.json({ error: "No subject to scan." }, { status: 400 });
  }

  const result = await collectReputation(
    { displayName: subject.displayName },
    new NewsMentionSource(),
    { provider: resolveProvider() },
  );

  let persisted = false;
  if (ds.live) {
    const db = await getSupabaseServerClient();
    if (db) {
      // Replace this subject's mentions with the fresh scan (idempotent re-scan).
      await db.from("mentions").delete().eq("subject_id", subject.id);
      if (result.mentions.length > 0) {
        await db.from("mentions").insert(
          result.mentions.map((m) => ({
            subject_id: subject.id,
            channel: m.channel,
            source_name: m.sourceName,
            url: m.url ?? null,
            title: m.title,
            excerpt: m.excerpt,
            sentiment: m.sentiment,
            sentiment_score: m.sentimentScore,
            is_defamatory: m.isDefamatory,
            detected_at: m.detectedAt,
          })),
        );
      }
      await db.from("sentiment_records").delete().eq("subject_id", subject.id);
      if (result.sentimentByDay.length > 0) {
        await db.from("sentiment_records").insert(
          result.sentimentByDay.map((d) => ({
            subject_id: subject.id,
            recorded_on: d.date,
            positive: d.positive,
            neutral: d.neutral,
            negative: d.negative,
            net_score: d.netScore,
          })),
        );
      }
      persisted = true;
    }
  }

  return NextResponse.json({
    persisted,
    source: result.live ? "gdelt" : "sample",
    mentions: result.mentions.length,
    negative: result.mentions.filter((m) => m.sentiment === "negative").length,
    log: result.log,
  });
}
