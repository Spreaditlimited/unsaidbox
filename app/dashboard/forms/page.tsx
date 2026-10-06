import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";
export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const a = await requireAccount();
  const params = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(params.page) || 1)),
  );
  const [forms, total] = await Promise.all([
    db().feedbackForm.findMany({
      where: { accountId: a.id },
      select: {
        id: true,
        title: true,
        description: true,
        theme: true,
        locked: true,
        linkActive: true,
        acceptingResponses: true,
        blocked: true,
        responseCount: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      skip: (page - 1) * 20,
    }),
    db().feedbackForm.count({ where: { accountId: a.id } }),
  ]);
  return (
    <DashboardShell accountId={a.id} name={a.displayName} section="forms">
      <div className="app-heading">
        <div className="feedback-page-heading">
          <span className="eyebrow">YOUR SPACE TO LISTEN</span>
          <h1>Forms & feedback.</h1>
          <p>Ask thoughtfully. Listen privately. Share with intention.</p>
        </div>
        <Link className="button" href="/dashboard/forms/new">
          + Create a form
        </Link>
      </div>
      {!forms.length ? (
        <section className="panel feedback-empty">
          <span className="feedback-empty-mark">✧</span>
          <h2>Good answers start here.</h2>
          <p>
            Turn a template into your own anonymous feedback form.
            <br />
            No complicated setup. Just the questions that matter.
          </p>
          <Link className="button" href="/dashboard/forms/new">
            Explore templates →
          </Link>
        </section>
      ) : (
        <div className="feedback-form-list">
          {forms.map((f) => (
            <Link
              className={`panel feedback-form-tile feedback-theme-${f.theme}`}
              href={`/dashboard/forms/${f.id}`}
              key={f.id}
            >
              <span className="feedback-tile-mark" aria-hidden="true">
                ✧
              </span>
              <div>
                <span
                  className={`feedback-status ${f.linkActive && f.acceptingResponses && !f.blocked ? "is-open" : ""}`}
                >
                  {f.blocked
                    ? "Paused by admin"
                    : !f.locked
                      ? "Draft"
                      : !f.linkActive
                        ? "Link disabled"
                        : f.acceptingResponses
                          ? "Accepting responses"
                          : "Responses paused"}
                </span>
                <h2>{f.title}</h2>
                <p>{f.description}</p>
                <span className="fine">
                  {f.responseCount}{" "}
                  {f.responseCount === 1 ? "response" : "responses"} · Private
                  results
                </span>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
      <div className="action-row">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/dashboard/forms?page=${page - 1}`}
          >
            Previous
          </Link>
        )}
        {page * 20 < total && (
          <Link
            className="button secondary"
            href={`/dashboard/forms?page=${page + 1}`}
          >
            Next
          </Link>
        )}
      </div>
    </DashboardShell>
  );
}
