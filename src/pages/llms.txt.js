// /llms.txt — a plain-text map of the site for AI search engines and assistants.
// Built automatically from the tools list and published guides.
import { getCollection } from 'astro:content';
import { SITE, url } from '../lib/site.js';
import { TOOLS } from '../data/tools.js';

export async function GET({ site }) {
  const abs = (p) => new URL(url(p), site).href;
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    'All calculators run in the browser, show their formulas, and use typical US (120 V) appliance figures that users can override.',
    '',
    '## Calculators',
    ...TOOLS.filter((t) => t.live).map((t) => `- [${t.title}](${abs(`/calculators/${t.slug}/`)}): ${t.blurb}`),
    '',
    '## Guides',
    ...guides.map((g) => `- [${g.data.title}](${abs(`/guides/${g.id}/`)}): ${g.data.summary}`),
    '',
    '## About',
    `- [About ${SITE.name}](${abs('/about/')})`,
    `- [Affiliate disclosure](${abs('/affiliate-disclosure/')})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
