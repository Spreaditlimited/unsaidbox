import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { processEmailQueue } from "@/lib/email-queue.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.UNSAIDBOX_EMAIL_WORKER_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (
    !secret ||
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await processEmailQueue(db(), { limit: 1 }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Email worker unavailable" },
      { status: 503 },
    );
  }
}
