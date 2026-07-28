# Web Platform — Design Specification

**From:** PM (Jochen)
**To:** Engineer (Claude / coding agent)
**Status:** For review. Do not build until approved.
**Date:** 2026-07-23 (revised after engineering review)

> **Current-state note, 2026-07-28:** this records the rationale that led to the
> platform, but two implementation choices changed during active development.
> Production `INFRA_REF` follows `main` unless a site is deliberately frozen to a
> commit SHA, and content entries are flat `<slug>.md` files. For operational
> facts, [`platform.md`](platform.md) and [`../AGENTS.md`](../AGENTS.md) win.

This document specifies how to build and run a small family of independent
websites (Shifted Knowledge, Moment Hill, and later a third) on one shared piece
of infrastructure. Every design decision here is settled: the engineer should not
need to make architectural choices, only implement. It is also written to stay
readable for the PM, so the "why" sits next to the "what".

---

## 1. The idea in one paragraph

Each website has its own design; there is no shared template. What is shared is the
*plumbing*: the build process, the deploy process, and the conventions. To keep
content people from ever touching that plumbing, and to let content be produced
from anywhere including a phone, **content and infrastructure live in separate
repositories**. The infrastructure lives centrally and is the engineer's domain.
Each site's content lives in its own small repository and is the content person's
domain. Cloudflare stitches the two together, in the cloud, every time a site is
built. The two repositories never merge into one.

**What the boundary does and does not protect.** A content contributor cannot
alter, damage, or reach the infrastructure, and cannot affect any other site. That
is the guarantee. It is *not* a guarantee that content can never fail: bad content
(a schema violation, malformed frontmatter, a missing image, a duplicate slug) can
still fail *its own* site's build. When that happens the build simply stops and the
last successfully published version of that one site stays live (see section 5).
The blast radius of a mistake is one site's next deploy, never the platform.

## 2. Decisions locked

These are settled. Review them; this list is the thing to get right before we build.

1. **One infrastructure repo, plus one content repo per site.** For `n` sites there
   are `n + 1` repositories.
2. **All repositories live under a single `shiftedknowledge` GitHub owner.** This is
   currently a *personal* account. Before we accumulate repos it should become a
   GitHub **organisation**, so access can be granted per repo (and later per team)
   rather than the coarse owner/collaborator model a personal account allows. This
   is the one structural decision flagged for you in section 10.
3. **The infrastructure repo is public** (it holds no secrets), so the build can
   clone it without credentials. This knowingly makes all site *source* (layout,
   components, copy, and git history) publicly readable. That is acceptable for a
   blog; it is a deliberate acceptance to confirm for Moment Hill (section 7).
   Write access to the infra repo stays with the owner only.
4. **Each content repo is private**, and write access is granted per person, per
   repo. A content contributor can push to their one content repo and nothing else.
5. **Each site has its own bespoke design.** No universal template. Sites share the
   build/deploy tooling and conventions, but no visual templates or site-specific
   components. SK is a blog, Moment Hill is commerce, the third will be something
   in between.
6. **One Cloudflare account** hosts one Pages project per content repo, and **each
   site has its own custom domain**.
7. **Cloudflare builds the content repo**, not the infrastructure repo. The build
   pulls the infrastructure in at the configured `INFRA_REF` (see section 5).
8. **`INFRA_REF` can be `main` or an immutable commit SHA.** The current default is
   `main` during active development. Freeze an individual site to a SHA when
   reproducibility and deliberate per-site rollout matter more than immediacy.
9. **A failed content build never replaces the live site.** Cloudflare keeps the
   last successful deployment serving until a build succeeds. Publishing is
   fail-safe by default.
10. **Auto-deploy is on.** A push to a content repo's production branch rebuilds and
    publishes that site (usually within a few minutes).
11. **Draft control is a per-entry frontmatter flag** (`draft: true`), and the
    platform holds this invariant: every production-facing surface excludes drafts,
    while drafts are still schema-validated. Concretely, `draft: true` entries are
    excluded from page routes, listing pages, RSS, and the sitemap; but a draft
    with broken frontmatter still fails validation. A draft is
    pushed and synced like any file, and stays invisible on the live site until the
    flag is cleared. This is how "save" and "publish" are separated with no extra
    machinery. (The Lipi theme SK is built on already implements this; the engineer
    confirms RSS and sitemap honour it too.)
