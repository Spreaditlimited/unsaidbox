import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/AdminShell";
import { ActionForm } from "@/components/ActionForm";
import { moderate } from "@/app/actions";
import { Picker } from "@/components/ui/Picker";
export default async function Admin() {
  const a = await requireAdministrator();
  const [questions, reports] = await Promise.all([
    db().question.findMany({
      where: {
        discoverable: true,
        discoveryApproved: false,
        publicVisible: true,
        linkActive: true,
        account: { status: "ACTIVE", publicPageEnabled: true },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db().report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

  ]);
  return (
    <AdminShell name={a.displayName}>
      <header className="admin-heading"><div><p className="admin-eyebrow">COMMUNITY SAFETY</p><h1>Moderation</h1></div></header>
      <p className="notice">
        Private inboxes are not listed here. Review discovery requests and
        public-content reports. All moderation changes are recorded. Each queue
        shows its latest 50 items; completing reviews brings older items into view.
      </p>
      <section className="dashboard-section">
        <h2>Explore requests</h2>
        <div className="response-list">
          {questions.map((q) => (
            <section className="panel" key={q.id}>
              <p className="message-text">{q.body}</p>
              <ActionForm
                action={moderate.bind(null, "question", q.id)}
                label="Apply decision"
                captchaAction="moderate"
              >
                <Picker
                  name="operation"
                  label="Decision"
                  defaultValue="approve"
                  options={[
                    { value: "approve", label: "Approve for Explore" },
                    { value: "hide", label: "Hide from public view" },
                  ]}
                />
              </ActionForm>
            </section>
          ))}
        </div>
        {!questions.length && <p>All caught up. No questions are waiting for discovery approval.</p>}
      </section>
      <section className="dashboard-section">
        <h2>Reports</h2>
        {reports.map((r) => (
          <section className="panel" key={r.id}>
            <p className="message-text">{r.reason}</p>
            <p className="fine">Content ID: {r.questionId ?? r.submissionId}</p>
            <ActionForm
              action={moderate.bind(null, "report", r.id)}
              label="Apply decision"
              captchaAction="moderate"
            >
              <Picker
                name="operation"
                label="Decision"
                defaultValue="hide"
                options={[
                  { value: "hide", label: "Hide content and resolve" },
                  { value: "resolve", label: "Resolve without hiding" },
                ]}
              />
            </ActionForm>
          </section>
        ))}
        {!reports.length && <p>All caught up. No open reports need review.</p>}
      </section>
    </AdminShell>
  );
}
