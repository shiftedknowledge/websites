# AGENTS.md — websites (infrastructure)

Engineer-facing source of truth for the website platform. If you are a coding
agent or a developer working in this repo, read this first. The full rationale is
in [`docs/design-spec.md`](docs/design-spec.md); this file is the operating manual.

This repo is **public** and holds **no secrets**. Never commit credentials, tokens,
or private content here.

---

## What this is

One piece of infrastructure that builds a small family of independent websites.
Each site has its own bespoke design; what they share is the build and deploy
plumbing, not visual code. For `n` sites there are `n + 1` repositories: this one,
plus one **private content repo per site** holding only that site's markdown and
images.

Content and infrastructure never merge into one repo. Cloudflare stitches them
together inside a throwaway build, every time a site is built.

## Layout

```
websites/
├── AGENTS.md              this file
├── sites.yml             deployment manifest (desired Cloudflare state, in git)
├── docs/design-spec.md   the full design rationale
├── scripts/
│   ├── build-site.sh     Cloudflare runs this to assemble + build a site
│   └── dev-link.sh       local: symlink a content repo into a site app
└── sites/
    └── <site>/           a complete, bespoke Astro app
        ├── CONTENT_SCHEMA   the content-schema version this app expects
        └── src/content/     assembled in at build time; gitignored, never committed
```

The markdown and images that fill `src/content/` live in the site's content repo,
not here. Everything else under `sites/<site>/` is app code and belongs here.

## Working on a site locally

```bash
# 1. Clone the site's content repo somewhere (once):
git clone git@github.com:shiftedknowledge/shifted-knowledge-content.git ../shifted-knowledge-content

# 2. Link it into the app (creates the gitignored src/content symlink):
scripts/dev-link.sh shifted-knowledge ../shifted-knowledge-content

# 3. Develop:
cd sites/shifted-knowledge
npm install
./preview.sh          # live, drafts visible, opens in Safari + a LAN URL
./preview.sh final    # the exact production build (drafts hidden, search + images)
```

`npm run build` must be used for production, never bare `astro build`: the npm
script also runs Pagefind (search) and copies it into place.

## How a deploy works

Cloudflare's Pages project for a site is connected to that site's **content repo**.
On a push it spins up a throwaway build machine that:

1. checks out the content repo (the connected repo),
2. clones this infra repo at a pinned commit SHA,
3. verifies the content repo's `content-contract.yml` schema matches the app's
   `CONTENT_SCHEMA` (aborts clearly if not),
4. copies the content into `sites/<site>/src/content`,
5. runs the app's build,
6. publishes `dist/`,
7. throws the machine away.

A failed build publishes nothing; the last good deployment stays live.

The Cloudflare build command (set per project in the dashboard) is:

```bash
git init .infra \
  && git -C .infra remote add origin "$INFRA_REPO" \
  && git -C .infra fetch --depth 1 origin "$INFRA_REF" \
  && git -C .infra checkout --detach FETCH_HEAD \
  && .infra/scripts/build-site.sh "$SITE" "$PWD"
```

with output directory `.infra/sites/<SITE>/dist` and env vars `INFRA_REPO`,
`INFRA_REF`, `SITE`, and `NODE_VERSION=22`. `INFRA_REF` accepts either a branch
name or a full commit SHA (the build does `git fetch --depth 1 origin "$INFRA_REF"`).
Full connect instructions: [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md).

## Releasing an infrastructure change

**Current default: `INFRA_REF` tracks `main`.** During active development every
build clones this repo's latest `main`, so shipping an infra/app change is:

1. Test locally (`scripts/build-site.sh <site> <content-repo>`), then push to `main`.
2. Trigger a rebuild of the affected site. Cloudflare watches the *content* repo,
   not this one, so an infra-only change needs a nudge: push a trivial commit to
   the content repo (auto-deploys), or use the site's Cloudflare "Retry deployment".
3. A failed build changes nothing live; the last good deploy stays up.

**Freezing a site to a specific version (optional).** For a production site you
want reproducible, set that site's `INFRA_REF` to a full commit **SHA** instead of
`main`. Then infra changes reach it only when you bump the SHA, and rollback is
restoring the previous SHA and redeploying. Do this per site, one at a time.

## Adding a new site

1. Create `sites/<new-site>/` as a bespoke Astro app (copy `shifted-knowledge` as a
   starting point, then give it its own design). Add its `CONTENT_SCHEMA`.
2. Add it to the `case` allowlist in `scripts/build-site.sh`.
3. Add its row to `sites.yml`.
4. Create the private content repo `shiftedknowledge/<new-site>-content` with a
   `content-contract.yml`, an `AGENTS.md`, and a `content/` tree.
5. Create the Cloudflare Pages project against the content repo and follow
   `CLOUDFLARE_SETUP.md`.

## Conventions

- British English, no em dashes, no emojis in site-visible copy.
- Node >= 22.12. npm, not pnpm.
- Public repo, secret-free. Content stays in content repos.
- Verify before calling a change done: the assembled build must exit clean
  (`scripts/build-site.sh <site> <content-repo>` locally).
