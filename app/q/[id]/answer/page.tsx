import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SenderForm } from "@/components/SenderForm";
export const dynamic = "force-dynamic";
export default async function Answer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const q = await db().question.findFirst({
    where: { id, linkActive: true, account: { status: "ACTIVE" } },
    include: {
      account: { select: { username: true, displayName: true, status: true } },
    },
  });
  if (!q || !q.linkActive || q.account.status !== "ACTIVE") notFound();
  return (
    <SenderForm
      username={q.account.username}
      name={q.account.displayName}
      questionId={q.id}
      prompt={q.body}
      policy={q.sharingPolicy}
      open={q.acceptingResponses}
    />
  );
}
