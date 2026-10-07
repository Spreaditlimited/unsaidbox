// Code-native brand artwork: no remote fonts, image API, or customer content.
// Run with: node scripts/generate-social-images.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const directory = new URL("../public/social/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const blog of [false, true]) {
  const background = blog ? "#202332" : "#faf9f6";
  const ink = blog ? "#faf9f6" : "#202332";
  const muted = blog ? "#cbc8df" : "#646572";
  const accent = blog ? "#c6bff5" : "#5850b8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${background}"/>
    <circle cx="1000" cy="260" r="320" fill="${blog ? "#2b2b44" : "#eeebfa"}"/>
    <circle cx="1000" cy="260" r="258" fill="none" stroke="${blog ? "#41405b" : "#d9d3ef"}"/>
    <g transform="translate(64 54) scale(1.55)">
      <rect width="34" height="34" rx="10" fill="#5850b8"/>
      <path d="M9 13.5 17 18l8-4.5M9 13.5V23h16v-9.5M9 13.5l8-4.5 8 4.5M17 9v5" fill="none" stroke="white" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <g font-family="Arial, sans-serif">
      <text x="132" y="93" font-size="34" font-weight="700" fill="${ink}">Unsaid<tspan font-weight="400">Box</tspan></text>
      <text x="66" y="183" font-size="16" letter-spacing="3" fill="${accent}">${blog ? "THE UNSAIDBOX JOURNAL" : "YOUR OWN SPACE FOR HONESTY"}</text>
      <text x="62" y="267" font-size="64" font-weight="700" letter-spacing="-2" fill="${ink}">${blog ? "Better questions." : "A place for"}</text>
      <text x="62" y="346" font-size="${blog ? 60 : 76}" font-family="Georgia, serif" font-style="italic" fill="${accent}">${blog ? "More honest answers." : "the unsaid."}</text>
      <text x="66" y="417" font-size="24" fill="${muted}">${blog ? "Practical guides. Thoughtful ideas." : "Anonymous questions. Honest feedback."}</text>
      <text x="66" y="453" font-size="24" fill="${muted}">${blog ? "A closer connection with your audience." : "Collect privately. Share with intention."}</text>
      <line x1="66" y1="530" x2="1134" y2="530" stroke="${blog ? "#444458" : "#dedbe7"}"/>
      <text x="66" y="574" font-size="21" fill="${ink}">unsaidbox.com${blog ? "/blog" : ""}</text>
      <text x="1134" y="574" text-anchor="end" font-size="16" letter-spacing="2" fill="${muted}">${blog ? "LISTEN. CONNECT. GROW." : "SHARING ON YOUR TERMS."}</text>
    </g>
    <g transform="translate(805 157) rotate(7 130 140)">
      <rect x="6" y="10" width="300" height="288" rx="22" fill="#14132d" opacity=".1"/>
      <rect width="300" height="288" rx="22" fill="${blog ? "#d8d2f2" : "#ddd7f4"}"/>
      <rect x="28" y="35" width="127" height="9" rx="4" fill="#8b80c6"/>
      <rect x="28" y="61" width="236" height="7" rx="3" fill="#b3a9dc"/>
      <rect x="28" y="81" width="204" height="7" rx="3" fill="#b3a9dc"/>
    </g>
    <g transform="translate(773 249) rotate(-6 145 106)">
      <rect x="5" y="9" width="316" height="218" rx="22" fill="#14132d" opacity=".12"/>
      <rect width="316" height="218" rx="22" fill="#ffffff"/>
      <text x="25" y="66" font-family="Georgia, serif" font-size="80" fill="#5850b8">“</text>
      <text x="28" y="102" font-family="Arial, sans-serif" font-size="23" fill="#202332">${blog ? "Start with a" : "A little courage."}</text>
      <text x="28" y="137" font-family="Arial, sans-serif" font-size="23" fill="#202332">${blog ? "better question." : "A real connection."}</text>
      <rect x="28" y="173" width="94" height="6" rx="3" fill="#d8d2ef"/>
      <circle cx="278" cy="176" r="17" fill="#eeebfa"/>
      <path d="M271 176h14m-6-6 6 6-6 6" fill="none" stroke="#5850b8" stroke-width="2"/>
    </g>
  </svg>`;
  const name = blog ? "unsaidbox-blog-v1.png" : "unsaidbox-v1.png";
  await sharp(Buffer.from(svg)).png().toFile(new URL(name, directory).pathname);
  console.log(`Created public/social/${name} (1200 × 630)`);
}
