import { paginateLines, wrapLines } from "./share.mjs";

export const cardFormats = {
  square: { width: 1080, height: 1080, label: "Square", ratio: "1:1" },
  portrait: { width: 1080, height: 1350, label: "Portrait", ratio: "4:5" },
  story: { width: 1080, height: 1920, label: "Story", ratio: "9:16" },
};

export function layoutCard(text, format, measure) {
  const dimensions = cardFormats[format];
  if (!dimensions) throw new Error("Unknown card format");
  const lineHeight = 66;
  const startY = 320;
  const footerY = dimensions.height - 130;
  const capacity = Math.floor((footerY - 80 - startY) / lineHeight) + 1;
  const pages = paginateLines(
    wrapLines(text.trim(), dimensions.width - 176, measure),
    capacity,
  );
  return { ...dimensions, lineHeight, startY, footerY, pages };
}
