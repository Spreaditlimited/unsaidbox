"use client";
import { useActionState, useState } from "react";
import { AlertDialog } from "radix-ui";
import { manageUser } from "@/app/admin/user-actions";
import { Captcha, useCaptcha } from "./Captcha";
import type { Result } from "@/app/actions";

export function AdminAccountActions({ id, username, status }: { id: string; username: string; status: string }) {
  return <div className="admin-account-actions">
    <AccountAction id={id} username={username} operation={status === "SUSPENDED" ? "restore" : "suspend"} label={status === "SUSPENDED" ? "Restore account" : "Suspend account"} description={status === "SUSPENDED" ? "Restore access for this user. An unverified email returns the account to pending verification, not active." : "This blocks account access, stops new submissions and signs the user out. Their content is retained."} />
    <AccountAction id={id} username={username} operation="revoke" label="Sign out all sessions" description="Invalidate every current login session for this user. They can sign in again if their account is active. This does not reset their password." />
  </div>;
}
function AccountAction({ id, username, operation, label, description }: { id: string; username: string; operation: string; label: string; description: string }) {
  const [open, setOpen] = useState(false);
  return <AlertDialog.Root open={open} onOpenChange={setOpen}>
    <AlertDialog.Trigger asChild><button className={`button secondary${operation === "suspend" ? " danger" : ""}`} type="button">{label}</button></AlertDialog.Trigger>
    <AlertDialog.Portal><AlertDialog.Overlay className="modal-overlay" /><ActionContent id={id} username={username} operation={operation} label={label} description={description} /></AlertDialog.Portal>
  </AlertDialog.Root>;
}
function ActionContent({ id, username, operation, label, description }: { id: string; username: string; operation: string; label: string; description: string }) {
  const secure = useCaptcha();
  const [result, submit, pending] = useActionState(async (_: Result, form: FormData): Promise<Result> => {
    try { await secure(form, "manageUser"); } catch { return { error: "The security check could not connect. Please try again." }; }
    return manageUser(id, operation, {}, form);
  }, {});
  return <AlertDialog.Content className="app-modal" onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}>
    <AlertDialog.Title className="modal-title">{label}?</AlertDialog.Title>
    <AlertDialog.Description className="modal-description">{description}</AlertDialog.Description>
    {result.success ? <><p role="status" className="action-status">{result.success}</p><div className="modal-actions"><AlertDialog.Cancel asChild><button className="button">Done</button></AlertDialog.Cancel></div></> :
      <form action={submit} className="modal-form"><fieldset disabled={pending}><label>Type @{username} to confirm<input name="confirmation" required autoComplete="off" spellCheck={false} /></label></fieldset>
        {result.error && <p className="form-error" role="alert">{result.error}</p>}<Captcha />
        <div className="modal-actions"><AlertDialog.Cancel asChild><button className="button secondary" type="button" disabled={pending}>Cancel</button></AlertDialog.Cancel><button className={`button${operation === "suspend" ? " destructive" : ""}`} type="submit" disabled={pending}>{pending ? "Saving…" : label}</button></div>
      </form>}
  </AlertDialog.Content>;
}
