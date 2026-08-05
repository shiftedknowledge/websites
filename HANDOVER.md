# Handover

Read this file immediately after [`AGENTS.md`](AGENTS.md) at the start of every
session. `AGENTS.md` contains the durable operating rules. This file contains
the current direction, deferred work and open decisions. Keep it short and
remove an item when the underlying work is complete.

## Direction

- This repository is the infrastructure for a family of independent websites.
  It currently builds Shifted Knowledge and Moment Hill and must remain capable
  of adding more sites without merging their visual code or content.
- Normal publishing is deliberately simple: Jochen finishes a piece elsewhere,
  adds the ready file and images to the relevant private content repository,
  commits and pushes. Cloudflare must do everything after that automatically.
- The normal publishing workflow does not need drafts. The existing draft
  mechanism is legacy behaviour pending a coordinated simplification.
- Infrastructure changes should be exceptional. When they are necessary, the
  assembled build is the acceptance test and the release must be predictable.
- Newsletter automation is deferred. Jochen currently uses Buttondown's own
  interface. Do not operate `scripts/buttondown.mjs` or revive an automated
  newsletter workflow unless he explicitly reopens that work.

## Start-of-session baseline

1. Read `AGENTS.md` and this file completely.
2. Inspect `git status`, the current branch and divergence from `origin/main` in
   this repository. If content work is in scope, do the same in the relevant
   content repository.
3. Select the relevant repository skill from `.agents/skills/` and read its
   `SKILL.md` completely before acting.
4. Query mutable external state immediately before relying on it. Cloudflare
   project settings, deployments, domains, DNS and dependency advisories are not
   durable documentation facts.
5. State before any production deploy, content push, domain or DNS change.

The useful part of the retired machine-local agent setting was a read-only
inspection pattern: list the selected app while excluding `node_modules/`,
`dist/`, `.astro/` and assembled `src/content/`, then inspect its `package.json`
and `CONTENT_SCHEMA`. No reusable permission policy or secret was present.

## Open topics

### Simplify publishing and remove drafts

The intended workflow now publishes only finished content. Removing drafts is a
coordinated change across both apps, content schemas, routes, preview wording,
content-repository instructions and existing frontmatter. Decide whether future
publication dates remain supported before changing the schema. Bump each site's
content contract when the accepted frontmatter changes.

Do not partially remove draft handling. The current implementation is already
inconsistent: special pages bypass shared visibility rules, while generic
Shifted Knowledge pages hide drafts even in development.

### Restore publication ordering

Both apps currently sort posts by `updated ?? published`, although the intended
timeline is ordered by `published`. With one published post per site this is not
yet visible, but editing an old post can later promote it on listings, the home
page and adjacent navigation.

### Make the content contract fail closed

The numeric schema check catches declared version skew but not a misnamed
collection or unsupported file extension. Collection loaders accept `*.md`, so
an `*.mdx` file or a wrongly named directory can be ignored while the build still
succeeds. Add explicit structure and extension validation when the contract is
next changed.

### Add automated infrastructure checks

There is no repository CI and GitHub `main` is unprotected. Shifted Knowledge's
configured Biome command currently fails before it can act as a useful gate,
Moment Hill has no lint command, and neither app has the dependencies needed for
`astro check`.

The public infrastructure repository cannot run the true assembled build against
private content without adding credentials. Prefer secret-free contract fixtures
and build-script tests here, with the true assembled build retained as the local
pre-release check. Consider content-repository CI separately.

### Plan the Astro dependency upgrade

The current Astro 6 dependency trees carry Astro and Sharp advisories; Moment
Hill also has a directly fixable PostCSS advisory. The high-severity fixes
currently require Astro 7, so treat this as a tested major upgrade across both
bespoke apps rather than an automatic audit fix.

### Reconcile documentation and Cloudflare drift

- Shifted Knowledge's preview `INFRA_REF` is still pinned to the first platform
  commit while production follows `main`.
- The obsolete `moment-hill-preview` Pages project still exists.
- Mutable counts and deployment snapshots have repeatedly gone stale in prose.
  Keep durable architecture in documentation and retrieve current state with
  Wrangler, `dig`, `curl`, GitHub and the provider interfaces.
- `sites.yml` is descriptive rather than enforced. Consider a drift check once
  there is a safe read-only automation path.

### Newsletter work is deferred

The Buttondown CLI and newsletter design artefacts remain in the repository as
unfinished infrastructure, but no repository skill activates them. Manual use
of Buttondown is the current operating model. Before revisiting automation,
review the API workflow, the CLI's frontmatter parser, sending confirmation,
tests and the documentation as one bounded piece of work.
