"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Checkbox } from "@/components/ui/Checkbox";
import { QuestionFields } from "./QuestionFields";
import { submitFeedbackForm } from "@/app/dashboard/forms/actions";
import type { FormQuestion } from "@/lib/form-templates";
export function RespondForm({
  id,
  revision,
  questions,
  allowSharing,
  requestKey,
}: {
  id: string;
  revision: number;
  questions: FormQuestion[];
  allowSharing: boolean;
  requestKey: string;
}) {
  const [share, setShare] = useState(false);
  return (
    <ActionForm
      action={submitFeedbackForm.bind(null, id)}
      label="Send response →"
      captchaAction="submitFeedbackForm"
      sentScreen
      successTitle="Thank you for being honest."
    >
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <div className="feedback-honeypot" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <QuestionFields questions={questions} />
      <div className="feedback-privacy">
        <strong>Your words, handled with care.</strong>
        <p>
          No name, email or account is requested. The owner receives your
          answers without a sender profile. Avoid identifying details in your
          text. UnsaidBox and its security providers process technical data to
          operate and protect the service.
        </p>
        <Checkbox name="privacy" required>
          I understand the{" "}
          <a href="/safety" target="_blank" rel="noopener noreferrer">
            privacy information
          </a>
          .
        </Checkbox>
        {allowSharing ? (
          <Checkbox
            name="shareAllowed"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
          >
            The owner may share my answers publicly without my name.
            Optional—leave unchecked to keep them private.
          </Checkbox>
        ) : (
          <p className="fine">
            This form is private-only. The owner cannot use UnsaidBox’s sharing
            tools for these answers.
          </p>
        )}
      </div>
    </ActionForm>
  );
}
