# BackupWatts — Project Log

Yeh file is project ki "yaad-dasht" hai: kya bana, kyun bana, aur aage kya banana hai.
Har kaam ke baad isay update kiya jata hai.

## Faisle (Decisions)

| Tareekh | Faisla |
|---|---|
| 2026-10-22 | Niche: **Home Backup Power** (portable power stations + solar). EV charging baad mein. |
| 2026-10-22 | Website **English** mein, US audience ke liye (AdSense/affiliate ki kamai wahan zyada). |
| 2026-10-22 | Working naam: **BackupWatts** (domain lene se pehle badla ja sakta hai — `src/lib/site.js`). |
| 2026-10-22 | Technology: **Astro** (fast static site) + **GitHub Pages** preview. Domain ke baad Cloudflare Pages. |
| 2026-10-22 | Preview par Google indexing **band** (noindex), taake baad mein asli domain se duplicate na bane. |
| 2026-10-22 | Product ke specs/prices tab tak site par nahi daalenge jab tak verify na ho jayein. |

## Ab tak kya bana (Built)

- **Website ka dhancha:** header, footer, design (light + dark mode), SEO tags, sitemap, schema.
- **Flagship tool:** Power Station Size Calculator (`/calculators/power-station-size/`)
  - 28 appliances, 5 categories, apni device add karne ka option
  - Capacity (Wh), continuous output (W), surge (W), daily use, runtime table, solar option
  - Maths: 15% inverter loss + 20% safety buffer + 25% output headroom
  - FAQ (FAQPage schema), "how it works", example, safety notes
- **Zaroori pages:** About, Contact, Privacy Policy (AdSense-ready), Affiliate Disclosure, Terms, 404
- **Auto-deploy:** `main` branch par push → GitHub Actions build → GitHub Pages
- **Live preview:** https://sarmads050.github.io/backup-power-site/ (2026-10-22)
- **Solar Charging Time Calculator** (`/calculators/solar-charging-time/`) — 2026-10-22
  - Battery Wh, charge %, max solar input, panel watts (100/200/400/800 shortcuts), 7 US sun regions
  - Batata hai: kitne ghante/din, solar se roz kitni energy, 1 din mein charge ke liye kitne panel watts
  - Power Station calculator ka result `?wh=` ke zariye khud bhar jata hai
- **Appliance Wattage Chart** (`/calculators/appliance-wattage/`) — `appliances.json` se khud banta hai (data badlo → chart badle)

## Agla kaam (Next)

1. Generator vs Power Station Cost Calculator
2. CPAP Battery Runtime Calculator
3. Pehle 5 guides (drafts automation se, aap approve karenge)
4. Auto-draft system (GitHub Actions + AI API) — API key aap denge
5. Domain ke baad: Search Console, Cloudflare Pages, contact email, AdSense apply

## Domain lene ke baad kya badalna hai

1. `.github/workflows/deploy.yml` mein `SITE_URL` = aap ka domain, `BASE_PATH` = `/`, `PUBLIC_PREVIEW` = `"false"`
2. `public/robots.txt` mein sitemap ka link
3. `src/lib/site.js` mein naam aur `contactEmail`
