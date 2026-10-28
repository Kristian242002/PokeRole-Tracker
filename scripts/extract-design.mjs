// Estrae le pagine dai file impacchettati di Claude Design (design/*.html)
// in design/extracted/<desktop|phone>/<pagina>.html, senza font incorporati.
// Uso: node scripts/extract-design.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

function block(html, type) {
  const tag = `<script type="__bundler/${type}">`;
  const i = html.lastIndexOf(tag);
  if (i < 0) return null;
  return html.slice(i + tag.length, html.indexOf("</script>", i));
}

function unpack(html) {
  const manifest = JSON.parse(block(html, "manifest"));
  const template = JSON.parse(block(html, "template"));
  const files = {};
  for (const [id, entry] of Object.entries(manifest)) {
    let buf = Buffer.from(entry.data, "base64");
    if (entry.compressed) buf = gunzipSync(buf);
    files[id] = { mime: entry.mime, buf };
  }
  return { template, files };
}

const stripFonts = (html) => html.replace(/<style>\/\*[\s\S]*?<\/style>\s*/g, "");

for (const file of readdirSync("design").filter((f) => f.endsWith(".html"))) {
  const device = /phone/i.test(file) ? "phone" : "desktop";
  const outDir = join("design", "extracted", device);
  mkdirSync(outDir, { recursive: true });
  const root = unpack(readFileSync(join("design", file), "utf8"));
  const frames = root.template.matchAll(/about:blank#([0-9a-f-]+)" title="([^"]+)"/g);
  for (const [, id, title] of frames) {
    const page = unpack(root.files[id].buf.toString("utf8"));
    const name = title.replace(/[^\p{L}\p{N}]+/gu, "_");
    writeFileSync(join(outDir, `${name}.html`), stripFonts(page.template));
    console.log(`${device}/${name}.html`);
  }
}
