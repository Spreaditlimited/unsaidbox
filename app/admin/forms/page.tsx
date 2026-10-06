import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/AdminShell";
import { ActionForm } from "@/components/ActionForm";
import { moderateFeedbackForm } from "./actions";
import "@/app/forms.css";
export default async function AdminFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdministrator();
  const search = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(search.page) || 1)),
  );
  const [forms, total] = await Promise.all([
    db().feedbackForm.findMany({
      select: {
        id: true,
        account: { select: { id: true, username: true } },
        blocked: true,
        locked: true,
        linkActive: true,
        responseCount: true,
        revision: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
      skip: (page - 1) * 25,
    }),
    db().feedbackForm.count(),
  ]);
  return (
    <AdminShell name={admin.displayName}>
      <div className="feedback-page-heading">
        <span className="eyebrow">PLATFORM OVERSIGHT</span>
        <h1>Forms & feedback.</h1>
        <p>
          {total} forms. Review usage and pause abusive collection links.
          Private questions and answers are not exposed here.
        </p>
      </div>
      <div className="feedback-entry-list">
        {forms.map((f) => (
          <section className="panel feedback-entry" key={f.id}>
            <header>
              <Link href={`/admin/users/${f.account.id}`}>
                @{f.account.username}
              </Link>
              <span className="fine">
                {f.id} · {f.responseCount} responses ·{" "}
                {f.blocked
                  ? "Blocked"
                  : !f.locked
                    ? "Draft"
                    : f.linkActive
                      ? "Link active"
                      : "Link disabled"}
              </span>
            </header>
            <ActionForm
              action={moderateFeedbackForm.bind(null, f.id)}
              label={f.blocked ? "Remove restriction" : "Pause form"}
              captchaAction="moderateFeedbackForm"
            >
              <input
                type="hidden"
                name="operation"
                value={f.blocked ? "unblock" : "block"}
              />
              <input type="hidden" name="revision" value={f.revision} />
            </ActionForm>
          </section>
        ))}
      </div>
      {!forms.length && <p className="notice">No forms yet.</p>}
      <div className="action-row">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/admin/forms?page=${page - 1}`}
          >
            Previous
          </Link>
        )}
        {page * 25 < total && (
          <Link
            className="button secondary"
            href={`/admin/forms?page=${page + 1}`}
          >
            Next
          </Link>
        )}
      </div>
    </AdminShell>
  );
}
