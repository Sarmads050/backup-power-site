# BackupWatts

Free calculators and guides for sizing portable power stations, solar generators and home batteries.

- Built with [Astro](https://astro.build) (static site).
- Every push to `main` deploys automatically via `.github/workflows/deploy.yml`.
- Project history and next steps: see `PROJECT_LOG.md`.

## Run locally

```bash
npm ci
npm run dev
```

## Structure

- `src/pages/` — every page on the site
- `src/components/` — reusable pieces (calculators, tool grid)
- `src/lib/powerMath.js` — calculator maths
- `src/data/` — appliance wattages and the list of tools

## Weekly auto-draft

`.github/workflows/draft-guide.yml` runs every Monday (and on demand). It takes the next topic from
`seo/topic-queue.json`, asks Gemini for a draft (`scripts/draft-guide.mjs`), validates it, runs the full
build + SEO check, and opens a Pull Request. Merging the PR publishes the guide.

Needs the repository secret `GEMINI_API_KEY`, and Actions must be allowed to create pull requests
(Settings → Actions → General → Workflow permissions).

Test locally without a key: `DRAFT_MOCK=response.json node scripts/draft-guide.mjs`.
