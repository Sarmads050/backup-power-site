// Site settings.
// Abhi (preview): GitHub Pages par https://sarmads050.github.io/backup-power-site/
// Domain lene ke baad: SITE_URL ko apne domain par aur BASE_PATH ko "/" kar dein
// (yeh dono .github/workflows/deploy.yml mein set hote hain).
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = process.env.SITE_URL || 'https://sarmads050.github.io';
const BASE_PATH = process.env.BASE_PATH || '/backup-power-site';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
