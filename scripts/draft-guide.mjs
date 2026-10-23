// Weekly auto-draft: writes ONE new guide with Google Gemini, checks it, and
// leaves it ready for a human to approve (the GitHub workflow opens a Pull
// Request — nothing goes live until it is merged).
//
// Usage:
//   GEMINI_API_KEY=... node scripts/draft-guide.mjs [--topic slug]
//   DRAFT_MOCK=path/to/response.json node scripts/draft-guide.mjs   (test without an API key)
//
// Env:
//   GEMINI_API_KEY   required unless DRAFT_MOCK is set
//   GEMINI_MODELS    comma list tried in order (default below)
//   SKIP_SLUGS       comma list of slugs that already have an open draft PR
//   GITHUB_OUTPUT    set by GitHub Actions; we write slug/title/etc. there
import { readFileSync, writeFileSync, existsSync, appendFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

const QUEUE_PATH = 'seo/topic-queue.json';
const KEYWORDS_PATH = 'seo/keywords.json';
const GUIDES_DIR = 'src/content/guides';
const MAX_ATTEMPTS = 3;
const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest')
  .split(',').map((s) => s.trim()).filter(Boolean);
const SITE_NAME = 'BackupWatts';

const args = process.argv.slice(2);
const forcedTopic = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : (process.env.DRAFT_TOPIC || '');
const skip = new Set((process.env.SKIP_SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean));

const log = (...m) => console.log('[draft]', ...m);
// On GitHub, "::error::" lines show up on the run's Summary page, so the
// reason is visible without opening the logs.
const fail = (msg) => {
  console.error('[draft] ERROR:', msg);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Draft nahi bana::${String(msg).replace(/\r?\n/g, ' ')}`);
  process.exit(1);
};

// Plain-language explanation for common Gemini API errors.
function explain(status, body) {
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(body))
    return 'GEMINI_API_KEY ghalat hai — AI Studio se nayi key bana kar GitHub secret dobara save karein (poori key copy karein, aage-peeche space na ho).';
  if (status === 403)
    return 'Gemini ne key ko ijazat nahi di (403) — AI Studio mein key check karein, ya nayi key banayein.';
  if (status === 429)
    return 'Gemini ki free limit abhi poori hai (429) — thori der baad "Re-run jobs" dabayein.';
  if (status === 404)
    return 'Yeh Gemini model ab maujood nahi (404) — Claude ko batayein, woh model ka naam update kar dega.';
  if (status === 0) return 'Gemini tak internet connection nahi bana — thori der baad dobara chalayein.';
  return `Gemini ne error diya (HTTP ${status}).`;
}

// ---------- 1. Pick the topic ----------
const queueFile = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const available = queueFile.queue.filter((t) => !existsSync(`${GUIDES_DIR}/${t.slug}.md`) && !skip.has(t.slug));
const topic = forcedTopic ? queueFile.queue.find((t) => t.slug === forcedTopic) : available[0];
if (!topic) {
  log('No topics left in seo/topic-queue.json — add more topics. Nothing to do.');
  output({ status: 'empty' });
  process.exit(0);
}
if (existsSync(`${GUIDES_DIR}/${topic.slug}.md`)) fail(`guide ${topic.slug} already exists`);
log(`Topic: ${topic.slug} — "${topic.keyword}"`);

// ---------- 2. Reference data the AI may use ----------
const appliances = JSON.parse(readFileSync('src/data/appliances.json', 'utf8')).categories
  .flatMap((c) => c.items.map((i) => `${i.name}: about ${i.running} W running${i.surge > i.running ? `, about ${i.surge} W starting` : ''}`));
const keywords = JSON.parse(readFileSync(KEYWORDS_PATH, 'utf8'));
const existingGuides = Object.keys(keywords.pages).filter((p) => p.startsWith('/guides/') && p !== '/guides/')
  .map((p) => p.replace('/guides/', '').replace(/\/$/, ''));

// ---------- 3. Prompt ----------
const SYSTEM = `You are a careful, plain-spoken energy writer for ${SITE_NAME}, an independent US website of backup-power calculators.
Readers are ordinary American homeowners and campers, not engineers. Write in clear US English at about an 8th-grade reading level.
Your job is to be genuinely useful and accurate. Never invent statistics, studies, prices, quotes or product claims.`;

function buildPrompt(feedback) {
  return `Write one guide for our website.

TOPIC QUESTION: ${topic.question}
PRIMARY KEYWORD (exact phrase): "${topic.keyword}"
ANGLE: ${topic.angle}

FACTS YOU MAY USE (checked by our team). Use ONLY these numbers, the appliance figures below, and simple arithmetic from them. If you are not sure of a number, describe it without a number.
${topic.facts.map((f) => `- ${f}`).join('\n')}

TYPICAL APPLIANCE FIGURES ON OUR SITE (US 120 V):
${appliances.map((a) => `- ${a}`).join('\n')}

HOUSE RULES FOR OUR MATHS: runtime ≈ capacity in Wh × 0.85 ÷ watts (0.85 = inverter loss on AC; use 0.9 for DC/USB-C). Sizing = daily Wh ÷ 0.85 × 1.2 safety buffer.

RETURN JSON with these fields:
- "title": the H1/SEO title, 30–55 characters, MUST contain the exact primary keyword (capitalize like a headline is fine). No site name.
- "description": meta description, 110–155 characters, MUST contain the exact primary keyword, says what the reader gets.
- "summary": one line for a card, 60–130 characters.
- "answer": a 1–2 sentence direct answer to the topic question, ideally using the primary keyword, with at least one concrete number from the facts.
- "faqs": 3 or 4 objects {"q","a"} with real follow-up questions people ask; answers 1–3 sentences, no new numbers beyond the facts.
- "body": the article in Markdown, 850–1,100 words.

BODY RULES:
- The FIRST sentence must contain the exact phrase "${topic.keyword}".
- 5–7 sections with "## " headings (no H1, no "Conclusion" heading, no FAQ section — FAQs go in "faqs").
- Exactly one Markdown table with useful numbers from the facts.
- Short paragraphs, bullet lists where helpful, bold the key numbers.
- No brand or product names. No links. No promises. Include safety notes where relevant.
- Last paragraph: suggest the reader enters their own numbers in our Power Station Size Calculator (name it, no link).
- Don't repeat the title as the first line.
${feedback ? `\nYOUR PREVIOUS DRAFT WAS REJECTED. Fix these problems:\n${feedback.map((f) => `- ${f}`).join('\n')}\n` : ''}`;
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    summary: { type: 'STRING' },
    answer: { type: 'STRING' },
    faqs: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, a: { type: 'STRING' } }, required: ['q', 'a'] } },
    body: { type: 'STRING' },
  },
  required: ['title', 'description', 'summary', 'answer', 'faqs', 'body'],
};

// ---------- 4. Call Gemini ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let candidateModels = null; // filled from Google's live model list
let workingModel = '';

// Google renames/retires models often, so instead of hard-coding names we ask
// the API which models this key can use right now and pick the best text
// "Flash" model (fast, free-tier friendly). GEMINI_MODELS, if set, goes first.
export function rankModels(names) {
  const bad = /(image|tts|audio|live|embed|vision|robotics|computer|native|learnlm|gemma|nano|veo|imagen|aqa|banana|lyria|guard|deep-research)/i;
  const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
  const tier = (n) => (/flash-lite/.test(n) ? 1 : /flash/.test(n) ? 0 : /pro/.test(n) ? 2 : 3);
  const preview = (n) => (/(preview|exp|experimental)/.test(n) ? 1 : 0);
  const alias = (n) => (/latest/.test(n) ? 1 : 0);
  return [...new Set(names)]
    .filter((n) => /^gemini-/.test(n) && !bad.test(n) && tier(n) < 3)
    .sort((a, b) => tier(a) - tier(b) || preview(a) - preview(b) || version(b) - version(a) || alias(a) - alias(b) || a.localeCompare(b));
}

async function discoverModels(key) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
    headers: { 'x-goog-api-key': key },
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    if (res.status === 400 || res.status === 403) fail(`${explain(res.status, body)} [models list: HTTP ${res.status} ${body}]`);
    log(`Could not list models (HTTP ${res.status}); using fallback names`);
    return [...MODELS];
  }
  const json = await res.json();
  const usable = (json.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
  const ranked = rankModels(usable);
  const preferred = (process.env.GEMINI_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const list = [...new Set([...preferred, ...ranked])].slice(0, 6);
  log('Models available for this key (best first):', list.join(', ') || '(none)');
  if (!list.length) fail('Is key ke saath koi Gemini text model nahi mila. AI Studio mein key ka project check karein.');
  return list;
}

async function callGemini(prompt) {
  if (process.env.DRAFT_MOCK) {
    log('Using mock response', process.env.DRAFT_MOCK);
    return { model: 'mock', data: JSON.parse(readFileSync(process.env.DRAFT_MOCK, 'utf8')) };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) fail('GEMINI_API_KEY secret nahi mila. GitHub → Settings → Secrets and variables → Actions mein naam bilkul GEMINI_API_KEY rakh kar key save karein.');
  if (!candidateModels) candidateModels = await discoverModels(key);
  let lastErr = '', lastExplain = '';
  const order = workingModel ? [workingModel, ...candidateModels.filter((m) => m !== workingModel)] : candidateModels;
  for (const model of order) {
    let useSchema = true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const generationConfig = { temperature: 0.6, responseMimeType: 'application/json', ...(useSchema ? { responseSchema: SCHEMA } : {}) };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
      if (res.ok) {
        const json = await res.json();
        const text = (json.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
        const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
        try { const data = JSON.parse(clean); workingModel = model; log(`Model used: ${model}`); return { model, data }; }
        catch { lastErr = `${model}: response was not valid JSON`; log(lastErr); break; }
      }
      const body = (await res.text()).slice(0, 300);
      lastErr = `${model}: HTTP ${res.status} ${body}`;
      lastExplain = explain(res.status, body);
      log(lastErr);
      const keyProblem = (res.status === 400 && /API_KEY_INVALID|API key not valid/i.test(body)) || res.status === 401 || res.status === 403;
      if (keyProblem) fail(`${lastExplain} [${lastErr}]`); // other models won't help
      if (res.status === 400 && useSchema) { log('Retrying without responseSchema'); useSchema = false; continue; }
      if (res.status === 429 && attempt === 1) { log('Rate limited — waiting 40 s'); await sleep(40000); continue; }
      break; // try next model
    }
  }
  fail(`${lastExplain || 'Gemini ke saare models fail ho gaye.'} [${lastErr}]`);
}

// ---------- 5. Validate ----------
const norm = (s) => (s || '').toLowerCase().replace(/[-‐–—]/g, ' ').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const has = (text, kw) => norm(text).includes(norm(kw));
const words = (md) => md.replace(/[#*|`>_-]/g, ' ').split(/\s+/).filter(Boolean).length;

