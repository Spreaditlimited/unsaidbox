// Calendar dates are not timestamps. UTC arithmetic avoids DST/day shifts.
// Fixed English labels also avoid Node/browser ICU differences during hydration
// (for example, en-GB can abbreviate September as either "Sep" or "Sept").
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export function calendarLabel(value) {
  const date = calendarDate(value);
  return date ? `${date.getUTCDate()} ${months[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}` : '';
}
export function calendarMonthLabel(value) {
  const date = calendarDate(value);
  return date ? `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}
export function calendarMove(value, days = 0, months = 0) {
  const date = calendarDate(value);
  if (!date) return value;
  if (months) {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    const last = new Date(date.getTime());
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(day, last.getUTCDate()));
  }
  date.setUTCDate(date.getUTCDate() + days);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return value;
  return date.toISOString().slice(0, 10);
}
export function calendarDays(value) {
  const first = `${value.slice(0, 7)}-01`;
  const date = calendarDate(first);
  if (!date) return [];
  const offset = (date.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => calendarMove(first, index - offset));
}
