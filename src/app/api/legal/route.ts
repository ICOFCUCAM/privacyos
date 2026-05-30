import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { generateLegalDoc, LEGAL_TYPE_LABELS } from "@/lib/legal/engine";
import type { LegalRequestType } from "@/lib/suite-types";

/**
 * GET /api/legal?type=...&recipient=...&matter=... — generates a ready-to-send
 * legal/privacy document for the current subject and returns it as a downloadable
 * text file.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as LegalRequestType | null;
  const recipient = url.searchParams.get("recipient") ?? "Data Controller";
  const matter = url.searchParams.get("matter") ?? undefined;

  if (!type || !(type in LEGAL_TYPE_LABELS)) {
    return NextResponse.json({ error: "Provide a valid ?type" }, { status: 400 });
  }

  const ds = await getDataSource();
  const subject = await ds.getPrimarySubject();

  const doc = generateLegalDoc({
    type,
    subjectName: subject?.displayName ?? "The Requester",
    recipient,
    matter,
    contactEmail: subject?.emails[0],
    jurisdiction: "EU",
  });

  const filename = `${type}-${recipient.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  return new NextResponse(`${doc.title}\n${"=".repeat(doc.title.length)}\n\n${doc.body}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