12. **Content is editable from mobile** (the Working Copy git app on iOS), because a
    content repo is pure text and images with no build step. The Mac is needed only
    for design or infrastructure changes.

## 3. Repository layout

### The infrastructure repo (`shiftedknowledge/websites`)

Local path `/Users/jochen/CODE/websites`. Public. Owner-write only.

```
websites/
├── AGENTS.md            engineer-facing brain: how the platform works, how to add a site
├── sites.yml            non-secret deployment manifest: project, branch, output, domain per site
├── docs/                specs and guides (this document lives here)
├── scripts/
│   └── build-site.sh    the one script Cloudflare runs to assemble a site (section 5)
└── sites/
    ├── shifted-knowledge/   a complete, bespoke Astro app (the SK blog design)
    ├── moment-hill/         a complete, bespoke Astro app (commerce design)
    └── <third-site>/        added later
```

Each folder under `sites/` is a full Astro project with its own theme, components,
and build config. They share the build tooling and conventions, and nothing visual.

`sites.yml` records the desired deployment state for every site (Cloudflare project
name, production branch, output directory, domain, and the required content-schema
version) so that configuration lives in git and not only in the Cloudflare
dashboard. The dashboard remains where a build actually runs; this file is the
readable source of truth for what each project *should* be set to.

### A content repo (`shiftedknowledge/<site>-content`, e.g. `shifted-knowledge-content`)

Private. Per-contributor write. Pure content, no build tooling.

```
<site>-content/
├── content-contract.yml   site id + content-schema version this repo targets
├── content/
│   ├── posts/             one flat markdown file per post; the filename is the slug
│   │   ├── my-post.md         a post
│   │   └── my-post.hero.jpg   its image, co-located, referenced as ./my-post.hero.jpg
│   └── pages/             standalone pages (about, etc.)
├── AGENTS.md              brand, voice, background, AND the content contract (below)
└── new-post.sh            (optional) a tiny helper that scaffolds a new entry
```

Posts are **flat files, not folders**: a post is `posts/my-post.md`, published at
`/posts/my-post`. The site derives a post's slug from the last path segment, so a
`posts/my-post/index.md` layout would wrongly publish as `/posts/my-post/index`.
Images therefore sit beside the post file (`posts/my-post.hero.jpg`) and are
referenced relatively (`![alt](./my-post.hero.jpg)`) so the build optimises them.

A content person sees only this. There is no Astro here, no build config, nothing
that can break a deploy.

**The content contract.** The layout above is not folklore; it is an interface
between two separately versioned systems (the content repo and the site app). The
content repo's `AGENTS.md` documents that contract in plain language: the folder
structure, collection names, required and optional frontmatter fields, permitted
file formats, slug rules, image placement and naming, and draft behaviour.
`content-contract.yml` records it in one machine-readable line:

```yaml
site: shifted-knowledge
schema: 3
```

The build refuses to run if a content repo's `site` or `schema` does not match the
configured site app, and says so clearly (see section 5). This is the cheap
insurance that stops an infrastructure change from silently breaking existing
content. It is intentionally lightweight: a site identifier, a single version
integer and a fail-loud check, not a negotiation protocol.

## 4. Roles

- **Engineer** (the owner, or a coding agent, working in `websites/`): builds each
  site's bespoke app, writes the build script, wires each Cloudflare project,
  maintains the platform. Runs Node/npm locally to develop and verify. Touched only
  when a site's design changes, which is rare.
