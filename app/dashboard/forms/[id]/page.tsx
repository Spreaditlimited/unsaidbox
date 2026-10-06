import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseQuestions } from "@/lib/form-policy.mjs";
import type { FormQuestion } from "@/lib/form-templates";
import { DashboardShell } from "@/components/DashboardShell";
import { CopyLink } from "@/components/CopyLink";
import { ActionForm, DeleteForm } from "@/components/ActionForm";
import {
  changeFeedbackForm,
  deleteFeedbackForm,
  deleteFeedbackEntry,
} from "../actions";
export default async function FormResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; saved?: string }>;
}) {
  const a = await requireAccount();
  const { id } = await params;
  const search = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(search.page) || 1)),
  );
  const f = await db().feedbackForm.findFirst({
    where: { id, accountId: a.id },
  });
  if (!f) notFound();
  const questions = parseQuestions(f.questions) as FormQuestion[];
  const answerScope = { entry: { formId: id, form: { accountId: a.id } } };
  const [entries, ratings, choices, counts] = await Promise.all([
    db().feedbackEntry.findMany({
      where: { formId: id, form: { accountId: a.id } },
      include: { answers: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    db().feedbackAnswer.groupBy({
      by: ["questionId"],
      where: { ...answerScope, type: "RATING" },
      _avg: { numberValue: true },
      _count: { _all: true },
    }),
    db().feedbackAnswer.groupBy({
      by: ["questionId", "textValue"],
      where: { ...answerScope, type: "CHOICE" },
      _count: { _all: true },
    }),
    db().feedbackAnswer.groupBy({
      by: ["questionId"],
      where: answerScope,
      _count: { _all: true },
    }),
  ]);
  return (
    <DashboardShell accountId={a.id} name={a.displayName} section="forms">
      <Link className="fine" href="/dashboard/forms">
        ← All forms
      </Link>
      <div className="app-heading">
        <div className="feedback-page-heading">
          <span className="eyebrow">YOUR PRIVATE RESULTS</span>
          <h1>{f.title}</h1>
          <p>
            {f.responseCount} {f.responseCount === 1 ? "response" : "responses"}{" "}
            · {questions.length} questions ·{" "}
            {f.blocked
              ? "Paused by administration"
              : !f.locked
                ? "Draft"
                : !f.linkActive
                  ? "Link disabled"
                  : f.acceptingResponses
                    ? "Collecting responses"
                    : "Responses paused"}
          </p>
        </div>
        <Link className="button secondary" href={`/dashboard/forms/${id}/edit`}>
          {f.locked ? "Edit appearance" : "Continue editing"}
        </Link>
      </div>
      {search.saved && (
        <p className="notice" role="status">
          Form saved.{" "}
          {f.linkActive
            ? "Your link is ready to share."
            : "Your form is not collecting responses yet."}
        </p>
      )}
      <section className="panel feedback-link-panel">
        <div>
          <span className="eyebrow">ONE LINK. HONEST ANSWERS.</span>
          <h2>
            {f.linkActive ? "Invite people in." : "Your sharing controls."}
          </h2>
          <p className="fine">
            This form is never listed in Explore or on your public profile.{" "}
            {f.allowSharing
              ? "Only responses with sender permission can be turned into share cards."
              : "All responses to this form are private-only."}
          </p>
        </div>
        {f.linkActive && !f.blocked && (
          <CopyLink path={`/f/${id}`} label="Copy form link" />
        )}
        <div className="feedback-control-row">
          {f.linkActive && !f.blocked && (
            <Link
              className="button secondary"
              href={`/f/${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open form ↗
            </Link>
          )}
          {f.locked && !f.blocked && (
            <ActionForm
              action={changeFeedbackForm.bind(null, id)}
              captchaAction="changeFeedbackForm"
              label={
                f.acceptingResponses ? "Pause responses" : "Open responses"
              }
            >
              <input
                type="hidden"
                name="operation"
                value={f.acceptingResponses ? "pause" : "resume"}
              />
              <input type="hidden" name="revision" value={f.revision} />
            </ActionForm>
          )}
          {f.linkActive && !f.blocked && (
            <ActionForm
              action={changeFeedbackForm.bind(null, id)}
              captchaAction="changeFeedbackForm"
              label="Disable share link"
            >
              <input type="hidden" name="operation" value="disable" />
              <input type="hidden" name="revision" value={f.revision} />
            </ActionForm>
          )}
          <ActionForm
            action={changeFeedbackForm.bind(null, id)}
            captchaAction="changeFeedbackForm"
            label="Duplicate form"
          >
            <input type="hidden" name="operation" value="duplicate" />
          </ActionForm>
        </div>
      </section>
      {f.responseCount > 0 && (
        <section className="dashboard-section">
          <h2>The picture so far.</h2>
          <div className="feedback-summary-grid">
            {questions.map((q) => {
              const count =
                counts.find((c) => c.questionId === q.id)?._count._all ?? 0;
              const rating = ratings.find((r) => r.questionId === q.id);
              return (
                <article className="panel" key={q.id}>
                  <span className="eyebrow">
                    {q.type === "RATING"
                      ? "RATING"
                      : q.type === "CHOICE"
                        ? "SINGLE CHOICE"
                        : "WRITTEN ANSWERS"}
                  </span>
                  <h3>{q.label}</h3>
                  {q.type === "RATING" ? (
                    <p className="feedback-average">
                      {rating?._avg.numberValue?.toFixed(1) ?? "—"}
                      <small> / 5</small>
                    </p>
                  ) : q.type === "CHOICE" ? (
                    <div className="feedback-breakdown">
                      {q.options.map((o) => {
                        const n =
                          choices.find(
                            (c) => c.questionId === q.id && c.textValue === o,
                          )?._count._all ?? 0;
                        return (
                          <div key={o}>
                            <span>{o}</span>
                            <strong>{n}</strong>
                            <meter
                              min={0}
                              max={Math.max(count, 1)}
                              value={n}
                              aria-label={`${o}: ${n} of ${count} answers`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="feedback-average">
                      {count}
                      <small> answers</small>
                    </p>
                  )}
                  <p className="fine">
                    {count} answered · {f.responseCount - count} skipped
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <section className="dashboard-section">
        <h2>Individual responses.</h2>
        {!entries.length ? (
          <div className="panel feedback-empty">
            <span className="feedback-empty-mark">◎</span>
            <h3>A little space for what comes next.</h3>
            <p>
              {f.linkActive
                ? "Share your link. Responses will arrive here, privately."
                : "Publish your form to start collecting responses."}
            </p>
          </div>
        ) : (
          <div className="feedback-entry-list">
            {entries.map((e, index) => (
              <article className="panel feedback-entry" key={e.id}>
                <header>
                  <span className="eyebrow">
                    RESPONSE {f.responseCount - (page - 1) * 20 - index}
                  </span>
                  <span className="fine">
                    {e.createdAt.toLocaleString("en-GB", {
                      timeZone: "UTC",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    UTC ·{" "}
                    {e.shareAllowed ? "Sharing permitted" : "Private-only"}
                  </span>
                </header>
                {questions.map((q) => {
                  const answer = e.answers.find((x) => x.questionId === q.id);
                  if (!answer) return null;
                  return (
                    <div className="feedback-answer" key={answer.id}>
                      <h3>{answer.label}</h3>
                      <p className="message-text">
                        {answer.type === "RATING"
                          ? `${answer.numberValue} / 5`
                          : answer.textValue}
                      </p>
                      {e.shareAllowed &&
                        f.allowSharing &&
                        !f.blocked &&
                        answer.type === "TEXT" && (
                          <Link
                            className="button secondary small"
                            href={`/dashboard/forms/${id}/share/${answer.id}`}
                          >
                            Create share card ↗
                          </Link>
                        )}
                    </div>
                  );
                })}
                <footer>
                  <DeleteForm
                    action={deleteFeedbackEntry.bind(null, e.id)}
                    description="This will delete this response and all its answers."
                  />
                </footer>
              </article>
            ))}
          </div>
        )}
        <div className="action-row">
          {page > 1 && (
            <Link
              className="button secondary"
              href={`/dashboard/forms/${id}?page=${page - 1}`}
            >
              Previous
            </Link>
          )}
          {page * 20 < f.responseCount && (
            <Link
              className="button secondary"
              href={`/dashboard/forms/${id}?page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </div>
      </section>
      <details className="panel feedback-danger">
        <summary>Delete form</summary>
        <p>
          Disable the share link first. Deleting removes the form and all its
          responses permanently.
        </p>
        {!f.linkActive && (
          <DeleteForm
            action={deleteFeedbackForm.bind(null, id)}
            description="This removes the form and all collected responses."
          />
        )}
      </details>
    </DashboardShell>
  );
}
