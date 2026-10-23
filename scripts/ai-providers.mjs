// Talks to AI providers for the auto-draft system. Tries each provider whose
// key is set, in order: Gemini → Groq → Mistral → Cerebras → OpenRouter. If one fails (no credit,
// rate limit, retired model…), it moves on to the next one automatically.
//
// Keys (GitHub → Settings → Secrets and variables → Actions):
//   GEMINI_API_KEY      Google AI Studio
//   GROQ_API_KEY        console.groq.com (free tier)
//   MISTRAL_API_KEY     console.mistral.ai ("Experiment" free plan)
//   CEREBRAS_API_KEY    cloud.cerebras.ai (free tier)
//   OPENROUTER_API_KEY  openrouter.ai (free ":free" models)
// Optional repo variables: GEMINI_MODELS, GROQ_MODELS, MISTRAL_MODELS, CEREBRAS_MODELS, OPENROUTER_MODELS

const log = (...m) => console.log('[ai]', ...m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

class ProviderError extends Error {
  constructor(provider, why, detail = '') { super(why); this.provider = provider; this.why = why; this.detail = detail; }
}

async function request(url, opts) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(180000) });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  } catch (e) {
    return { status: 0, ok: false, text: String(e) };
  }
}

/** Pull a JSON object out of a model reply (handles ```json fences and chatter). */
export function parseJsonReply(text) {
  const t = (text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}

// ---------------- Gemini ----------------
export function rankGemini(names) {
  const bad = /(image|tts|audio|live|embed|vision|robotics|computer|native|learnlm|gemma|nano|veo|imagen|aqa|banana|lyria|guard|deep-research|omni)/i;
  const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
  const tier = (n) => (/flash-lite/.test(n) ? 1 : /flash/.test(n) ? 0 : /pro/.test(n) ? 2 : 3);
  const preview = (n) => (/(preview|exp|experimental)/.test(n) ? 1 : 0);
  const alias = (n) => (/latest/.test(n) ? 1 : 0);
  return [...new Set(names)]
    .filter((n) => /^gemini-/.test(n) && !bad.test(n) && tier(n) < 3)
    .sort((a, b) => tier(a) - tier(b) || preview(a) - preview(b) || version(b) - version(a) || alias(a) - alias(b) || a.localeCompare(b));
}

function geminiWhy(status, body) {
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(body)) return 'Gemini key ghalat hai — nayi key bana kar GEMINI_API_KEY secret dobara save karein.';
  if (status === 402 || /prepayment credits/i.test(body)) return 'Gemini ke Google project ka prepaid balance khatam hai (402) — free key ke liye billing ke baghair naya Google account/project chahiye, ya AI Studio mein credit daalein.';
  if (status === 401 || status === 403) return 'Gemini ne key ko ijazat nahi di (403).';
  if (status === 429) return 'Gemini ki free limit poori hai (429).';
  if (status === 0) return 'Gemini tak connection nahi bana.';
  return `Gemini error (HTTP ${status}).`;
}

async function gemini({ system, prompt, schema }) {
  const key = process.env.GEMINI_API_KEY;
  const H = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
  const lr = await request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: H });
  let models = list(process.env.GEMINI_MODELS);
  if (lr.ok) {
    const usable = (JSON.parse(lr.text).models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
    models = [...new Set([...models, ...rankGemini(usable)])].slice(0, 5);
  } else if (lr.status === 400 || lr.status === 401 || lr.status === 403) {
    throw new ProviderError('gemini', geminiWhy(lr.status, lr.text), lr.text.slice(0, 200));
  } else if (!models.length) models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  log('Gemini models:', models.join(', '));

  let last = null;
  for (const model of models) {
    let useSchema = true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: H,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json', ...(useSchema ? { responseSchema: schema } : {}) },
        }),
      });
      if (r.ok) {
        const json = JSON.parse(r.text);
        const text = (json.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
        const data = parseJsonReply(text);
        if (data) return { model: `gemini/${model}`, data };
        last = new ProviderError('gemini', 'Gemini ka jawab JSON nahi tha.'); break;
      }
      log(`gemini/${model}: HTTP ${r.status} ${r.text.slice(0, 160).replace(/\s+/g, ' ')}`);
      last = new ProviderError('gemini', geminiWhy(r.status, r.text), r.text.slice(0, 200));
      // Billing / key problems apply to every model on this key — stop trying Gemini.
      if (r.status === 402 || /prepayment credits/i.test(r.text) || r.status === 401 || r.status === 403 ||
          (r.status === 400 && /API_KEY_INVALID|API key not valid/i.test(r.text))) throw last;
      if (r.status === 400 && useSchema) { useSchema = false; continue; }
      if (r.status === 429 && attempt === 1) { await sleep(30000); continue; }
      break;
    }
  }
  throw last || new ProviderError('gemini', 'Koi Gemini model kaam nahi kiya.');
}

