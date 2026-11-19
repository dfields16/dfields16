// Zero-dependency build step. Run: node scripts/build.mjs
// Writes sitemap.xml (home page plus every projects/<slug>/index.html) and updates the project count on the home page.
import fs from "node:fs";

const SITE = "https://dawsonfields.com";
const projects = fs.readdirSync("projects", { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(`projects/${d.name}/index.html`))
  .map((d) => `/projects/${d.name}/`)
  .sort();

const pages = ["/", "/projects/", ...projects];
fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`Built sitemap.xml: ${pages.length} pages`);
