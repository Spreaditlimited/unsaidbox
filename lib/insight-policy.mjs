import { scheduledInstant, publicationFields } from './blog-time.mjs';

export function insightRange(params, now = new Date()) {
  const timezone = params.timezone === 'Europe/London' ? 'Europe/London' : 'UTC';
  const today = publicationFields(now, timezone).date;
  const startDefault = publicationFields(new Date(now.getTime() - 29 * 86400000), timezone).date;
  const from = typeof params.from === 'string' ? params.from : startDefault;
  const to = typeof params.to === 'string' ? params.to : today;
  const start = scheduledInstant(from, '00:00', timezone);
  scheduledInstant(to, '00:00', timezone);
  const next = new Date(`${to}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = scheduledInstant(next.toISOString().slice(0, 10), '00:00', timezone);
  if (start >= end || end.getTime() - start.getTime() > 367 * 86400000) throw new Error('Choose a date range of at most one year, with the start before the end.');
  return { from, to, timezone, start, end };
}

export function ratingSummary(buckets) {
  const counts = Array.from({ length: 5 }, (_, i) => ({ value: i + 1, count: buckets.find(b => b.value === i + 1)?.count || 0 }));
  const total = counts.reduce((n, b) => n + b.count, 0);
  if (!total) return { counts, total, average: null, median: null };
  const at = rank => { let n = 0; for (const b of counts) { n += b.count; if (n >= rank) return b.value; } };
  return { counts, total, average: counts.reduce((n, b) => n + b.value * b.count, 0) / total, median: (at(Math.floor((total + 1) / 2)) + at(Math.ceil((total + 1) / 2))) / 2 };
}