- **Content** (the owner in marketing mode, and contributors such as the third
  site's owner): work only in a content repo. Write markdown, drop in images, set
  the draft flag, push. Need no Node, no npm, no local build. Cannot reach the
  infrastructure.

## 5. How a site is built and deployed

This is the mechanism. It is the part that feels counter-intuitive, so it is spelled
out fully.

**How Cloudflare even knows to start.** When the Cloudflare Pages project is first
created you go through "Connect to Git" and authorise Cloudflare's GitHub app
against that one private content repo. That does two things: GitHub is told to send
Cloudflare a webhook on every push to the repo (so Cloudflare is pinged, it does not
poll), and Cloudflare is given a token to read the repo. "Private" only keeps
anonymous strangers out; Cloudflare is an authenticated collaborator you introduced,
so it can clone it. This connect step is a one-time browser action per content repo,
and only the account owner can perform it. The public infra repo needs none of this:
it is cloned credential-free from inside the build, which is the entire reason it is
public.

**The build itself.** On a push, Cloudflare spins up a throwaway build machine and:

1. Checks out the content repo (the connected repo).
2. Clones the infrastructure repo at the configured `INFRA_REF`.
3. Verifies the content repo's `content-contract.yml` schema matches what the fetched
   site app expects; aborts with a clear message if not.
4. Copies the content repo's `content/` into the matching app under
   `sites/<site>/src/content/`.
5. Runs the Astro build for that app.
6. Publishes the resulting `dist/` to the site's domain.
7. Discards the build machine.

The content and the infrastructure are combined **only inside that throwaway build,
in the cloud, and never persistently**. The content repo always holds only content;
the infrastructure repo always holds only infrastructure. If any step fails, nothing
is published and the previously live version stays up (decision 9).

**The build logic lives in one script in the infrastructure repo**,
`scripts/build-site.sh`, so the content repo stays clean and the Cloudflare build
command is a two-liner. `git fetch` accepts either the current `main` setting or a
full commit SHA:

```bash
# Cloudflare build command (set per project in the Cloudflare dashboard):
git init .infra \
  && git -C .infra remote add origin "$INFRA_REPO" \
  && git -C .infra fetch --depth 1 origin "$INFRA_REF" \
  && git -C .infra checkout --detach FETCH_HEAD \
  && .infra/scripts/build-site.sh "$SITE" "$PWD"
# Cloudflare output directory: .infra/sites/<SITE>/dist
```

**`build-site.sh` is written defensively**, because it operates on a copied repo:

- reject any `$SITE` not on an explicit allowlist of known site folders;
- validate the contract's site and schema before doing anything else;
- delete the destination `src/content/` before copying, so no stale files survive;
- copy content without following symlinks, and refuse paths that escape `content/`;
- never let copied content overwrite `package.json`, the Astro config, or any app
  component; only `src/content/` is writable by content;
- run `npm ci && npm run build` from the correct `sites/$SITE` directory;
- confirm `dist/` exists and is non-empty before reporting success.

**Per-project settings** (set once by the engineer in the Cloudflare dashboard, and
mirrored for humans in `sites.yml`, so the content repo needs no build files at all):

- `INFRA_REPO` — the public infrastructure repo URL.
- `INFRA_REF` — `main` during active development, or a full commit SHA for a
  frozen, reproducible site.
- `SITE` — the folder name under `sites/` for this site.

**Rolling out an infrastructure change.** Cloudflare watches the content repo, not
this infrastructure repo, so an infra-only change needs a rebuild nudge. While a
site follows `main`, push the tested change and retry the deployment or make a
trivial content commit. For a site frozen to a SHA:

1. Update `INFRA_REF` to the new SHA for one site.
2. Trigger a fresh deployment of that site against its current content.
3. Verify it (a preview build first where the change is risky, then production).
4. Repeat for the next site when satisfied.
5. To roll back, restore the previous SHA and redeploy. The previous commit is
   always recorded, so rollback is immediate.

SHA-frozen sites therefore move one at a time. Sites tracking `main` take the latest
infrastructure on their next build.

**Triggers and previews.** Auto-deploy is on, so a push to a content repo's
production branch starts a build. Pushes to any other branch produce a Cloudflare
**preview URL** rather than touching production. Note one honest limitation: both
production and preview run `npm run build` (production mode), so a `draft: true`
entry is invisible on *every* Cloudflare URL, including previews. Drafts render only
in local `npm run dev`, which a mobile-only author does not have. If seeing a
rendered draft from a phone matters (it does for SK), the recommended refinement is
a dedicated preview deployment configured to build with drafts visible; this is
noted in section 10 and is additive, not required for launch.

**npm and the boundary.** Content contributors never need Node, npm, or any local
build environment; for them, push is the whole toolchain and the real build runs
only on Cloudflare. Engineers do run npm locally, to develop a site, update
dependencies, regenerate the lockfile, test `build-site.sh`, and reproduce a failed
Cloudflare build. Both statements are true; the boundary is about *who*, not *never*.

## 6. The everyday workflow

For a content person (including the owner, and later the third site's owner):

1. Open the content repo (VS Code on desktop, or Working Copy on iOS).
2. Write or edit a flat markdown entry as `content/posts/<slug>.md`, with any
   images beside it. Keep `draft: true` while it is unfinished.
3. Commit and push. The draft is now saved and synced across devices, and invisible
   on the live site.
4. When ready, set `draft: false` and push. The site rebuilds and the entry is live
   in a minute or two.

That is the whole loop for everyday authoring: no build, no scripts, no Mac. Branch
previews (pushing to a non-production branch to get a preview URL) are an *advanced*
workflow for layout-sensitive changes, not something a routine content contributor
needs to understand. For most posts, `draft: true` is the only control in play.

## 7. Ownership note (for the PM to accept knowingly)

All repos sit under the owner's `shiftedknowledge` GitHub owner, and all sites run
on the owner's single Cloudflare account. Moment Hill is a company asset and the
third site belongs to someone else, so this consolidates ownership of the plumbing
under the owner for now. Two things to accept deliberately rather than by accident:

- **Public source.** Because the infra repo is public, each site's full source and
  history are publicly readable. Fine for a personal blog. For Moment Hill this
  means its layout, copy, and structure (though not secrets, of which a static site
  has none) are open. If that is unwanted, the alternative is a private infra repo
  cloned in the build with a stored deploy token, which costs the credential-free
  simplicity above. Decide this at Moment Hill build time (section 10).
- **Separation later is a migration, not a flick of a switch.** Moving a site out
  (to its own owner) is feasible but is a controlled operation: transfer the GitHub
  repo, move or recreate the Cloudflare Pages project (a transferred repo can force
  the project to be recreated), and re-point the domain and DNS (an apex domain must
  live in the same Cloudflare account as its project). Plan it as a small project,
  not a minutes-long transfer. The architecture stays cleanly separable; the
  handover simply is not trivial.

## 8. First implementation: Shifted Knowledge (historical)

This section records the original rollout plan. Shifted Knowledge is now split
and live; the current configuration is in `docs/platform.md`.

The engineer will:

1. Create the `websites` infrastructure repo (with `sites.yml` and `AGENTS.md`) and
   move SK's Astro app into `sites/shifted-knowledge/`.
2. Create `shifted-knowledge-content`, move SK's `src/content/` into it as
   `content/`, add `content-contract.yml`, and write a content-side
   `AGENTS.md` carrying the SK voice, brand notes, and the documented content
   contract.
3. Write `scripts/build-site.sh` to the defensive spec in section 5, and prove the
   assembled build locally (fetch-by-SHA infra clone, contract check, content copy,
   `npm ci && npm run build`, `dist/` verified).
4. Create the Cloudflare Pages project against `shifted-knowledge-content`, do the
   one-time Connect-to-Git, set the environment variables (`INFRA_REPO`,
   `INFRA_REF`, `SITE`, `NODE_VERSION`), connect the domain, and confirm a push
   publishes and a failed build leaves the last good deploy up.

SK then becomes the reference the other two sites copy.

## 9. Explicitly out of scope (for now)

These are good ideas, deliberately deferred. They are additive and change nothing
above, so they can be added whenever they earn their place:

- A nightly scheduled publish and a central "publish now" button.
- Publishing several sites in sequence on a timer.
- Only rebuilding sites whose content changed ("check for updates").
- A shared platform-tooling package (link checking, image-size checks, header
  defaults) factored out of the site apps, if duplication ever becomes a real cost.

All of these matter only once there are multiple sites or a fixed release cadence.
Solo, mobile-first, push-equals-live does not need them.

## 10. Open items needing the PM's input

Everything else is decided. These are the only things the engineer cannot choose:

- **Personal account vs organisation.** `shiftedknowledge` is currently a personal
  GitHub account, which only offers owner/collaborator access. Converting to (or
  creating) a GitHub **organisation** before we add repos gives per-repo and later
  per-team access, which matters once a contributor (the third site's owner) and a
  company asset (Moment Hill) live alongside your personal blog. Recommended;
  needs your go-ahead because it changes the account.
- **Domains.** The final domain for each site (SK currently uses a `pages.dev`
  placeholder).
- **Moment Hill source visibility.** Accept public infra-repo source for MH, or opt
  it into the private-infra-with-build-token alternative. Decide at MH build time.
- **Mobile draft preview.** Whether to add the drafts-visible preview deployment so
  you can eyeball an unpublished post from your phone. Recommended for SK; additive,
  so it need not block launch.
- **The third site.** Nothing is needed yet; noted so the design already accounts
  for it.
