import { paginateLines, wrapLines } from "./share.mjs";

export const cardFormats = {
  square: { width: 1080, height: 1080, label: "Square", ratio: "1:1" },
  portrait: { width: 1080, height: 1350, label: "Portrait", ratio: "4:5" },
  story: { width: 1080, height: 1920, label: "Story", ratio: "9:16" },
};

export function layoutCard(text, format, measure, {question='',measureQuestion=measure}={}) {
  const dimensions = cardFormats[format];
  if (!dimensions) throw new Error("Unknown card format");
  const lineHeight = 66;
  const hasQuestion=Boolean(question.trim());
  const startY = hasQuestion ? 200 : 320;
  const footerY = dimensions.height - 130;
  const capacity = Math.floor((footerY - 80 - startY) / lineHeight) + 1;
  const responseLines=wrapLines(text.trim(), dimensions.width - 176, measure).map(text=>({text,kind:'answer'}));
  const lines=hasQuestion?[
    ...wrapLines(question.trim(),dimensions.width-176,measureQuestion).map(text=>({text,kind:'question'})),
    {text:'',kind:'gap'},...responseLines,
  ]:responseLines;
  const pageLines=paginateLines(lines,capacity);
  const pages=pageLines.map(page=>page.map(line=>line.text));
  return { ...dimensions, lineHeight, startY, footerY, pages, pageLines, hasQuestion };
}
