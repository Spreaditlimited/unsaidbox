"use client";
import Link from "next/link";
import { useState } from "react";
import { Dialog } from "radix-ui";
import { formTemplates } from "@/lib/form-templates";
import { QuestionFields } from "./QuestionFields";
export function TemplateGallery() {
  const [category, setCategory] = useState("All templates");
  function remember(id: string) {
    try {
      sessionStorage.setItem("unsaidbox:template", id);
    } catch {}
  }
  return (
    <>
      <div className="feedback-filters" aria-label="Template categories">
        {["All templates", "Creators", "Education", "Community"].map((c) => (
          <button
            type="button"
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="feedback-template-grid">
        {formTemplates
          .filter(
            (t) => category === "All templates" || t.category === category,
          )
          .map((t, i) => (
            <article
              key={t.templateId}
              className={`feedback-template feedback-theme-${t.theme}`}
            >
              <div className="feedback-template-art" aria-hidden="true">
                <span className="feedback-art-mark">
                  {t.category === "Education"
                    ? "✧"
                    : t.category === "Community"
                      ? "◎"
                      : "“"}
                </span>
                <div className="feedback-art-paper">
                  <span>SPACE FOR HONESTY</span>
                  <strong>{t.name}</strong>
                  <i />
                  <i />
                  <div>1　2　3　4　5</div>
                </div>
                <span className="feedback-art-index">0{i + 1}</span>
              </div>
              <div className="feedback-template-copy">
                <span className="eyebrow">
                  {t.category} · {t.questions.length} questions
                </span>
                <h2>{t.name}</h2>
                <p>{t.summary}</p>
                <div className="feedback-template-actions">
                  <Link
                    className="button"
                    href={`/dashboard/forms/new?template=${t.templateId}`}
                    onClick={() => remember(t.templateId)}
                  >
                    Use template <span aria-hidden="true">↗</span>
                  </Link>
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <button type="button" className="button secondary">
                        Preview
                      </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="modal-overlay" />
                      <Dialog.Content
                        className={`app-modal feedback-template-modal feedback-theme-${t.theme}`}
                      >
                        <div className="feedback-preview-top">
                          <span className="eyebrow">TEMPLATE PREVIEW</span>
                          <Dialog.Close asChild>
                            <button
                              className="button secondary small"
                              aria-label="Close preview"
                            >
                              ×
                            </button>
                          </Dialog.Close>
                        </div>
                        <Dialog.Title className="modal-title">
                          {t.title}
                        </Dialog.Title>
                        <Dialog.Description className="modal-description">
                          {t.description}
                        </Dialog.Description>
                        <QuestionFields questions={t.questions} preview />
                        <p className="fine">
                          Preview only. Nothing entered here is saved or sent.
                        </p>
                        <Link
                          className="button full"
                          href={`/dashboard/forms/new?template=${t.templateId}`}
                          onClick={() => remember(t.templateId)}
                        >
                          Make this template yours
                        </Link>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
