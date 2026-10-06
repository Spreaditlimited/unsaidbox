import { Checkbox } from "@/components/ui/Checkbox";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { canShareResponse } from "@/lib/publishing.mjs";
import { DashboardShell } from "@/components/DashboardShell";
import { ActionForm, DeleteForm } from "@/components/ActionForm";
import { saveResponse, deleteResponse } from "@/app/actions";
import { Picker } from "@/components/ui/Picker";
export default async function Response({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireAccount();
  const { id } = await params;
  const s = await db().submission.findFirst({ where: { id, accountId: a.id } });
  if (!s) notFound();
  return (
    <DashboardShell
      accountId={a.id}
      name={a.displayName}
    >
      <h1>Review response.</h1>
      <section className="panel editor-panel">
        <span className="badge">
          {s.sharingPolicy === "PRIVATE_ONLY"
            ? "PRIVATE ONLY"
            : "OWNER MAY SHARE"}
        </span>
        <h2>Original message</h2>
        <p className="message-text">{s.body}</p>
        <ActionForm
          action={saveResponse.bind(null, id)}
          label="Save response"
          captchaAction="saveResponse"
        >
          <Picker
            key={s.status}
            name="status"
            label="Status"
            defaultValue={s.status}
            options={[
              { value: "PENDING", label: "Awaiting review" },
              { value: "APPROVED", label: "Approved" },
              { value: "ARCHIVED", label: "Archived" },
              { value: "SPAM", label: "Spam" },
            ]}
          />
          <label>
            Shared version · optional
            <textarea
              name="publicBody"
              defaultValue={s.publicBody ?? ""}
              maxLength={5000}
            />
          </label>
          <p className="fine">
            Remove identifying details here without changing the original. Leave
            blank to use the original text.
          </p>
          <label>
            Your reply · optional
            <textarea
              name="ownerReply"
              defaultValue={s.ownerReply ?? ""}
              maxLength={5000}
            />
          </label>
          <Checkbox
            name="publicVisible"
            defaultChecked={s.publicVisible}
            disabled={s.sharingPolicy === "PRIVATE_ONLY"}
          >
            Make this approved response publicly visible
          </Checkbox>
          <p className="fine">
            Your public page must be enabled. Question answers also require a
            visible, active question. Saving does not post to Facebook.
          </p>
        </ActionForm>
        <div className="action-row">
          {canShareResponse(s) && (
            <Link className="button" href={`/dashboard/responses/${id}/share`}>
              Share response
            </Link>
          )}
          <Link className="button secondary" href="/dashboard">
            Back to inbox
          </Link>
        </div>
      </section>
      <section className="panel editor-panel">
        <h2>Delete response</h2>
        <p>Turn public visibility off and save before deleting.</p>
        <DeleteForm
          action={deleteResponse.bind(null, id)}
          description="This response will be permanently removed."
        />
      </section>
    </DashboardShell>
  );
}
