# AGENTS.md — websites (infrastructure)

Engineer-facing source of truth for the website platform. If you are a coding
agent or a developer working in this repo, read this first. This file is the
operating manual; [`docs/platform.md`](docs/platform.md) is the current state of
everything, and [`docs/design-spec.md`](docs/design-spec.md) is the rationale.

This repo is **public** and holds **no secrets**. Never commit credentials, tokens,
or private content here.

## Where to look

| Doc | |
|---|---|
| [`docs/platform.md`](docs/platform.md) | the whole setup as it stands today — start here |
| [`docs/dns.md`](docs/dns.md) | both zones, record by record. Mail is load-bearing. |
| [`docs/newsletter.md`](docs/newsletter.md) | Buttondown, end to end |
| [`docs/writing-workflow.md`](docs/writing-workflow.md) | **how Jochen writes, and what agents must not do** |
| [`docs/design-spec.md`](docs/design-spec.md) | why the platform is shaped this way |
| [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md) | connecting a new Pages project |

| Skill | |
|---|---|
| `site-platform` | the Astro engine: local dev, build, schema contract, new sites |
| `cloudflare` | Pages, deployments, domains, DNS, wrangler |
| `buttondown` | the Moment Hill newsletter, from `status: ready` to sent |
| `moment-hill-content` | content for momenthill.com |
| `shifted-knowledge-content` | content for shiftedknowledge.com |

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
git clone git@github.com:shiftedknowledge/shifted-knowledge-content.git ../website-content/shifted-knowledge

# 2. Link it into the app (creates the gitignored src/content symlink):
scripts/dev-link.sh shifted-knowledge ../website-content/shifted-knowledge

# 3. Develop:
cd sites/shifted-knowledge
npm install
./preview.sh          # live, drafts visible, opens in Safari + a LAN URL
./preview.sh final    # the exact production build (drafts hidden, images optimised)
```

Use `npm run build` for production. Neither site has a build step beyond
`astro build` today, but the npm script is the contract `build-site.sh` calls.

## How a deploy works

Cloudflare's Pages project for a site is connected to that site's **content repo**.
On a push it spins up a throwaway build machine that:

1. checks out the content repo (the connected repo),
2. clones this infra repo at the configured `INFRA_REF` (currently `main`),
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

## Newsletters

Moment Hill has a Buttondown newsletter. The operating manual is
[`docs/newsletter.md`](docs/newsletter.md); agent instructions are in
`.claude/skills/buttondown/SKILL.md`.

The shape mirrors the rest of the platform. `scripts/buttondown.mjs` is the
site-agnostic CLI, `newsletter.username` in a site's `user.config.ts` is the only
per-site config, and issues live in a `newsletters/` folder at the **root** of
that site's content repo, beside `content/` and therefore invisible to
`build-site.sh`. A site without a `newsletter` block renders an inert signup form
and costs nothing.

The newsletter is not the blog and does not read from it. Sending is always a
human act: `push` writes drafts only, and `send` refuses without `--yes`.

The API key lives in `~/.env`, never here.

## Who owns what

The repo split *is* the boundary, which is why it holds.

**Jochen owns** the words and the look: everything in the content repos, plus
`configs/user.config.ts` and `src/styles/` here. And every decision about what
goes live and when.

**Agents own** everything that is neither words nor look: Cloudflare
configuration, triggering and triaging builds, drift between `sites.yml` and
reality, domain and TLS health, dependency and Astro upgrades, the schema
contract, and the newsletter pipeline downstream of a finished issue.

Two rules fall out of that:

- **Do not write prose into a content repo unless asked.** Fixing broken
  frontmatter is maintenance. Writing a paragraph is not. The constraint is
  stronger than it looks and it is the point of the whole arrangement — read
  [`docs/writing-workflow.md`](docs/writing-workflow.md) before editing any
  content repo.
- **Do not trigger a production deploy or change a domain without saying so
  first.** Everything short of that needs no permission.

## Conventions

- British English, no em dashes, no emojis in site-visible copy.
- Node >= 22.12. npm, not pnpm.
- Public repo, secret-free. Content stays in content repos. Secrets live in
  `~/.env`, sourced explicitly: `set -a; source ~/.env; set +a`.
- Verify before calling a change done: the assembled build must exit clean
  (`scripts/build-site.sh <site> <content-repo>` locally).
