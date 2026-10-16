import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { canShareFormAnswer } from "@/lib/form-policy.mjs";
import { DashboardShell } from "@/components/DashboardShell";
import { ShareStudio } from "@/components/ShareStudio";
import { shareBrand } from "@/lib/branding";
import styles from '@/components/ShareStudio.module.css';
export default async function ShareFormAnswerPage({
  params,
}: {
  params: Promise<{ id: string; answerId: string }>;
}) {
  const a = await requireAccount();
  const { id, answerId } = await params;
  const answer = await db().feedbackAnswer.findFirst({
    where: {
      id: answerId,
      type: "TEXT",
      entry: { formId: id, form: { accountId: a.id } },
    },
    include: {
      entry: {
        include: {
          form: {
            select: {
              allowSharing: true,
              blocked: true,
              account: { select: { status: true } },
            },
          },
        },
      },
    },
  });
  if (!answer?.textValue || !canShareFormAnswer(answer.entry)) notFound();
  return (
    <DashboardShell accountId={a.id} name={a.displayName} section="forms">
      <header className={styles.pageHeader}>
      <Link href={`/dashboard/forms/${id}`}>
        ← Back to responses
      </Link>
      <p className="eyebrow">SHARE STUDIO</p>
      <h1>Words worth sharing.</h1>
      <p>Refine the words, make the card yours, then share it with your audience.</p>
      </header>
      <p className={styles.privacyNote}>
        The sender permitted sharing. Review and remove identifying details
        before exporting. Nothing is automatically published; externally shared
        copies cannot be recalled.
      </p>
      <ShareStudio initialBody={answer.textValue} question={answer.label} brand={await shareBrand(a.id)} />
    </DashboardShell>
  );
}
