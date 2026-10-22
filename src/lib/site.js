// One place for site-wide settings. Change the name here once the domain is chosen.
export const SITE = {
  name: 'BackupWatts',
  tagline: 'Honest calculators for home backup power',
  description:
    'Free calculators and plain-English guides to help you size a portable power station, solar generator or home battery for power outages, camping and RVs.',
  // Contact email is added once the domain (and a domain email) exists.
  contactEmail: '',
  launchYear: 2026,
};

// Builds a link that works both on the GitHub Pages preview (/backup-power-site/)
// and later on the real domain (/).
export function url(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

export const NAV = [
  { label: 'Calculators', href: '/calculators/' },
  { label: 'About', href: '/about/' },
];