// ---------------- OpenAI-compatible (Groq, OpenRouter) ----------------
const OPENAI_STYLE = {
  groq: {
    label: 'Groq',
    keyEnv: 'GROQ_API_KEY',
    base: 'https://api.groq.com/openai/v1',
    modelsEnv: 'GROQ_MODELS',
    // Bigger, newer text models first.
    prefer: [/gpt-oss-120b/, /kimi-k2/, /llama-4-maverick/, /llama-3\.3-70b/, /qwen.*32b/, /gpt-oss-20b/, /llama-4-scout/],
    skip: /(whisper|tts|guard|embed|vision|playai|orpheus|compound|prompt-guard|distil|8b|instant)/i,
    headers: {},
  },
  mistral: {
    label: 'Mistral',
    keyEnv: 'MISTRAL_API_KEY',
    base: 'https://api.mistral.ai/v1',
    modelsEnv: 'MISTRAL_MODELS',
    prefer: [/^mistral-large-latest$/, /^mistral-medium-latest$/, /^mistral-large/, /^mistral-medium/, /^mistral-small-latest$/, /^mistral-small/],
    skip: /(embed|moderation|ocr|codestral|devstral|pixtral|voxtral|ministral|saba|magistral)/i,
    requirePrefer: true,
    headers: {},
  },
  cerebras: {
    label: 'Cerebras',
    keyEnv: 'CEREBRAS_API_KEY',
    base: 'https://api.cerebras.ai/v1',
    modelsEnv: 'CEREBRAS_MODELS',
    prefer: [/gpt-oss-120b/, /qwen-3-235b/, /llama-3\.3-70b/, /zai-glm/, /llama-4/, /qwen-3-32b/],
    skip: /(8b|embed)/i,
    headers: {},
  },
  openrouter: {
    label: 'OpenRouter',
    keyEnv: 'OPENROUTER_API_KEY',
    base: 'https://openrouter.ai/api/v1',
    modelsEnv: 'OPENROUTER_MODELS',
    prefer: [/deepseek.*(v3|chat|r1)/, /qwen3.*(235b|coder|max)/, /llama-3\.3-70b/, /gpt-oss-120b/, /gemini.*flash/, /mistral.*(large|medium|small-3)/, /glm/, /kimi/],
    skip: /(vision|image|audio|embed|guard|tts|[^0-9](1|3|4|7|8|9)b)/i,
    onlyFree: true,
    headers: { 'HTTP-Referer': 'https://github.com/Sarmads050/backup-power-site', 'X-Title': 'BackupWatts drafts' },
  },
};

function rankOpenAIStyle(cfg, ids) {
  const score = (id) => { const i = cfg.prefer.findIndex((re) => re.test(id)); return i < 0 ? 99 : i; };
  return ids
    .filter((id) => !cfg.skip.test(id) && (!cfg.onlyFree || /:free$/.test(id)) && (!cfg.requirePrefer || score(id) < 99))
    .sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}

function openAIWhy(label, status) {
  if (status === 401 || status === 403) return `${label} key ghalat hai ya ijazat nahi (HTTP ${status}).`;
  if (status === 402) return `${label} account mein credit nahi (402).`;
  if (status === 429) return `${label} ki free limit poori hai (429).`;
  if (status === 0) return `${label} tak connection nahi bana.`;
  return `${label} error (HTTP ${status}).`;
}

