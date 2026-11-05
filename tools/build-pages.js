/* js/cases.js から、共有・検索用の静的ページを作る。
   - c/<id>/index.html : 事件ごとのURL。OGPと、真相を除いた本文を持つ。開くとそのまま事件が遊べる
   - index.html の PRERENDER 部分、sitemap.xml
   使い方: node tools/build-pages.js */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://notendo10-bit.github.io/mystery60/";
global.window = {};
require(path.join(ROOT, "js", "cases.js"));
const CASES = window.M60_CASES;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230a0a0b'/%3E%3Ctext x='16' y='22' font-size='15' text-anchor='middle' fill='%23c9b48a' font-family='serif'%3E60%3C/text%3E%3C/svg%3E";

function casePage(c) {
  const url = `${SITE}c/${c.id}/`;
  const title = `${c.title}｜MYSTERY 60`;
  const ld = {
    "@context": "https://schema.org", "@type": "ShortStory", headline: c.title, name: c.title,
    genre: c.genre, inLanguage: "ja", url, description: c.hook, image: `${SITE}images/og/${c.id}.jpg`,
    isPartOf: { "@type": "WebSite", name: "MYSTERY 60", url: SITE }
  };
  const story = c.story.map((p) => `<p>${esc(p)}</p>`).join("\n");
  const clues = c.clues.map((p) => `<li>${esc(p)}</li>`).join("\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<base href="../../">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(c.hook)}">
<meta name="theme-color" content="#0a0a0b">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="MYSTERY 60">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(c.hook)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${SITE}images/og/${c.id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(c.image.alt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ICON}">
<link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div id="app" aria-live="off">
<main class="prerender">
<p><a href="./">MYSTERY 60</a>｜${esc(c.genre)}</p>
<h1>${esc(c.title)}</h1>
<img src="${c.image.src}" alt="${esc(c.image.alt)}" width="${c.image.w}" height="${c.image.h}">
${story}
<h2>手がかり</h2>
<ul>
${clues}
</ul>
<h2>${esc(c.question)}</h2>
</main>
</div>
<noscript><p style="padding:24px;color:#ddd">答えて真相を見るには JavaScript を有効にしてください。</p></noscript>
<dialog id="viewer" aria-label="画像の拡大表示">
  <button type="button" id="viewer-close" aria-label="閉じる">閉じる</button>
  <div id="viewer-scroll"><img id="viewer-img" alt=""></div>
</dialog>
<script>window.M60_START = ${JSON.stringify(c.id)};</script>
<script src="js/cases.js"></script>
<script src="js/app.js"></script>
</body>
</html>
`;
}

CASES.forEach((c) => {
  const dir = path.join(ROOT, "c", c.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), casePage(c));
});

// index.html の静的な一覧(JSが動くと置き換わる)
const list = CASES.map((c) => `<li><a href="c/${c.id}/">${esc(c.title)}</a>（${esc(c.genre)}）${esc(c.hook)}</li>`).join("\n");
const indexPath = path.join(ROOT, "index.html");
const index = fs.readFileSync(indexPath, "utf8").replace(
  /<!-- PRERENDER -->[\s\S]*<!-- \/PRERENDER -->/,
  `<!-- PRERENDER -->\n<main class="prerender">\n<h1>MYSTERY 60</h1>\n<p>60秒の謎。解けたら、もう一問。登録なし、無料で読める短編ミステリー全${CASES.length}話。</p>\n<ol>\n${list}\n</ol>\n</main>\n<!-- /PRERENDER -->`
);
fs.writeFileSync(indexPath, index);

const today = new Date().toISOString().slice(0, 10);
const urls = [SITE].concat(CASES.map((c) => `${SITE}c/${c.id}/`));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + `\n</urlset>\n`);

console.log("built", CASES.length, "pages");
