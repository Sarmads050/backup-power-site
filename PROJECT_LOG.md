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

### 2026-10-22 (doosra hissa): SEO + user-friendly system + 3 nayi cheezein

**SEO ka pakka nizam (user ki shart: shuru se aakhir tak SEO-friendly):**
- `seo/keywords.json` — **keyword map**: har page ka ek primary keyword (2 pages ka same keyword nahi, taake aapas mein muqabla na ho) + secondary keywords.
- `scripts/seo-check.mjs` — **har build par khud chalta hai**. Agar kisi page ke title, H1, meta description ya pehle 150 words mein primary keyword na ho, ya 2 H1 hon, ya link toota ho, ya schema kharab ho → **build ruk jata hai, kuch live nahi hota**. Title/description ki lambai, thin content (<400 words) aur internal links par warning.
- Har page: canonical, Open Graph + share image (`public/og-default.png`), Organization schema, breadcrumbs (BreadcrumbList schema), "Keep going" related links block.
- Calculators: WebApplication + FAQPage schema. Guides: Article + FAQPage schema, "Short answer" box (Google/AI answers ke liye), table of contents.
- `/llms.txt` — AI search engines ke liye site ka naqsha (khud banta hai).
- Sitemap, robots, noindex sirf preview par.
- **Naya page banate waqt:** pehle `seo/keywords.json` mein uska keyword daalo, warna checker warning dega.

**User-friendly / responsive:**
- Mobile par Power Station calculator mein neeche **chipki hui result patti** (scroll karte hue bhi jawab nazar aaye).
- Skip-to-content link, keyboard focus outline, bare tap targets, nav mein current page highlight, footer mein saare calculators.
- Har page 390px (phone) aur 1280px (computer) par test — koi page bahar nahi phailta.

**Nayi cheezein:**
- **Generator vs Power Station Cost Calculator** (`/calculators/generator-vs-power-station-cost/`) — 5 saal ka kharcha, saal-ba-saal table, break-even, longest outage warning. Defaults: gas $4.27/gal (AAA, 22 Oct 2026), bijli 18¢/kWh (EIA 2026 forecast) — `src/lib/costMath.js` mein update karein.
- **CPAP Battery Runtime Calculator** (`/calculators/cpap-battery-runtime/`) — 3 presets (35/60/90 W), AC vs DC, power-supply worst case, 2/3 raat ke liye battery size.
- **Guides system** — `src/content/guides/*.md`. `draft: true` wali guide kabhi live nahi hoti (aage auto-draft system isi se chalega).
- **5 guides:** refrigerator, watts vs watt-hours, LiFePO4 vs lithium-ion, sump pump, space heater.
- Home page par "Popular guides".

## Agla kaam (Next)

1. Auto-draft system (GitHub Actions + AI API): roz/hafte 1 guide ka draft `draft: true` ke saath → user approve kare → live. API key user dega.
2. Aur guides (keyword map pehle): "how long will a power station run a CPAP", "solar generator vs generator", "power station for camping/RV", "how to store a power station"
3. EV charging section (Autel/EVDANCE affiliate, 8–15%)
4. Domain ke baad: Search Console, Cloudflare Pages, contact email, AdSense apply, affiliate links (Awin via Payoneer)

## Domain lene ke baad kya badalna hai

1. `.github/workflows/deploy.yml` mein `SITE_URL` = aap ka domain, `BASE_PATH` = `/`, `PUBLIC_PREVIEW` = `"false"`
2. `public/robots.txt` mein sitemap ka link
3. `src/lib/site.js` mein naam aur `contactEmail`
