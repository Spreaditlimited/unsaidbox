import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sender forms explain private analysis without a separate consent checkbox', async () => {
  for (const path of ['components/SenderForm.tsx', 'components/forms/RespondForm.tsx']) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(source, /AnalysisExportConsent|analysisAllowed|analysisNoticeVersion/);
    assert.match(source, /private analysis/);
    assert.match(source, /cannot be recalled/);
  }
  for (const path of ['app/actions.ts', 'app/dashboard/forms/actions.ts']) {
    assert.doesNotMatch(await readFile(path, 'utf8'), /analysisPermission|export-consent/);
  }
});
