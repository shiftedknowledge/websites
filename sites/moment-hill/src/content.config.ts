import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

export const POSTS_PATH = "src/content/posts/";
export const PAGES_PATH = "src/content/pages/";
export const FRAMEWORKS_PATH = "src/content/frameworks/";
export const EXPLAINERS_PATH = "src/content/explainers/";

const dedupeLower = (arr: string[]) =>
  Array.from(new Set(arr.map((s) => s.toLowerCase())));

// Blog posts. Filename = slug (flat, lowercase, hyphenated).
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `./${POSTS_PATH}` }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).transform(dedupeLower).optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Standalone prose pages: consulting, about, privacy, terms — and home.md, which
// carries the hero copy consumed by index.astro (the extra optional fields below).
const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `./${PAGES_PATH}` }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    // home.md only:
    tagline: z.string().optional(),
    intro: z.string().optional(),
    offerings: z
      .array(
        z.object({
          eyebrow: z.string(),
          title: z.string(),
          blurb: z.string(),
          ctaLabel: z.string(),
          ctaHref: z.string(),
        }),
      )
      .optional(),
    foundation: z
      .object({ label: z.string().optional(), headline: z.string(), blurb: z.string().optional() })
      .optional(),
  }),
});

// Frameworks: article + images + an optional buy link to the MoR. Multi-category,
// newest-first, filtered on the overview. New framework = one file.
const frameworks = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `./${FRAMEWORKS_PATH}` }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    categories: z.array(z.string()).transform(dedupeLower).default([]),
    cover: z.string().optional(),
    buyUrl: z.string().url().optional(),
    buyLabel: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Explainers: articles that sit between blog posts and frameworks.
// Same shape as a framework, but educational (no buy link) and tagged with a
// single difficulty level (beginner / intermediate / advanced) for the filter.
const explainers = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `./${EXPLAINERS_PATH}` }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, pages, frameworks, explainers };
