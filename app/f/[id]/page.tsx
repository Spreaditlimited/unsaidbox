import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseQuestions } from "@/lib/form-policy.mjs";
import type { FormQuestion } from "@/lib/form-templates";
import { RespondForm } from "@/components/forms/RespondForm";
import "@/app/forms.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Share your thoughts",
  robots: { index: false, follow: false },
};
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await db().feedbackForm.findFirst({
    where: {
      id,
      linkActive: true,
      blocked: false,
      account: { status: "ACTIVE" },
    },
    select: {
      id: true,
      title: true,
      description: true,
      questions: true,
      theme: true,
      allowSharing: true,
      acceptingResponses: true,
      revision: true,
      image: true,
      account: { select: { displayName: true } },
    },
  });
  if (!f) notFound();
  return (
    <main id="main" className={`feedback-public feedback-theme-${f.theme}`}>
      <div className="feedback-sheet">
        <header className="feedback-sheet-header">
          {f.image ? (
            <img
              className="feedback-logo"
              src={`/f/${id}/image`}
              alt="Form branding"
              width={64}
              height={64}
            />
          ) : (
            <span className="feedback-logo" aria-hidden="true">
              ✧
            </span>
          )}
          <p className="eyebrow">A NOTE FROM {f.account.displayName}</p>
          <h1>{f.title}</h1>
          <p>{f.description}</p>
          <span className="feedback-private-pill">No name. No sign-in.</span>
        </header>
        <div className="feedback-sheet-body">
          {f.acceptingResponses ? (
            <RespondForm
              id={id}
              revision={f.revision}
              questions={parseQuestions(f.questions) as FormQuestion[]}
              allowSharing={f.allowSharing}
              requestKey={randomUUID()}
            />
          ) : (
            <div className="feedback-empty">
              <h2>This form is taking a pause.</h2>
              <p>New responses aren’t being collected right now.</p>
            </div>
          )}
        </div>
      </div>
      <footer className="feedback-public-footer">
        Made for honest answers.{" "}
        <Link href="/templates">Create yours with UnsaidBox ↗</Link>
        <Link href="/contact">Report a concern</Link>
      </footer>
    </main>
  );
}
