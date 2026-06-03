// Generate PWA icons: 192×192, 512×512, and a 512×512 maskable variant.
// Run: npx tsx scripts/gen-pwa-icons.mjs   (sharp must be installed)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "public");
mkdirSync(OUT_DIR, { recursive: true });

// Square SVG: navy background, accent-gold "PS" wordmark, small house emoji.
// `rounded` controls corner radius — small for the regular icon, 0 for maskable.
function svg(size, rounded) {
  const r = rounded ? Math.round(size * 0.18) : 0;
  // Center the text optically; letter-spacing tightens the wordmark.
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#1B3A6B"/>
  <text x="50%" y="${Math.round(size * 0.58)}" text-anchor="middle"
        font-family="-apple-system, Segoe UI, Inter, Arial, sans-serif"
        font-size="${Math.round(size * 0.42)}"
        font-weight="800"
        fill="#FFFFFF"
        letter-spacing="${Math.round(size * 0.01)}">PS</text>
  <text x="50%" y="${Math.round(size * 0.86)}" text-anchor="middle"
        font-size="${Math.round(size * 0.13)}"
        fill="#C9A84C"
        font-weight="600"
        font-family="-apple-system, Segoe UI, Inter, Arial, sans-serif">PROP·SCAN</text>
</svg>`;
}

async function render(size, name, rounded) {
  const buf = await sharp(Buffer.from(svg(size, rounded)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(resolve(OUT_DIR, name), buf);
  console.log(`  ${name}: ${buf.length} bytes`);
}

console.log("Generating PWA icons → public/");
await render(192, "icon-192.png", true);
await render(512, "icon-512.png", true);
await render(512, "icon-512-maskable.png", false);
console.log("Done.");
