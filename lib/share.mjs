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
