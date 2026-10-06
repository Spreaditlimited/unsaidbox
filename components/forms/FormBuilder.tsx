"use client";
import { useActionState, useEffect, useState } from "react";
import { AlertDialog } from "radix-ui";
import { saveFeedbackForm } from "@/app/dashboard/forms/actions";
import { Captcha, useCaptcha } from "@/components/Captcha";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilePicker } from "@/components/ui/FilePicker";
import type { Result } from "@/app/actions";
import type { FeedbackDefinition, FormQuestion } from "@/lib/form-templates";
import { QuestionFields } from "./QuestionFields";
import { FORM_THEMES } from "@/lib/form-policy.mjs";

export function FormBuilder({
  initial,
  id = null,
  revision = 0,
  locked = false,
  hasImage = false,
}: {
  initial: FeedbackDefinition;
  id?: string | null;
  revision?: number;
  locked?: boolean;
  hasImage?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const previewImage =
    imageUrl ||
    (!removeImage && hasImage && id
      ? `/f/${id}/image?preview=1&v=${revision}`
      : "");
  const secure = useCaptcha();
  const [state, submit, pending] = useActionState(
    async (previous: Result, form: FormData) => {
      if (image) form.set("image", image);
      try {
        await secure(form, "saveFeedbackForm");
      } catch {
        setConfirm(false);
        return {
          error: "The security check could not connect. Please try again.",
        };
      }
      const result = await saveFeedbackForm(id, previous, form);
      setConfirm(false);
      return result;
    },
    {},
  );
  useEffect(() => {
    try {
      sessionStorage.removeItem("unsaidbox:template");
    } catch {}
  }, []);
  useEffect(() => {
    if (!image) {
      setImageUrl("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  function updateQuestion(index: number, patch: Partial<FormQuestion>) {
    setData((d) => ({
      ...d,
      questions: d.questions.map((q, n) =>
        n === index ? { ...q, ...patch } : q,
      ),
    }));
  }
  function add(type: FormQuestion["type"]) {
    setData((d) => ({
      ...d,
      questions: [
        ...d.questions,
        {
          id:
            globalThis.crypto?.randomUUID?.() ??
            `q${Date.now()}${Math.random().toString(36).slice(2)}`,
          label: "",
          type,
          required: false,
          options: type === "CHOICE" ? ["Option 1", "Option 2"] : [],
        },
      ],
    }));
  }
  function move(index: number, direction: number) {
    setData((d) => {
      const questions = [...d.questions];
      [questions[index], questions[index + direction]] = [
        questions[index + direction],
        questions[index],
      ];
      return { ...d, questions };
    });
  }
  return (
    <div className="feedback-builder">
      <div className="feedback-mobile-tabs">
        <button
          className="button secondary"
          aria-pressed={!preview}
          onClick={() => setPreview(false)}
        >
          Edit form
        </button>
        <button
          className="button secondary"
          aria-pressed={preview}
          onClick={() => setPreview(true)}
        >
          Live preview
        </button>
      </div>
      <form
        id="feedback-editor"
        action={submit}
        onReset={(e) => e.preventDefault()}
        className={`feedback-editor ${preview ? "feedback-mobile-hidden" : ""}`}
      >
        <fieldset disabled={pending}>
          <input
            type="hidden"
            name="questions"
            value={JSON.stringify(data.questions)}
          />
          <input type="hidden" name="revision" value={revision} />
          <input type="hidden" name="templateId" value={data.templateId} />
          <input type="hidden" name="theme" value={data.theme} />
          <section className="panel feedback-edit-section">
            <span className="eyebrow">01 / SET THE SCENE</span>
            <h2>Make it feel like you.</h2>
            <p className="fine">A warm welcome makes honest answers easier.</p>
            <label>
              Form title
              <input
                name="title"
                required
                maxLength={160}
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
              />
            </label>
            <label>
              A short introduction
              <textarea
                name="description"
                rows={3}
                maxLength={600}
                value={data.description}
                onChange={(e) =>
                  setData({ ...data, description: e.target.value })
                }
              />
            </label>
            <fieldset>
              <legend>Colour palette</legend>
              <div className="feedback-palettes">
                {FORM_THEMES.map((theme) => (
                  <button
                    type="button"
                    key={theme}
                    className={`feedback-theme-${theme}`}
                    aria-pressed={data.theme === theme}
                    onClick={() => setData({ ...data, theme })}
                  >
                    <i />
                    {theme}
                  </button>
                ))}
              </div>
            </fieldset>
            <FilePicker
              onChoose={(file) => {
                if (
                  file.size > 2 * 1024 * 1024 ||
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                ) {
                  setImageError(
                    "Choose a JPG, PNG or WebP image smaller than 2 MB.",
                  );
                  return;
                }
                setImageError("");
                setImage(file);
                setRemoveImage(false);
              }}
              disabled={pending}
              label="Choose form logo or photo"
              help="Optional. JPG, PNG or WebP, up to 2 MB. This image will be visible to anyone with your active form link."
            />
            {imageError && (
              <p className="form-error" role="alert">
                {imageError}
              </p>
            )}
            {image && (
              <p className="fine">
                Selected: {image.name}{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setImage(null)}
                >
                  Cancel upload
                </button>
              </p>
            )}
            {hasImage && (
              <Checkbox
                name="removeImage"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
              >
                Remove existing form image
              </Checkbox>
            )}
          </section>
          <section className="panel feedback-edit-section">
            <span className="eyebrow">02 / ASK SOMETHING GOOD</span>
            <h2>
              Your questions{" "}
              <span className="feedback-count">{data.questions.length}/12</span>
            </h2>
            {locked && (
              <p className="notice">
                Questions and sharing permissions are locked after publishing to
                protect your results. Duplicate the form to make a new version.
              </p>
            )}
            <div className="feedback-question-editors">
              {data.questions.map((q, i) => (
                <fieldset
                  className="feedback-question-editor"
                  key={q.id}
                  disabled={locked}
                >
                  <div className="feedback-question-toolbar">
                    <span className="eyebrow">
                      QUESTION {String(i + 1).padStart(2, "0")} ·{" "}
                      {q.type === "TEXT"
                        ? "Written answer"
                        : q.type === "RATING"
                          ? "Rating"
                          : "Single choice"}
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={locked || i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Move question ${i + 1} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={locked || i === data.questions.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Move question ${i + 1} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={locked || data.questions.length === 1}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            questions: d.questions.filter((_, n) => n !== i),
                          }))
                        }
                        aria-label={`Remove question ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <label>
                    Question wording
                    <input
                      value={q.label}
                      required
                      maxLength={240}
                      placeholder="What would you like to know?"
                      onChange={(e) =>
                        updateQuestion(i, { label: e.target.value })
                      }
                    />
                  </label>
                  {q.type === "CHOICE" && (
                    <div className="feedback-option-editor">
                      {q.options.map((option, n) => (
                        <div key={n}>
                          <label>
                            Option {n + 1}
                            <input
                              required
                              maxLength={100}
                              value={option}
                              onChange={(e) =>
                                updateQuestion(i, {
                                  options: q.options.map((v, k) =>
                                    k === n ? e.target.value : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="button secondary small"
                            disabled={q.options.length <= 2}
                            aria-label={`Remove option ${n + 1}`}
                            onClick={() =>
                              updateQuestion(i, {
                                options: q.options.filter((_, k) => k !== n),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="button secondary small"
                        disabled={q.options.length >= 8}
                        onClick={() =>
                          updateQuestion(i, { options: [...q.options, ""] })
                        }
                      >
                        + Add option
                      </button>
                    </div>
                  )}
                  <Checkbox
                    checked={q.required}
                    onChange={(e) =>
                      updateQuestion(i, { required: e.target.checked })
                    }
                  >
                    Require an answer
                  </Checkbox>
                </fieldset>
              ))}
            </div>
            {!locked && (
              <div
                className="feedback-add-questions"
                aria-label="Add a question"
              >
                {(["TEXT", "CHOICE", "RATING"] as const).map((type) => (
                  <button
                    type="button"
                    className="button secondary"
                    key={type}
                    disabled={data.questions.length >= 12}
                    onClick={() => add(type)}
                  >
                    +{" "}
                    {type === "TEXT"
                      ? "Text"
                      : type === "CHOICE"
                        ? "Choice"
                        : "Rating"}
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="panel feedback-edit-section">
            <span className="eyebrow">03 / CLOSE WITH CARE</span>
            <h2>A thoughtful finish.</h2>
            <label>
              Thank-you message
              <textarea
                name="thankYou"
                required
                maxLength={300}
                rows={3}
                value={data.thankYou}
                onChange={(e) => setData({ ...data, thankYou: e.target.value })}
              />
            </label>
            <input
              type="hidden"
              name="allowSharing"
              value={data.allowSharing ? "on" : "off"}
            />
            <Checkbox
              checked={data.allowSharing}
              disabled={locked}
              onChange={(e) =>
                setData({ ...data, allowSharing: e.target.checked })
              }
            >
              Let respondents optionally permit public sharing of their answers.
            </Checkbox>
            <p className="fine">
              Off means private-only. When on, each person can still decline.
              Nothing is automatically published, and these permissions lock
              when you first publish.
            </p>
          </section>
        </fieldset>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <Captcha />
        <div className="feedback-savebar">
          <span className="fine">
            {locked
              ? "Your existing share link stays the same."
              : "Private draft until you publish."}
          </span>
          <button
            className="button secondary"
            name="operation"
            value="draft"
            disabled={pending}
          >
            {pending ? "Saving…" : locked ? "Save changes" : "Save draft"}
          </button>
          {!locked && (
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={(e) => {
                if (e.currentTarget.form?.reportValidity()) setConfirm(true);
              }}
            >
              Publish form ↗
            </button>
          )}
        </div>
        <AlertDialog.Root
          open={confirm}
          onOpenChange={(value) => {
            if (!pending) setConfirm(value);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="modal-overlay" />
            <AlertDialog.Content className="app-modal">
              <AlertDialog.Title className="modal-title">
                Ready for honest answers?
              </AlertDialog.Title>
              <AlertDialog.Description className="modal-description">
                Publishing activates your shareable link. Your form will not
                appear in Explore or your public profile. Questions and sharing
                permissions will lock; you can duplicate the form later to
                change them.
              </AlertDialog.Description>
              <div className="modal-actions">
                <AlertDialog.Cancel asChild>
                  <button className="button secondary" disabled={pending}>
                    Keep editing
                  </button>
                </AlertDialog.Cancel>
                <button
                  className="button"
                  form="feedback-editor"
                  name="operation"
                  value="publish"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? "Publishing…" : "Publish & get link"}
                </button>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </form>
      <aside
        className={`feedback-live-preview ${!preview ? "feedback-mobile-hidden" : ""}`}
      >
        <div className="feedback-preview-top">
          <span className="eyebrow">LIVE PREVIEW</span>
          <span className="fine">What your audience sees</span>
        </div>
        <div className={`feedback-sheet feedback-theme-${data.theme}`}>
          <header className="feedback-sheet-header">
            {previewImage ? (
              <img
                src={previewImage}
                className="feedback-logo"
                alt="Your chosen form branding"
              />
            ) : (
              <span className="feedback-logo">✧</span>
            )}
            <p className="eyebrow">A SPACE FOR HONESTY</p>
            <h2>{data.title || "Your form title"}</h2>
            <p>{data.description}</p>
            <span className="feedback-private-pill">No name. No sign-in.</span>
          </header>
          <div className="feedback-sheet-body">
            <QuestionFields
              key={JSON.stringify(data.questions.map((q) => q.type))}
              questions={data.questions}
              preview
            />
            <button className="button full" type="button" disabled>
              Send response
            </button>
            <p className="fine">Preview only · answers here are not saved</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
