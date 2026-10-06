import { Checkbox } from "@/components/ui/Checkbox";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
import { ResponseActions } from "@/components/ResponseActions";
import { ActionForm, DeleteForm } from "@/components/ActionForm";
import { CopyLink } from "@/components/CopyLink";
import { saveQuestion, deleteQuestion } from "@/app/actions";
export default async function Question({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireAccount();
  const { id } = await params;
  const q = await db().question.findFirst({
    where: { id, accountId: a.id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!q) notFound();
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <h1>Manage question.</h1>
      <section className="panel editor-panel">
        <CopyLink path={`/q/${id}/answer`} label="Copy answer link" />
        <ActionForm
          action={saveQuestion.bind(null, id)}
          label="Save question"
          captchaAction="saveQuestion"
        >
          <label>
            Question
            <textarea
              name="body"
              required
              maxLength={5000}
              defaultValue={q.body}
            />
          </label>
          <label>
            Facebook post link · optional
            <input
              name="socialPostUrl"
              type="url"
              maxLength={1000}
              defaultValue={q.socialPostUrl ?? ""}
            />
          </label>
          <Checkbox name="linkActive" defaultChecked={q.linkActive}>
            Link active
          </Checkbox>
          <Checkbox
            name="acceptingResponses"
            defaultChecked={q.acceptingResponses}
          >
            Accept new answers
          </Checkbox>
          <Checkbox name="publicVisible" defaultChecked={q.publicVisible}>
            Show on my public page
          </Checkbox>
          <Checkbox name="discoverable" defaultChecked={q.discoverable}>
            Request inclusion in Explore (moderated)
          </Checkbox>
          <p className="fine">
            Public display also requires your public page to be enabled in
            settings. Changes to this question reset Explore approval. Answers
            remain private until individually approved and made visible.
          </p>
        </ActionForm>
        <div className="action-row">
          <Link className="button secondary" href={`/q/${id}/answer`}>
            Open answer screen
          </Link>
          {q.publicVisible && a.publicPageEnabled && q.linkActive && (
            <Link className="button secondary" href={`/q/${id}`}>
              View public thread
            </Link>
          )}
        </div>
      </section>
      <section className="dashboard-section">
        <h2>Answers</h2>
        <div className="response-list">
          {q.submissions.map((s) => (
            <article className="panel" key={s.id}>
              <span className="badge">{s.status}</span>
              <p className="message-text">{s.body}</p>
              <ResponseActions response={s} />
            </article>
          ))}
        </div>
        {!q.submissions.length && (
          <p>No answers yet. Share your answer link to get started.</p>
        )}
      </section>
      <section className="panel">
        <h2>Delete question</h2>
        <p>
          First deactivate the link and turn public visibility off. Deleting
          also permanently removes its answers.
        </p>
        <DeleteForm
          action={deleteQuestion.bind(null, id)}
          description="The question and all its responses will be removed."
        />
      </section>
    </DashboardShell>
  );
}
