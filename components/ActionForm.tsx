"use client";
import { useActionState, useEffect, useRef } from "react";
import { Captcha, useCaptcha } from "./Captcha";
import type { Result } from "@/app/actions";
import { AlertDialog } from "radix-ui";
type Props = {
  action: (state: Result, data: FormData) => Promise<Result>;
  children: React.ReactNode;
  label: string;
  sentScreen?: boolean;
  successTitle?: string;
  captchaAction: string;
};
export function ActionForm({
  action,
  children,
  label,
  sentScreen = false,
  successTitle = "Message received",
  captchaAction,
}: Props) {
  const preserveFields = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedData = useRef<FormData | null>(null);
  const secure = useCaptcha();
  const [state, submit, pending] = useActionState(
    async (previous: Result, data: FormData) => {
      submittedData.current = data;
      let result: Result;
      try {
        await secure(data, captchaAction);
      } catch {
        preserveFields.current = true;
        return {
          error:
            "The security check could not connect. Please try again or check your connection.",
        };
      }
      result = await action(previous, data);
      preserveFields.current = Boolean(result.error);
      return result;
    },
    {},
  );
  useEffect(() => {
    if (!state.error || !submittedData.current || !formRef.current) return;
    // React resets uncontrolled forms after an action resolves, even when the
    // action returns a validation error. Restore the draft after that commit.
    for (const field of Array.from(formRef.current.elements)) {
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        ) ||
        !field.name
      )
        continue;
      const saved = submittedData.current.get(field.name);
      if (
        field instanceof HTMLInputElement &&
        (["password", "file", "hidden"].includes(field.type) ||
          field.dataset.sensitive === "true")
      )
        continue;
      if (
        field instanceof HTMLInputElement &&
        ["checkbox", "radio"].includes(field.type)
      )
        field.checked = submittedData.current
          .getAll(field.name)
          .includes(field.value);
      else if (typeof saved === "string") field.value = saved;
    }
  }, [state]);
  if (sentScreen && state.success)
    return (
      <div className="success-message" role="status">
        <h2>{successTitle}</h2>
        <p>{state.success}</p>
        <p className="fine">You can close this page now.</p>
      </div>
    );
  return (
    <form
      ref={formRef}
      action={submit}
      className="app-form"
      onReset={(event) => {
        if (preserveFields.current) event.preventDefault();
      }}
    >
      <fieldset disabled={pending}>
        {children}
        <Captcha />
      </fieldset>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Please wait…" : label}
      </button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="action-status" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
export function DeleteForm({
  action,
  description,
}: {
  action: Props["action"];
  description: string;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button type="button" className="button secondary danger">
          Delete permanently
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-overlay" />
        <DeleteModalContent action={action} description={description} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DeleteModalContent({
  action,
  description,
}: {
  action: Props["action"];
  description: string;
}) {
  const secure = useCaptcha();
  const [state, submit, pending] = useActionState(
    async (previous: Result, form: FormData) => {
      try {
        await secure(form, "delete");
      } catch {
        return {
          error: "The security check could not connect. Please try again.",
        };
      }
      return await action(previous, form);
    },
    {},
  );
  return (
    <AlertDialog.Content
      className="app-modal"
      onEscapeKeyDown={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className="modal-danger-icon" aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </svg>
      </div>
      <AlertDialog.Title className="modal-title">
        Delete permanently?
      </AlertDialog.Title>
      <AlertDialog.Description className="modal-description">
        {description} This cannot be undone.
      </AlertDialog.Description>
      <form action={submit} className="modal-form" noValidate>
        <fieldset disabled={pending}>
          <label>
            Type DELETE to confirm
            <input
              name="confirm"
              required
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </fieldset>
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <Captcha />
        <div className="modal-actions">
          <AlertDialog.Cancel asChild>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
            >
              Cancel
            </button>
          </AlertDialog.Cancel>
          <button
            type="submit"
            className="button destructive"
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </form>
    </AlertDialog.Content>
  );
}
