// SEO check — runs automatically after every build (npm run build).
// If a page breaks a rule marked ERROR, the build fails and nothing is
// deployed, so SEO mistakes can never reach the live site.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';

const DIST = 'dist';
const BASE = (process.env.BASE_PATH || '/backup-power-site').replace(/\/$/, '');
const KEYWORDS = JSON.parse(readFileSync('seo/keywords.json', 'utf8')).pages;

const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

const norm = (s) => (s || '').toLowerCase().replace(/[-‐–—]/g, ' ').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const has = (text, kw) => norm(text).includes(norm(kw));

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}

const routeOf = (file) => {
  const r = '/' + relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  return r.endsWith('.html') ? r : r;
};

function resolveInternal(href) {
  let path = href.split('#')[0].split('?')[0];
  if (!path) return true;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length) || '/';
  const target = join(DIST, path);
  return existsSync(path.endsWith('/') ? join(target, 'index.html') : target) || existsSync(join(target, 'index.html'));
}

const UTILITY = new Set(['/about/', '/contact/', '/privacy-policy/', '/terms/', '/affiliate-disclosure/']);
const seenTitles = new Map();
const files = htmlFiles(DIST);

for (const file of files) {
  const route = routeOf(file);
  if (route === '/404.html') continue;
  const root = parse(readFileSync(file, 'utf8'));

  const title = root.querySelector('title')?.text.trim() || '';
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const h1s = root.querySelectorAll('h1');
  const h1 = h1s[0]?.text.trim() || '';
  const main = root.querySelector('main');
  const mainText = main ? main.text.replace(/\s+/g, ' ').trim() : '';
  const words = mainText.split(' ').filter(Boolean);

  // Basics
  if (!title) err(route, 'missing <title>');
  else if (title.length > 70) warn(route, `title is ${title.length} chars (Google shows ~60–65): "${title}"`);
  else if (title.length < 25 && !UTILITY.has(route)) warn(route, `title is short (${title.length} chars)`);
  if (seenTitles.has(title)) err(route, `duplicate title with ${seenTitles.get(title)}`);
  seenTitles.set(title, route);

  if (!desc) err(route, 'missing meta description');
  else if (desc.length > 160) warn(route, `meta description is ${desc.length} chars (keep ≤160)`);
  else if (desc.length < 70 && !UTILITY.has(route)) warn(route, `meta description is short (${desc.length} chars)`);

  if (h1s.length !== 1) err(route, `has ${h1s.length} <h1> tags (need exactly 1)`);
  if (!root.querySelector('link[rel="canonical"]')) err(route, 'missing canonical link');
  if (!root.querySelector('html')?.getAttribute('lang')) err(route, 'missing <html lang>');
  if (!root.querySelector('meta[name="viewport"]')) err(route, 'missing viewport meta (not mobile-friendly)');

  // Structured data must be valid JSON
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try { JSON.parse(s.text); } catch { err(route, 'invalid JSON-LD structured data'); }
  }

  // Images need alt text
  for (const img of root.querySelectorAll('img')) {
    if (img.getAttribute('alt') == null) err(route, `image without alt: ${img.getAttribute('src')}`);
  }

  // Internal links must not be broken
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
    if (!resolveInternal(href)) err(route, `broken internal link → ${href}`);
  }

  // Keyword placement
  const kw = KEYWORDS[route];
  if (UTILITY.has(route)) continue; // legal/contact pages don't target keywords
  if (!kw) { warn(route, 'no primary keyword in seo/keywords.json'); continue; }
  const p = kw.primary;
  if (!has(title, p)) err(route, `primary keyword "${p}" missing from <title>`);
  if (!has(h1, p) && !has(title.split('|')[0], p)) err(route, `primary keyword "${p}" missing from <h1>`);
  if (!has(desc, p)) err(route, `primary keyword "${p}" missing from meta description`);
  const intro = words.slice(0, 150).join(' ');
  if (!has(intro, p)) err(route, `primary keyword "${p}" not in the first 150 words`);

  // Thin content check for tools and guides
  if (/^\/(calculators|guides)\/.+/.test(route) && words.length < 400) warn(route, `only ${words.length} words of content (aim for 400+)`);

  // Every page should link to at least 2 other pages on the site (internal linking)
  const internal = new Set(root.querySelectorAll('main a[href]').map((a) => a.getAttribute('href')).filter((h) => !/^(https?:|mailto:|#)/.test(h)));
  if (route !== '/' && internal.size < 2) warn(route, `only ${internal.size} internal links inside the content`);
}

// Every keyword-mapped page must exist
for (const route of Object.keys(KEYWORDS)) {
  const f = join(DIST, route, 'index.html');
  if (!existsSync(f)) warn(route, 'listed in keywords.json but page not built yet');
}

// Primary keywords must be unique (no two pages competing)
const prim = Object.entries(KEYWORDS).map(([r, k]) => [r, norm(k.primary)]);
for (const [r, k] of prim) {
  const dup = prim.find(([r2, k2]) => r2 !== r && k2 === k);
  if (dup) err(r, `same primary keyword as ${dup[0]}`);
}

console.log(`\nSEO check: ${files.length} pages, ${errors.length} errors, ${warnings.length} warnings`);
warnings.forEach((w) => console.log('  ⚠️  ' + w));
errors.forEach((e) => console.log('  ❌ ' + e));
if (errors.length) { console.log('\nBuild stopped: fix the SEO errors above.\n'); process.exit(1); }
console.log('✅ SEO check passed\n');
