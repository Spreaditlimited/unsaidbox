import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { canShareResponse } from "@/lib/publishing.mjs";
import { ShareStudio } from "@/components/ShareStudio";
import { DashboardShell } from "@/components/DashboardShell";
export default async function Share({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireAccount();
  const { id } = await params;
  const r = await db().submission.findFirst({
    where: { id, accountId: a.id },
    include: { question: true },
  });
  if (!r || !canShareResponse(r)) notFound();
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <h1>Share these words.</h1>
      <p className="notice">
        Review identifying details before sharing. Downloads and copied text
        cannot be recalled once shared externally.
      </p>
      <ShareStudio
        initialBody={r.publicBody ?? r.body}
        question={r.question?.body ?? "An anonymous inbox message"}
        initialPostUrl={r.question?.socialPostUrl ?? ""}
      />
    </DashboardShell>
  );
}
