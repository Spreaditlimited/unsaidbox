import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SenderForm } from "@/components/SenderForm";
export const dynamic = "force-dynamic";
export default async function Ask({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const a = await db().account.findFirst({
    where: { username, status: "ACTIVE" },
    select: {
      username: true,
      displayName: true,
      status: true,
      inboxOpen: true,
      inboxSharingPolicy: true,
    },
  });
  if (!a || a.status !== "ACTIVE") notFound();
  return (
    <SenderForm
      username={a.username}
      name={a.displayName}
      prompt="What would you like to say?"
      policy={a.inboxSharingPolicy}
      open={a.inboxOpen}
    />
  );
}
