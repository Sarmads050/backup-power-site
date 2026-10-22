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
