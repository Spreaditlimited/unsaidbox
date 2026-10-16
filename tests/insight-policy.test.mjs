import test from 'node:test';
import assert from 'node:assert/strict';
import { insightRange, ratingSummary } from '../lib/insight-policy.mjs';
test('UK date filtering includes the full 25-hour autumn clock-change day', () => {
  const r = insightRange({ from: '2026-10-25', to: '2026-10-25', timezone: 'Europe/London' });
  assert.equal(r.start.toISOString(), '2026-10-24T23:00:00.000Z');
  assert.equal(r.end.toISOString(), '2026-10-26T00:00:00.000Z');
});
test('date filters reject invalid dates, inversions and excessive ranges', () => {
  for (const [from,to] of [['2026-02-30','2026-03-01'], ['2026-05-01','2026-04-01'], ['2024-01-01','2026-01-01']]) assert.throws(() => insightRange({from,to}));
});
test('ratings use weighted median and do not invent an average for no answers', () => {
  assert.equal(ratingSummary([]).average, null);
  assert.deepEqual(ratingSummary([{value:1,count:2},{value:5,count:2}]), { counts:[{value:1,count:2},{value:2,count:0},{value:3,count:0},{value:4,count:0},{value:5,count:2}], total:4, average:3, median:3 });
});
