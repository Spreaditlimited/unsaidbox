export const plans = Object.freeze({
  free: Object.freeze({ submissions: 500, questions: 3, forms: 2, branding: false, csv: false, aiQuestions: false }),
  pro: Object.freeze({ submissions: 5000, questions: 25, forms: 20, branding: true, csv: true, aiQuestions: true }),
});
export function usageMonth(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { key: start.toISOString().slice(0, 7), start, end };
}
// Always calculate from the original anniversary: Jan 31 -> Feb 28 -> Mar 31.
export function allowancePeriod(anchor, now = new Date()) {
  anchor = new Date(anchor);
  if (!Number.isFinite(anchor.getTime()) || anchor > now) throw new Error('Invalid allowance anchor');
  const boundary = offset => {
    const month = anchor.getUTCMonth() + offset;
    const day = Math.min(anchor.getUTCDate(), new Date(Date.UTC(anchor.getUTCFullYear(), month + 1, 0)).getUTCDate());
    return new Date(Date.UTC(anchor.getUTCFullYear(), month, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds()));
  };
  let offset = (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + now.getUTCMonth() - anchor.getUTCMonth();
  if (boundary(offset) > now) offset--;
  const start = boundary(offset), end = boundary(offset + 1);
  return { key: `cycle:${start.toISOString()}`, start, end };
}
export function planMode(env = process.env) {
  if (env.UNSAID_BILLING_MODE === 'live' && env.VERCEL_ENV === 'production' && env.UNSAIDBOX_APP_URL === 'https://unsaidbox.com') return 'live';
  // Sandbox purchases may unlock sandbox features only. Production release
  // remains blocked until the live payment/tax verification checklist passes.
  return env.UNSAID_BILLING_MODE === 'test' && env.NODE_ENV !== 'production' && !env.VERCEL ? 'test' : null;
}
export function usageLevel(used, limit) {
  return used >= limit ? 'full' : used >= Math.ceil(limit * .8) ? 'warning' : 'normal';
}
export function csvCell(value) {
  let text = String(value ?? '');
  // Spreadsheet formula injection can follow whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function csvDocument(rows) {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
