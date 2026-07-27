---
name: site-platform
description: Run the Astro engine behind the websites — local preview, the assemble-and-build script, the content schema contract, adding or changing a collection, upgrading dependencies, and adding a new site. Use when working on site code, layouts, components, styles, astro.config, content.config, or when a build fails.
---

# The site platform

The engine under both websites. Content lives elsewhere and is stitched in at
build time; this skill is about the app code and the build.

Read [`docs/platform.md`](../../../docs/platform.md) for current state and
[`AGENTS.md`](../../../AGENTS.md) for the operating rules. Deploy and Cloudflare
questions belong to the `cloudflare` skill.

## The architecture in four lines

```
websites/                 public, this repo — apps, build scripts, no content
  sites/<site>/           a complete, bespoke Astro app
    CONTENT_SCHEMA        the content-schema version this app expects
    src/content/          assembled at build time. Gitignored. Never committed.
<site>-content/           private repo — markdown and images only
```

For `n` sites, `n + 1` repositories. Content and infrastructure never merge.
Two apps share the plumbing and **nothing visual**. Do not refactor a component
into a shared one because both sites have something like it; bespoke design is
the point, not an accident.

## Local development

```bash
# once per site
git clone git@github.com:shiftedknowledge/<site>-content.git ../website-content/<site>
scripts/dev-link.sh <site> ../website-content/<site>

cd sites/<site> && npm install
./preview.sh          # live reload, drafts visible
./preview.sh final    # the exact production build — drafts hidden, search, images
```

`dev-link.sh` symlinks `sites/<site>/src/content` at the content repo's
`content/` directory. That path is gitignored, so the link is never committed.
On Cloudflare the equivalent step is a real copy.

`build-site.sh` knows about the symlink and removes the **link** before wiping,
so it never `rm -rf`s through it into the real content. Preserve that if you
touch the script.

## The real build

```bash
scripts/build-site.sh <site> ../website-content/<site>
```

This is byte for byte what Cloudflare runs. **It is the verification step** —
"the change looks right in dev" is not enough, because dev renders drafts and
skips Pagefind. Run it before calling any app change done.

What it does, in order: allowlist the site name, check
`content-contract.yml`'s `schema:` against the app's `CONTENT_SCHEMA`, wipe and
repopulate `src/content/` from every `content/*/` directory, `npm ci && npm run
build`, then confirm `dist/` is non-empty.

It writes **only** into `sites/<site>/src/content`. Keep it that way.

## The content contract, and its blind spot

`CONTENT_SCHEMA` (app) must equal `schema:` (content repo). Mismatch aborts the
build with a clear message. Both are `1` today.

**The contract catches version skew, not collection renames.** Renaming a
collection is a two-repo change: `content.config.ts` here, the directory in the
content repo. Both sides keep `schema: 1`, so the guard passes happily and the
build ships an empty section. The tutorials → explainers rename hit exactly
this.

So when a collection is added, renamed or removed:

1. Change `src/content.config.ts` and every page that reads it.
2. Change the directory in the content repo.
3. Bump `CONTENT_SCHEMA` **and** `content-contract.yml` together, or accept that
   the guard will not save you.
4. Run `build-site.sh` against the real content checkout and check the section
   is populated, not merely that the build exits zero.

## Collections today

| | Shifted Knowledge | Moment Hill |
|---|---|---|
| `posts` | yes, `category: Essay \| Note` | yes |
| `pages` | yes | yes, `home.md` carries hero copy |
| `frameworks` | — | yes, optional buy link |
| `explainers` | — | yes, `level` drives the filter |

Schemas are Zod in `src/content.config.ts`, loaded with `glob`. **Filename is
the slug** — flat, lowercase, hyphenated. Never `my-thing/index.md`; the URL
would become `/my-thing/index`.

## Site-specific facts that look like bugs

- **Moment Hill has no Pagefind.** Its `npm run build` is a bare `astro build`.
  Shifted Knowledge's also runs Pagefind and copies the index into `public/`.
  This asymmetry is a decision. Do not "fix" it.
- **`home.md`'s `intro` and `foundation.headline` are plain text, not
  markdown.** `index.astro` escapes them and hand-renders `**bold**` and
  paragraph breaks. Anything else — links, lists, italics — appears literally.
- **Both sites serve apex and `www` with 200**, no redirect. Canonical tags
  point at the apex, so this consolidates correctly.

## Stack

Astro 6.4.x, Tailwind v4 via `@tailwindcss/vite` (no PostCSS config, no
`tailwind.config.js` — theme tokens are `@theme inline` custom properties in
`src/styles/theme.css`). Node >= 22.12. **npm, not pnpm**, despite a stale
`pnpm` reference in Shifted Knowledge's `format` script.

Shifted Knowledge additionally has Satori/resvg for OG images, glightbox, and
Biome. Moment Hill has neither Biome nor OG image generation.

## Adding a new site

1. `sites/<new-site>/` as a bespoke Astro app. Copy one of the existing ones as
   a starting point, then give it its own design. Add `CONTENT_SCHEMA`.
2. Add it to the `case` allowlist in `scripts/build-site.sh`. The build refuses
   unknown names by design — never make that lookup dynamic.
3. Add its row to `sites.yml`.
4. Create the private content repo with `content-contract.yml`, `AGENTS.md`,
   `README.md`, scaffold scripts, and a `content/` tree.
5. Create the Cloudflare Pages project against the **content** repo, per
   [`CLOUDFLARE_SETUP.md`](../../../CLOUDFLARE_SETUP.md).
6. If it needs a newsletter, add a `newsletter` block to its `user.config.ts`
   and a root-level `newsletters/` folder in its content repo.

## Boundaries

**Do not edit** without being asked: anything in a content repo's `content/`,
`configs/user.config.ts`, `src/styles/`. Those are Jochen's — words and look.
See [`docs/writing-workflow.md`](../../../docs/writing-workflow.md).

**Do freely:** layouts, components, utils, build scripts, config, dependencies,
diagnosis of any of the above.

**Conventions:** British English, no em dashes, no emojis in site-visible copy.
This repo is public and holds no secrets.

**Verify before calling it done.** `scripts/build-site.sh <site>
../website-content/<site>` must exit clean, and the pages you changed must
actually render.