async function openAIStyle(name, { system, prompt }) {
  const cfg = OPENAI_STYLE[name];
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env[cfg.keyEnv]}`, ...cfg.headers };
  const lr = await request(`${cfg.base}/models`, { headers: H });
  if (lr.status === 401 || lr.status === 403) throw new ProviderError(name, openAIWhy(cfg.label, lr.status));
  const ids = lr.ok ? (JSON.parse(lr.text).data || []).map((m) => m.id) : [];
  const models = [...new Set([...list(process.env[cfg.modelsEnv]), ...rankOpenAIStyle(cfg, ids)])].slice(0, 4);
  if (!models.length) throw new ProviderError(name, `${cfg.label} par koi munasib model nahi mila.`);
  log(`${cfg.label} models:`, models.join(', '));

  let last = null;
  for (const model of models) {
    let jsonMode = true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await request(`${cfg.base}/chat/completions`, {
        method: 'POST', headers: H,
        body: JSON.stringify({
          model,
          temperature: 0.6,
          max_tokens: 6000,
          messages: [
            { role: 'system', content: `${system}\nReply with ONE JSON object only — no markdown fences, no commentary.` },
            { role: 'user', content: prompt },
          ],
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (r.ok) {
        const json = JSON.parse(r.text);
        const data = parseJsonReply(json.choices?.[0]?.message?.content || '');
        if (data) return { model: `${name}/${model}`, data };
        last = new ProviderError(name, `${cfg.label} ka jawab JSON nahi tha.`); break;
      }
      log(`${name}/${model}: HTTP ${r.status} ${r.text.slice(0, 160).replace(/\s+/g, ' ')}`);
      last = new ProviderError(name, openAIWhy(cfg.label, r.status), r.text.slice(0, 200));
      if (r.status === 401 || r.status === 403) throw last;
      if (r.status === 400 && jsonMode) { jsonMode = false; continue; }
      if (r.status === 429 && attempt === 1) { await sleep(30000); continue; }
      break;
    }
  }
  throw last || new ProviderError(name, `${cfg.label} ka koi model kaam nahi kiya.`);
}

// ---------------- Public ----------------
const PROVIDERS = [
  { name: 'gemini', keyEnv: 'GEMINI_API_KEY', run: gemini },
  { name: 'groq', keyEnv: 'GROQ_API_KEY', run: (a) => openAIStyle('groq', a) },
  { name: 'mistral', keyEnv: 'MISTRAL_API_KEY', run: (a) => openAIStyle('mistral', a) },
  { name: 'cerebras', keyEnv: 'CEREBRAS_API_KEY', run: (a) => openAIStyle('cerebras', a) },
  { name: 'openrouter', keyEnv: 'OPENROUTER_API_KEY', run: (a) => openAIStyle('openrouter', a) },
];

let preferred = ''; // provider that worked last time in this run

/**
 * Ask the first working provider for a JSON answer.
 * Returns { model, data } or throws an Error whose message explains every
 * provider's problem in plain Roman Urdu.
 */
export async function askAI({ system, prompt, schema }) {
  const available = PROVIDERS.filter((p) => process.env[p.keyEnv]);
  if (!available.length) {
    throw new Error('Koi AI key nahi mili. GitHub secrets mein GEMINI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY ya OPENROUTER_API_KEY mein se kam az kam ek daalein.');
  }
  const order = preferred ? [...available.filter((p) => p.name === preferred), ...available.filter((p) => p.name !== preferred)] : available;
  const problems = [];
  for (const p of order) {
    try {
      const out = await p.run({ system, prompt, schema });
      preferred = p.name;
      log(`Used ${out.model}`);
      return out;
    } catch (e) {
      log(`${p.name} failed: ${e.why || e.message}`);
      problems.push(e.why || e.message);
    }
  }
  const missing = PROVIDERS.filter((p) => !process.env[p.keyEnv]).map((p) => p.keyEnv);
  const tip = missing.length ? ` Backup ke liye ${missing.join(' / ')} secret bhi add kar sakte hain.` : '';
  throw new Error(problems.join(' | ') + tip);
}
