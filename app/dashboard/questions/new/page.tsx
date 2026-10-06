import { Checkbox } from "@/components/ui/Checkbox";
import { requireAccount } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { createQuestion } from "@/app/actions";
export default async function NewQuestion() {
  const a = await requireAccount();
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <h1>Ask your audience.</h1>
      <section className="panel editor-panel">
        <ActionForm
          action={createQuestion}
          label="Create answer link"
          captchaAction="createQuestion"
        >
          <label>
            Your question
            <textarea name="body" required maxLength={5000} rows={5} />
          </label>
          <Checkbox name="privateOnly">
            Promise that answers stay private-only.
          </Checkbox>
          <p className="fine">
            The link will accept answers immediately, with public visibility
            off. No Facebook link is required. The sharing promise cannot be
            loosened later.
          </p>
        </ActionForm>
      </section>
    </DashboardShell>
  );
}