function validate(d) {
  const p = [];
  const kw = topic.keyword;
  for (const f of ['title', 'description', 'summary', 'answer', 'body']) if (typeof d[f] !== 'string' || !d[f].trim()) p.push(`"${f}" is missing`);
  if (p.length) return p;
  d.title = d.title.replace(/\s*\|.*$/, '').trim();
  if (d.title.length < 20 || d.title.length > 56) p.push(`title must be 20–56 characters (it is ${d.title.length})`);
  if (!has(d.title, kw)) p.push(`title must contain "${kw}"`);
  if (d.description.length < 90 || d.description.length > 158) p.push(`description must be 90–158 characters (it is ${d.description.length})`);
  if (!has(d.description, kw)) p.push(`description must contain "${kw}"`);
  if (d.summary.length > 135) p.push(`summary must be under 135 characters (it is ${d.summary.length})`);
  if (!/\d/.test(d.answer)) p.push('answer must include at least one concrete number from the facts');
  if (!Array.isArray(d.faqs) || d.faqs.length < 3) p.push('give 3 or 4 FAQs');
  const body = d.body.trim();
  const first = body.replace(/^#+.*\n/gm, '').trim().split(/(?<=[.?!])\s/)[0] || '';
  if (!has(first, kw)) p.push(`the first sentence of the body must contain "${kw}"`);
  const w = words(body);
  if (w < 750) p.push(`body is too short (${w} words; need 850–1,100)`);
  if (w > 1400) p.push(`body is too long (${w} words; need 850–1,100)`);
  const h2 = (body.match(/^## /gm) || []).length;
  if (h2 < 4) p.push(`use 5–7 "## " section headings (found ${h2})`);
  if (/^# /m.test(body)) p.push('do not use a single "#" H1 heading in the body');
  if (/^##\s*(conclusion|faq|frequently asked)/im.test(body)) p.push('remove the Conclusion/FAQ heading');
  if (!/^\|.*\|\s*$/m.test(body)) p.push('include one Markdown table');
  if (/\]\(|https?:\/\//.test(body)) p.push('remove all links');
  return p;
}

// ---------- 6. Write files ----------
const q = (s) => JSON.stringify(String(s));           // JSON strings are valid YAML strings
const today = new Date().toISOString().slice(0, 10);
const guidePath = `${GUIDES_DIR}/${topic.slug}.md`;

function writeGuide(d) {
  const relatedGuides = (topic.relatedGuides || []).filter((g) => existingGuides.includes(g) || existsSync(`${GUIDES_DIR}/${g}.md`));
  const fm = [
    '---',
    `title: ${q(d.title)}`,
    `description: ${q(d.description)}`,
    `summary: ${q(d.summary)}`,
    `keyword: ${q(topic.keyword)}`,
    `published: ${today}`,
    `updated: ${today}`,
    `answer: ${q(d.answer)}`,
    `relatedTools: ${JSON.stringify(topic.relatedTools || ['power-station-size'])}`,
    `relatedGuides: ${JSON.stringify(relatedGuides)}`,
    'faqs:',
    ...d.faqs.slice(0, 4).flatMap((f) => [`  - q: ${q(f.q)}`, `    a: ${q(f.a)}`]),
    '---',
    '',
  ].join('\n');
  writeFileSync(guidePath, fm + d.body.trim() + '\n');
}

function addKeyword() {
  const k = JSON.parse(readFileSync(KEYWORDS_PATH, 'utf8'));
  k.pages[`/guides/${topic.slug}/`] = { primary: topic.keyword, secondary: [topic.question] };
  writeFileSync(KEYWORDS_PATH, JSON.stringify(k, null, 2) + '\n');
}

function buildCheck() {
  try {
    execSync('npm run build', { stdio: 'pipe', env: { ...process.env, PUBLIC_PREVIEW: 'true' } });
    return [];
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    const lines = out.split('\n').filter((l) => l.includes('❌') || /error/i.test(l)).slice(0, 8);
    return lines.length ? lines.map((l) => l.replace(/^.*❌\s*/, '').trim()) : ['site build failed'];
  }
}

// ---------- 7. Run with retries ----------
const originalKeywords = readFileSync(KEYWORDS_PATH, 'utf8');
let feedback = null, model = '', draft = null, problems = [];
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  log(`Attempt ${attempt}/${MAX_ATTEMPTS}`);
  const r = await callGemini(buildPrompt(feedback));
  model = r.model; draft = r.data;
  problems = validate(draft);
  if (!problems.length) {
    writeGuide(draft);
    writeFileSync(KEYWORDS_PATH, originalKeywords);
    addKeyword();
    problems = buildCheck();
    if (!problems.length) break;
    unlinkSync(guidePath);
    writeFileSync(KEYWORDS_PATH, originalKeywords);
  }
  log('Problems:', problems.join(' | '));
  feedback = problems;
  if (process.env.DRAFT_MOCK) break; // the mock can't improve, don't loop
}

if (problems.length) {
  output({ status: 'failed', slug: topic.slug, problems: problems.join('; ') });
  fail(`Draft still has problems after ${MAX_ATTEMPTS} attempts: ${problems.join('; ')}`);
}

// Move topic from queue to done
queueFile.queue = queueFile.queue.filter((t) => t.slug !== topic.slug);
queueFile.done = [...(queueFile.done || []), { slug: topic.slug, keyword: topic.keyword, drafted: today, model }];
writeFileSync(QUEUE_PATH, JSON.stringify(queueFile, null, 2) + '\n');

const wc = words(draft.body);
log(`✅ Draft ready: ${guidePath} (${wc} words, model ${model})`);
output({ status: 'ok', slug: topic.slug, title: draft.title, keyword: topic.keyword, words: String(wc), model, remaining: String(queueFile.queue.length) });

function output(obj) {
  if (!process.env.GITHUB_OUTPUT) return;
  for (const [k, v] of Object.entries(obj)) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, ' ')}\n`);
}
