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

### 2026-10-22 (teesra hissa): Keyword research + 6 cluster guides

**Keyword research (free, bina paid tool):** Google Autocomplete se pata chala ke Amreeka mein main sawal hai **"what size power station do I need"**, aur log isay in cheezon ke saath search karte hain: refrigerator, camping, 12V refrigerator, CPAP, TV, Starlink, diesel heater, microwave. Isi par **topic cluster** banaya.
- Muqabla: is sawal par upar zyada tar brand blogs (Anker, Oukitel, OUPES) hain jo apni product bechte hain → neutral calculator hamara faida.
- Domain: Google (John Mueller, 2022): domain mein keyword se ranking bonus nahi. **BackupWatts** jaisa brand naam theek hai.
- Asli search numbers domain ke baad **Google Search Console** se aayenge.

**6 nayi guides:** camping, TV, Starlink (Standard + Mini), microwave, diesel heater (12V port ki 10 A limit vs ~20 A start-up), 12V fridge.
**Calculator data:** naya "Camping, RV & van" group (12V fridge, Starlink Mini, diesel heater, camp lights, fan, 32" TV) + Starlink Standard → ab 35 appliances.
**Mobile fix:** guides ki tables chhote phone par page ko chaura nahi karti (sideways scroll).
**Total:** 25 pages, SEO check 0 errors / 0 warnings.

### 2026-10-23: Weekly auto-draft system

**Update (same day):** Gemini key ke Google project ka **prepaid balance $0** tha → har model par HTTP 402 ("prepayment credits are depleted"). Google docs: $0 balance par us billing account ki saari keys band. Isliye `scripts/ai-providers.mjs` banaya: **Gemini → Groq → OpenRouter (:free models)** — jo key ho aur kaam kare. Har provider ke models live list se chune jaate hain. Secrets: `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (kam az kam ek).

**Kaise chalta hai:**
1. `.github/workflows/draft-guide.yml` — har **Monday 9:00 AM (Pakistan)**, ya "Run workflow" button se.
2. `scripts/draft-guide.mjs` — `seo/topic-queue.json` se agla topic leta hai, **Gemini API** se JSON draft likhwata hai (sirf queue ke checked facts + `appliances.json` ke numbers use karne ki ijazat), phir khud check karta hai: title/description lambai, keyword title + description + pehle jumle mein, 850–1,100 words, 5–7 headings, 1 table, koi link/brand nahi. Phir poori site **build + SEO check**. Galti ho to AI ko galti bata kar dobara (3 koshishen).
3. Pass hone par branch `draft/<slug>` + **Pull Request** (Roman Urdu instructions ke saath). **Merge = live**, Close = kuch nahi.
4. Jis topic ka PR khula ho, agli dafa woh dobara nahi likha jata.

**Topic queue (8, facts haath se check kiye):** store a power station, window AC, chest freezer, laptop, electric blanket, coffee maker, how long to charge, home backup.
**Models:** script har run par Google se live model list leta hai aur behtareen text "Flash" model khud chunta hai (purane hard-coded naam 2026-10-23 ko 404 dene lage the). Repo variable `GEMINI_MODELS` set ho to woh pehle try hote hain.
**User ka ek-dafa setup:** `GEMINI_API_KEY` secret + Actions ko PR banane ki ijazat (Settings → Actions → General).
**Test:** mock jawab se poora flow test kiya (kharab draft ruk gaya, achha draft build + SEO pass, queue update, skip logic).

## Agla kaam (Next)

1. Queue mein aur topics (har 2 mahine ~8) — Search Console data aane ke baad usi se.
2. Aur guides (keyword map pehle): "how long will a power station run a CPAP", "solar generator vs generator", "power station for camping/RV", "how to store a power station"
3. EV charging section (Autel/EVDANCE affiliate, 8–15%)
4. Domain ke baad: Search Console, Cloudflare Pages, contact email, AdSense apply, affiliate links (Awin via Payoneer)

## Domain lene ke baad kya badalna hai

1. `.github/workflows/deploy.yml` mein `SITE_URL` = aap ka domain, `BASE_PATH` = `/`, `PUBLIC_PREVIEW` = `"false"`
2. `public/robots.txt` mein sitemap ka link
3. `src/lib/site.js` mein naam aur `contactEmail`
