import Link from "next/link";
import Form from "next/form";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
import { ResponseActions } from "@/components/ResponseActions";
import { CopyLink } from "@/components/CopyLink";
import { Picker } from "@/components/ui/Picker";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/ActionForm";
import { resendVerification } from "@/app/email-actions";
export const dynamic = "force-dynamic";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; view?: string }>;
}) {
  const account = await requireAccount(false);
  if (account.status !== "ACTIVE")
    return (
      <DashboardShell accountId={account.id} name={account.displayName}>
        <h1>Your box is reserved.</h1>
        <section className="panel">
          <h2>Confirm your email</h2>
          <p>
            Check your inbox and spam folder for a verification link from
            hello@unsaidbox.com. Your inbox will accept messages after you
            confirm your email. If the email has not arrived, request a new
            link.
          </p>
          <ActionForm
            action={resendVerification}
            label="Resend verification email"
            captchaAction="resendVerification"
          >
            <p className="fine">
              Up to three requests per hour. Use the newest link.
            </p>
          </ActionForm>
          <p className="fine">
            Signed in as {account.email}. Refresh this page after activation.
          </p>
        </section>
      </DashboardShell>
    );
  const query = await searchParams;
  const view =
    query.view === "questions"
      ? "questions"
      : query.view === "inbox" || query.status || query.page
        ? "inbox"
        : "overview";
  const status = ["PENDING", "APPROVED", "ARCHIVED", "SPAM"].includes(
    query.status ?? "",
  )
    ? (query.status as "PENDING" | "APPROVED" | "ARCHIVED" | "SPAM")
    : undefined;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  const take = view === "overview" ? 5 : 20;
  const [
    questions,
    submissions,
    total,
    pending,
    activeQuestions,
    publicMessages,
  ] = await Promise.all([
    view === "inbox"
      ? []
      : db().question.findMany({
          where: { accountId: account.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: view === "overview" ? 4 : 50,
          include: { _count: { select: { submissions: true } } },
        }),
    view === "questions"
      ? []
      : db().submission.findMany({
          where: { accountId: account.id, status },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          skip: view === "overview" ? 0 : (page - 1) * take,
        }),
    view === "questions"
      ? 0
      : db().submission.count({ where: { accountId: account.id, status } }),
    view !== "overview"
      ? 0
      : db().submission.count({
          where: { accountId: account.id, status: "PENDING" },
        }),
    view !== "overview"
      ? 0
      : db().question.count({
          where: { accountId: account.id, linkActive: true },
        }),
    view !== "overview"
      ? 0
      : db().submission.count({
          where: {
            accountId: account.id,
            publicVisible: true,
            status: "APPROVED",
            sharingPolicy: "OWNER_MAY_SHARE",
            account: { publicPageEnabled: true },
            OR: [
              { questionId: null },
              { question: { linkActive: true, publicVisible: true } },
            ],
          },
        }),
  ]);
  const stats = [
    {
      label: "Total messages",
      value: total,
      detail: "Across your inbox and questions",
      icon: "inbox" as const,
      href: "/dashboard?view=inbox",
    },
    {
      label: "Awaiting review",
      value: pending,
      detail: "Private until you decide",
      icon: "shield" as const,
      href: "/dashboard?view=inbox&status=PENDING",
    },
    {
      label: "Active questions",
      value: activeQuestions,
      detail: "With an active answer link",
      icon: "question" as const,
      href: "/dashboard?view=questions",
    },
    {
      label: "Public responses",
      value: publicMessages,
      detail: "Visible on your public page",
      icon: "globe" as const,
      href: "/dashboard?view=inbox&status=APPROVED",
    },
  ];
  return (
    <DashboardShell
      accountId={account.id}
      name={account.displayName}
      section={view}
    >
      <div className="app-heading workspace-heading">
        <div>
          <p className="eyebrow">
            {view === "overview"
              ? "A LITTLE SPACE FOR HONESTY"
              : "YOUR WORKSPACE"}
          </p>
          <h1>
            {view === "overview"
              ? "Your box, at a glance."
              : view === "inbox"
                ? "Your inbox."
                : "Your questions."}
          </h1>
          <p>
            {view === "overview"
              ? `Welcome back, ${account.displayName}. Here’s what’s happening in your box.`
              : view === "inbox"
                ? "Read privately. Choose what deserves to be shared."
                : "Start a conversation. Keep control of what becomes public."}
          </p>
        </div>
        <Link className="button" href="/dashboard/questions/new">
          <Icon name="plus" />
          Ask your audience
        </Link>
      </div>
      {view === "overview" && (
        <div className="metric-grid">
          {stats.map((stat) => (
            <Link className="metric-card" href={stat.href} key={stat.label}>
              <div className="metric-label">
                {stat.label}
                <Icon name={stat.icon} />
              </div>
              <strong>{stat.value.toLocaleString("en-GB")}</strong>
              <span>{stat.detail}</span>
            </Link>
          ))}
        </div>
      )}
      {view !== "questions" && (
        <section className="inbox-link-panel">
          <div>
            <span className="link-emblem">
              <Icon name="link" />
            </span>
            <h2>Your link. Their honest thoughts.</h2>
            <p>
              {account.inboxOpen
                ? "Your inbox is open. Share your link wherever your audience is."
                : "Your inbox is paused. Reopen it in Settings to collect messages."}
            </p>
          </div>
          <CopyLink
            path={`/u/${account.username}/ask`}
            label="Copy inbox link"
          />
        </section>
      )}
      <div
        className={
          view === "overview" ? "overview-columns" : "workspace-content"
        }
      >
        {view !== "questions" && (
          <section className="workspace-section">
            <div className="workspace-section-heading">
              <div>
                <h2>
                  {view === "overview" ? "Recent messages" : "Messages"}
                  <span className="count-chip">{total}</span>
                </h2>
                <p>
                  {view === "overview"
                    ? "The latest things your audience has left unsaid."
                    : "Newest first, with every message private by default."}
                </p>
              </div>
              {view === "overview" && (
                <Link className="text-link" href="/dashboard?view=inbox">
                  View inbox <Icon name="arrow" />
                </Link>
              )}
            </div>
            {view === "inbox" && (
              <Form action="/dashboard" className="filter-row inbox-filters">
                <input type="hidden" name="view" value="inbox" />
                <Picker
                  key={status ?? "ALL"}
                  name="status"
                  label="Message status"
                  defaultValue={status ?? "ALL"}
                  options={[
                    { value: "ALL", label: "All messages" },
                    { value: "PENDING", label: "Awaiting review" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "ARCHIVED", label: "Archived" },
                    { value: "SPAM", label: "Spam" },
                  ]}
                />
                <button className="button secondary">Apply filter</button>
              </Form>
            )}
            <div className="inbox-rows">
              {submissions.map((s) => (
                <article className="inbox-row" key={s.id}>
                  <div className="message-meta">
                    <span
                      className={`status-pill ${s.status === "PENDING" ? "pending" : ""}`}
                    >
                      {s.status === "PENDING"
                        ? "Awaiting review"
                        : s.status.toLowerCase()}
                    </span>
                    <time dateTime={s.createdAt.toISOString()}>
                      {s.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  </div>
                  <p className="message-text message-excerpt">{s.body}</p>
                  <div className="message-footer">
                    <span>
                      {s.questionId ? "Question response" : "Inbox message"} ·{" "}
                      {s.sharingPolicy === "PRIVATE_ONLY"
                        ? "Private only"
                        : s.publicVisible
                          ? "Visibility enabled"
                          : "Hidden"}
                    </span>
                    <ResponseActions response={s} />
                  </div>
                </article>
              ))}
            </div>
            {!submissions.length && (
              <div className="workspace-empty">
                <span className="empty-icon">
                  <Icon name="inbox" />
                </span>
                <h3>
                  {status
                    ? "Nothing in this view yet"
                    : "Good conversations start here"}
                </h3>
                <p>
                  {status
                    ? "Try another status to find your messages."
                    : "Share your inbox link or ask a question. New messages will appear here, just for you."}
                </p>
              </div>
            )}
            {view === "inbox" && (
              <nav className="inbox-pagination" aria-label="Inbox pagination">
                <span>
                  {total
                    ? `${(page - 1) * take + 1}–${Math.min(page * take, total)} of ${total}`
                    : "0 messages"}
                </span>
                <div className="action-row">
                  {page > 1 && (
                    <Link
                      className="button secondary small"
                      href={`?view=inbox&status=${status ?? "ALL"}&page=${page - 1}`}
                    >
                      Previous
                    </Link>
                  )}
                  {page * take < total && (
                    <Link
                      className="button secondary small"
                      href={`?view=inbox&status=${status ?? "ALL"}&page=${page + 1}`}
                    >
                      Next
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </section>
        )}
        {view !== "inbox" && (
          <section className="workspace-section question-section">
            <div className="workspace-section-heading">
              <div>
                <h2>
                  {view === "overview" ? "Your questions" : "Latest questions"}
                </h2>
                <p>
                  {view === "overview"
                    ? "An invitation to say more."
                    : "Latest 50. New answer links start active and hidden."}
                </p>
              </div>
              {view === "overview" && (
                <Link
                  className="text-link"
                  href="/dashboard?view=questions"
                  aria-label="View all questions"
                >
                  <Icon name="arrow" />
                </Link>
              )}
            </div>
            <div
              className={
                view === "questions" ? "question-grid" : "question-rows"
              }
            >
              {questions.map((q) => (
                <article className="question-row" key={q.id}>
                  <div className="message-meta">
                    <span
                      className={`status-pill ${q.linkActive ? "active" : ""}`}
                    >
                      {q.linkActive ? "Active link" : "Inactive link"}
                    </span>
                    <span className="fine">
                      {q.publicVisible ? "Visibility on" : "Hidden"}
                    </span>
                  </div>
                  <p className="message-text message-excerpt">{q.body}</p>
                  <div className="message-footer">
                    <span>
                      {q._count.submissions}{" "}
                      {q._count.submissions === 1 ? "response" : "responses"}
                    </span>
                    <Link
                      className="text-link"
                      href={`/dashboard/questions/${q.id}`}
                    >
                      Manage <Icon name="arrow" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {!questions.length && (
              <div className="workspace-empty">
                <span className="empty-icon">
                  <Icon name="question" />
                </span>
                <h3>What would you like to ask?</h3>
                <p>
                  Give your audience a question and a little room to be honest.
                </p>
                <Link
                  className="button secondary"
                  href="/dashboard/questions/new"
                >
                  Create a question
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
