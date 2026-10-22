// Guides are Markdown files in src/content/guides/.
// Each file's frontmatter must follow this shape, so an automated draft
// that misses a field fails the build instead of going live half-finished.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(20).max(70),          // shown as the H1 and in Google
    description: z.string().min(70).max(160),   // meta description
    summary: z.string().max(140),               // one line for cards
    keyword: z.string(),                        // primary keyword (must match seo/keywords.json)
    published: z.coerce.date(),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),           // drafts never go live
    answer: z.string(),                          // short direct answer at the top (for Google & AI answers)
    relatedTools: z.array(z.string()).default([]),
    relatedGuides: z.array(z.string()).default([]),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { guides };
