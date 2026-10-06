"use client";
import type { FormQuestion } from "@/lib/form-templates";
export function QuestionFields({
  questions,
  preview = false,
}: {
  questions: FormQuestion[];
  preview?: boolean;
}) {
  return (
    <div className="feedback-fields">
      {questions.map((q, i) => (
        <fieldset className="feedback-question" key={q.id}>
          <legend>
            <span className="feedback-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            {q.label || "Your question"}
            <span className="feedback-optional">
              {q.required ? "Required" : "Optional"}
            </span>
          </legend>
          {q.type === "TEXT" ? (
            <textarea
              aria-label={q.label || "Your question"}
              name={`answer:${q.id}`}
              required={!preview && q.required}
              maxLength={3000}
              rows={4}
              placeholder="Your honest thoughts…"
            />
          ) : q.type === "RATING" ? (
            <>
              <div className="feedback-ratings">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n}>
                    <input
                      type="radio"
                      name={`answer:${q.id}`}
                      value={n}
                      required={!preview && q.required}
                    />
                    <span>{n}</span>
                  </label>
                ))}
              </div>
              <div className="feedback-scale">
                <span>1 · Lowest</span>
                <span>5 · Highest</span>
              </div>
            </>
          ) : (
            <div className="feedback-options">
              {q.options.map((option, n) => (
                <label key={n}>
                  <input
                    type="radio"
                    name={`answer:${q.id}`}
                    value={option}
                    required={!preview && q.required}
                  />
                  <span>{option || `Option ${n + 1}`}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
