import { ActionForm } from "./ActionForm";
import { reportContent } from "@/app/actions";
export function ReportForm({
  questionId = null,
  submissionId = null,
}: {
  questionId?: string | null;
  submissionId?: string | null;
}) {
  return (
    <details className="source-details">
      <summary>Report this content</summary>
      <ActionForm
        action={reportContent.bind(null, questionId, submissionId)}
        label="Send report"
        captchaAction="reportContent"
      >
        <label>
          Why are you reporting this?
          <textarea name="reason" required minLength={10} maxLength={1000} />
        </label>
        <p className="fine">Do not include private contact information.</p>
      </ActionForm>
    </details>
  );
}
