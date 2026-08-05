---
name: site-platform
description: Build and maintain the shared Astro website infrastructure, including local preview, assembled builds, content contracts, dependencies, collections, build failures, and adding another site. Use for changes or diagnosis in scripts/, sites/, package manifests, Astro configuration, content schemas, layouts, components, or platform documentation. Do not use it to invent site prose or visual changes.
---

# Site platform

Read [`AGENTS.md`](../../../AGENTS.md) and
[`HANDOVER.md`](../../../HANDOVER.md) completely before acting. Use
[`docs/platform.md`](../../../docs/platform.md) for the implemented architecture
and the handover for unresolved work. Route deployment, domain and DNS operations
through `$cloudflare`.

## Preserve the architecture

Maintain one public infrastructure repository plus one private content repository
per site. Keep every site a complete, bespoke Astro app. Share build and deploy
plumbing, not components, styling or visual templates.

Do not change prose, site identity, styling, markup or visual behaviour unless
the user explicitly requests that change. Diagnose those surfaces freely. Fix
build errors, type failures and broken links as maintenance.

Newsletter automation is deferred. Do not operate or extend it unless the user
explicitly reopens that work.

## Establish the baseline

1. Inspect `git status`, the current branch and divergence from `origin/main`.
2. Inspect the affected app while excluding `node_modules/`, `dist/`, `.astro/`
   and assembled `src/content/`.
3. Read the app's `package.json`, `CONTENT_SCHEMA`, `astro.config.mjs`,
   `src/content.config.ts` and the relevant implementation files.
4. Inspect the matching content repository's status and
   `content-contract.yml` when the task crosses the repository boundary.
5. Treat mutable dependency and provider state as something to query, not a
   durable fact in documentation.

## Develop locally

Link the appropriate private content checkout into the app:

```bash
scripts/dev-link.sh <site> ../website-content/<site>
cd sites/<site>
npm install
./preview.sh
```

`dev-link.sh` creates the gitignored `src/content` symlink. Preserve the safety
property in `build-site.sh`: remove the link itself before wiping the destination,
never recurse through it into the private content repository.

Use `./preview.sh final` for a local production-mode preview, but do not treat it
as the release acceptance test.

## Run the authoritative build

From the repository root, run:

```bash
scripts/build-site.sh <site> ../website-content/<site>
```

This is the build Cloudflare runs. It must allowlist the site, verify the content
contract's `site` and `schema`, reject symlinks, replace only the selected app's
`src/content`, run `npm ci` and the app's build script, and confirm non-empty
output.

Check the generated routes or affected output as well as the exit code. The
numeric content contract has known blind spots documented in `HANDOVER.md`.

## Change a content contract

Treat collection names, accepted file formats, required frontmatter, slug rules
and image placement as a versioned interface between repositories.

When that interface changes:

1. Change the app schema and all consumers.
2. Migrate the matching private content repository.
3. Bump `CONTENT_SCHEMA` and `content-contract.yml` together.
4. Update the nearest `AGENTS.md` and platform documentation.
5. Run the assembled build against the real content checkout and inspect the
   affected section for content, not merely successful compilation.

Do not perform a partial migration. The draft simplification in `HANDOVER.md` is
open work, not permission to remove one part in isolation.

## Add another site

1. Create `sites/<new-site>/` as a complete Astro app with its own design and
   `CONTENT_SCHEMA`.
2. Add the exact site name to the allowlist in `scripts/build-site.sh`.
3. Add the desired deployment record to `sites.yml`.
4. Create the private content repository with `content-contract.yml`, a nearest
   `AGENTS.md`, a `content/` tree and any safe scaffolding scripts.
5. Add a focused repository skill under `.agents/skills/` only when the new site
   has a distinct repeatable workflow that is not already covered.
6. Connect the content repository to a new Pages project using
   [`CLOUDFLARE_SETUP.md`](../../../CLOUDFLARE_SETUP.md).
7. Run the assembled build before any production deployment.

## Finish

Run syntax or static checks that actually exist, then run the assembled build for
every affected site. Report unavailable or broken checks rather than implying
they passed. Do not trigger a production rebuild without stating that action
first.
