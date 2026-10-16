/** Wrap with measured text widths; hard-wrap long tokens without dropping text. */
export function wrapLines(text, maxWidth, measure) {
  if (maxWidth <= 0) throw new Error('Width must be positive');
  const lines = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && measure(`${line} ${word}`) <= maxWidth) { line += ` ${word}`; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const letter of word) {
        if (line && measure(line + letter) > maxWidth) { lines.push(line); line = ''; }
        line += letter;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function paginateLines(lines, perPage) {
  if (!Number.isInteger(perPage) || perPage < 1) throw new Error('Invalid page size');
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}

export function facebookPostUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

/** Prefer the secure Clipboard API; retain a user-gesture fallback for HTTP LAN previews. */
export function copyResponseText(text, browser = window) {
  if (browser.navigator.clipboard?.writeText) return browser.navigator.clipboard.writeText(text);
  const doc = browser.document;
  const previousFocus = doc.activeElement;
  const field = doc.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
  try {
    doc.body.appendChild(field);
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    if (!doc.execCommand('copy')) throw new Error('Clipboard unavailable');
  } finally {
    field.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

/** Reserve a tab during the click, then navigate only after copying succeeds. */
export async function copyResponseAndOpenPost(text, postUrl, { copy, open }) {
  const url = facebookPostUrl(postUrl);
  if (!url || !text.trim()) return 'invalid';
  let tab;
  try {
    // Invoke clipboard while user activation is still available (including Safari).
    const copying = copy(text.trim());
    try {
      tab = open();
      if (tab) tab.opener = null;
    } catch { tab = null; }
    await copying;
  } catch {
    try { tab?.close(); } catch { /* The user may already have closed it. */ }
    return 'copy-failed';
  }
  try {
    if (!tab || tab.closed) return 'copied';
    tab.location.replace(url);
    return 'opened';
  } catch {
    try { tab?.close(); } catch { /* Best-effort cleanup. */ }
    return 'copied';
  }
}
