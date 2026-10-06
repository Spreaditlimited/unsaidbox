import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { parseQuestions } from "@/lib/form-policy.mjs";
import type { FormQuestion } from "@/lib/form-templates";
export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireAccount();
  const { id } = await params;
  const f = await db().feedbackForm.findFirst({
    where: { id, accountId: a.id },
  });
  if (!f) notFound();
  return (
    <DashboardShell accountId={a.id} name={a.displayName} section="forms">
      <Link className="fine" href={`/dashboard/forms/${id}`}>
        ← Back to results
      </Link>
      <div className="feedback-page-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h1>Edit your form.</h1>
        <p>Your audience deserves a thoughtful welcome.</p>
      </div>
      {f.blocked ? (
        <p className="notice">
          This form is paused by administration. Contact hello@unsaidbox.com for
          help.
        </p>
      ) : (
        <FormBuilder
          id={f.id}
          revision={f.revision}
          locked={f.locked}
          hasImage={Boolean(f.image)}
          initial={{
            title: f.title,
            description: f.description,
            thankYou: f.thankYou,
            questions: parseQuestions(f.questions) as FormQuestion[],
            theme: f.theme,
            allowSharing: f.allowSharing,
            templateId: f.templateId,
          }}
        />
      )}
    </DashboardShell>
  );
}
