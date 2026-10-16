import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { calendarDate, calendarMove, calendarDays, calendarLabel, calendarMonthLabel } from '../lib/calendar-date.mjs';
test('calendar labels match across server and browser without relying on locale data', async () => {
  const source = ts.transpileModule(await readFile('lib/calendar-date.mjs', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const environments = [];
  for (const abbreviation of ['Sept', 'Sep']) {
    const exports = {};
    vm.runInNewContext(source, { exports, Intl: { DateTimeFormat: class { format() { return `10 ${abbreviation} 2026`; } } } });
    environments.push(exports);
  }
  for (let month = 1; month <= 12; month++) {
    const value = `2026-${String(month).padStart(2, '0')}-10`;
    assert.equal(environments[0].calendarLabel(value), environments[1].calendarLabel(value));
    assert.equal(environments[0].calendarMonthLabel(value), environments[1].calendarMonthLabel(value));
  }
  assert.equal(calendarLabel('2026-09-10'), '10 Sep 2026');
  assert.equal(calendarMonthLabel('2026-09-10'), 'September 2026');
  assert.equal(calendarMonthLabel(''), '');
});
test('calendar date parsing rejects impossible dates and preserves leap days', () => {
  assert.equal(calendarDate('2026-02-29'), null);
  assert.equal(calendarDate('2026-13-01'), null);
  assert.equal(calendarDate(''), null);
  assert.ok(calendarDate('2028-02-29'));
  assert.equal(calendarLabel('2026-10-09'), '9 Oct 2026');
});
test('calendar navigation clamps month ends and crosses DST dates without shifting', () => {
  assert.equal(calendarMove('2026-01-31', 0, 1), '2026-02-28');
  assert.equal(calendarMove('2028-02-29', 0, 12), '2029-02-28');
  assert.equal(calendarMove('2026-03-29', 1), '2026-03-30');
  assert.equal(calendarMove('2026-10-25', -1), '2026-10-24');
  assert.equal(calendarMove('2026-12-31', 1), '2027-01-01');
});
test('calendar grids contain six Monday-first weeks', () => {
  const days = calendarDays('2026-10-09');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-09-28');
  assert.equal(days.at(-1), '2026-11-08');
  assert.equal(new Set(days).size, 42);
});
test('all existing editable dates use the shared calendar instead of native or text date fields', async () => {
  for (const file of ['app/dashboard/exports/page.tsx','app/dashboard/forms/[id]/insights/page.tsx','components/blog/BlogEditor.tsx']) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /<DatePicker/);
    assert.doesNotMatch(source, /<input[^>]*name="(?:from|to|publishDate)"|type="(?:date|datetime-local)"/);
  }
  const picker = await readFile('components/ui/DatePicker.tsx','utf8');
  assert.match(picker, /role="grid"/);
  assert.match(picker, /ArrowLeft/);
  assert.match(picker, /PageUp/);
  assert.match(picker, /onOpenAutoFocus/);
});
