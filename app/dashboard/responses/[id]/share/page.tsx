import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { canShareResponse } from "@/lib/publishing.mjs";
import { ShareStudio } from "@/components/ShareStudio";
import { DashboardShell } from "@/components/DashboardShell";
import { shareBrand } from "@/lib/branding";
import Link from "next/link";
import styles from '@/components/ShareStudio.module.css';
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
      <header className={styles.pageHeader}>
      <Link href="/dashboard?view=inbox">← Back to inbox</Link>
      <p className="eyebrow">SHARE STUDIO</p>
      <h1>Words worth sharing.</h1>
      <p>Refine the words, make the card yours, then share it with your audience.</p>
      </header>
      <p className={styles.privacyNote}>
        Review identifying details before sharing. Downloads and copied text
        cannot be recalled once shared externally.
      </p>
      <ShareStudio
        brand={await shareBrand(a.id)}
        initialBody={r.publicBody ?? r.body}
        question={r.question?.body ?? ""}
        initialPostUrl={r.question?.socialPostUrl ?? ""}
      />
    </DashboardShell>
  );
}
