export class FormInputError extends Error {}
export const FORM_LIMITS = { questions: 12, options: 8, answer: 3000 };
export const FORM_THEMES = ["lavender", "sage", "sand"];
const text = (value, name, max, min = 1) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new FormInputError(`${name} must be ${min}–${max} characters.`);
  return value.trim();
};
export function parseQuestions(input) {
  let items;
  try {
    items = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    throw new FormInputError("The questions could not be read.");
  }
  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > FORM_LIMITS.questions
  )
    throw new FormInputError("Add between 1 and 12 questions.");
  const ids = new Set();
  return items.map((q, index) => {
    if (
      !q ||
      typeof q !== "object" ||
      typeof q.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,50}$/.test(q.id) ||
      ids.has(q.id)
    )
      throw new FormInputError("Each question needs a unique identifier.");
    ids.add(q.id);
    if (!["TEXT", "CHOICE", "RATING"].includes(q.type))
      throw new FormInputError("Choose a supported question type.");
    if (typeof q.required !== "boolean")
      throw new FormInputError("Choose whether each question is required.");
    const options =
      q.type === "CHOICE" && Array.isArray(q.options)
        ? q.options.map((o) => text(o, "Option", 100))
        : [];
    if (
      q.type === "CHOICE" &&
      (options.length < 2 ||
        options.length > FORM_LIMITS.options ||
        new Set(options.map((o) => o.toLowerCase())).size !== options.length)
    )
      throw new FormInputError(
        "Single-choice questions need 2–8 different options.",
      );
    return {
      id: q.id,
      label: text(q.label, `Question ${index + 1}`, 240),
      type: q.type,
      required: q.required,
      options,
    };
  });
}
export function readFeedbackForm(form) {
  const raw = form.get("questions");
  if (typeof raw !== "string" || raw.length > 30000)
    throw new FormInputError("The question list is too large.");
  const theme = form.get("theme");
  if (!FORM_THEMES.includes(theme))
    throw new FormInputError("Choose a form colour.");
  return {
    title: text(form.get("title"), "Title", 160),
    description: text(form.get("description") ?? "", "Introduction", 600, 0),
    thankYou: text(form.get("thankYou"), "Thank-you message", 300),
    questions: parseQuestions(raw),
    theme,
    allowSharing: form.get("allowSharing") === "on",
  };
}
export function readAnswers(questions, form) {
  const parsed = parseQuestions(questions);
  const validKeys = new Set(parsed.map((q) => `answer:${q.id}`));
  for (const key of form.keys())
    if (key.startsWith("answer:") && !validKeys.has(key))
      throw new FormInputError(
        "This form changed. Reload it before responding.",
      );
  const answers = [];
  for (const q of parsed) {
    const values = form.getAll(`answer:${q.id}`);
    if (values.length > 1)
      throw new FormInputError("Choose only one answer per question.");
    const value = values[0] ?? "";
    if (typeof value !== "string")
      throw new FormInputError("Only text answers are accepted.");
    const clean = value.trim();
    if (!clean && !q.required) continue;
    if (!clean) throw new FormInputError(`Please answer: ${q.label}`);
    if (q.type === "TEXT") text(clean, "Answer", FORM_LIMITS.answer);
    if (q.type === "CHOICE" && !q.options.includes(clean))
      throw new FormInputError("Select one of the available options.");
    if (q.type === "RATING" && !/^[1-5]$/.test(clean))
      throw new FormInputError("Choose a rating from 1 to 5.");
    answers.push({
      questionId: q.id,
      label: q.label,
      type: q.type,
      textValue: q.type === "RATING" ? null : clean,
      numberValue: q.type === "RATING" ? Number(clean) : null,
    });
  }
  if (!answers.length)
    throw new FormInputError("Please answer at least one question.");
  return answers;
}
export function assertFormAccepting(form) {
  if (
    !form ||
    !form.linkActive ||
    !form.acceptingResponses ||
    form.blocked ||
    form.account.status !== "ACTIVE"
  )
    throw new FormInputError("This form is not accepting responses right now.");
}
export function canShareFormAnswer(entry) {
  return Boolean(
    entry?.shareAllowed &&
      entry.form?.allowSharing &&
      !entry.form?.blocked &&
      entry.form?.account?.status === "ACTIVE",
  );
}
