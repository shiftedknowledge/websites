# The platform, as it stands

What exists right now, in July 2026, and how the pieces fit. This is the
orientation document: read it first, then the specific one you need.

It describes **state**, not history. When something changes, change this file in
the same commit rather than appending a note about the change.

| | |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | the operating manual for this repo |
| [`design-spec.md`](design-spec.md) | why the platform is shaped this way |
| [`dns.md`](dns.md) | both zones, record by record |
| [`newsletter.md`](newsletter.md) | Buttondown, end to end |
| [`writing-workflow.md`](writing-workflow.md) | how Jochen writes, and what agents may not do |
| [`sites.yml`](../sites.yml) | the deployment manifest |

---

## The shape

Two live websites, built from one piece of infrastructure. For `n` sites there
are `n + 1` repositories.

```
shiftedknowledge/websites                 public   this repo: apps, build, deploy
shiftedknowledge/shifted-knowledge-content  private  markdown + images
shiftedknowledge/moment-hill-content        private  markdown + images + newsletters/
```

Content and infrastructure never merge. Cloudflare stitches them together inside
a throwaway build machine, every time a site is built. Nothing assembled is ever
committed.

Local checkouts on this machine:

```
/Users/jochen/CODE/websites                       this repo
/Users/jochen/CODE/website-content/moment-hill
/Users/jochen/CODE/website-content/shifted-knowledge
```

## The two sites

|  | Shifted Knowledge | Moment Hill |
|---|---|---|
| Domain | shiftedknowledge.com | momenthill.com |
| What it is | personal site, building in the open | advisory practice, frameworks + AI leverage |
| Collections | `posts`, `guides`, `pages` | `posts`, `pages`, `frameworks`, `explainers` |
| Search | none | none |
| Newsletter | none | Buttondown |
| Mail | Fastmail | Microsoft 365 |
| Voice | first person, plain | measured, senior, British |

Both are bespoke Astro 6 apps on Tailwind v4. They share the build and deploy
plumbing and nothing visual. `CONTENT_SCHEMA` is `2` for Shifted Knowledge and
`1` for Moment Hill; the number is per site and they are not meant to march in
step.

Shifted Knowledge's structure is deliberately two-shelved and deliberately
plain. `/posts` is every post, newest first, grouped by year: no pagination, no
filtering, no tags on the page, no client-side JavaScript. It is also the only
thing in the RSS feed, which carries **full post content**, not summaries.
`/guides` holds standalone explanations that get revised, ordered by `updated`,
and is kept out of the feed so an edit does not read as news.

What is *not* there is the point. No archive page, no `/tags` index, no search.
The archive and tag pages were second views of the same data. Pagefind shipped
briefly and came out again: the site is small, it runs on direct links and RSS,
and search was chrome it had not earned. All the removed URLs redirect to
`/posts` via that app's `public/_redirects`. Revisit once there is enough
content to justify it.

## How a build happens

Each Cloudflare Pages project is connected to that site's **content repo**, not
to this one. A push to content triggers the build:

1. Cloudflare checks out the content repo.
2. The build command clones this repo at `INFRA_REF` into `.infra/`.
3. [`build-site.sh`](../scripts/build-site.sh) runs. It checks
   `content-contract.yml` against the app's `CONTENT_SCHEMA`, copies every
   `content/*/` directory into `sites/<site>/src/content/`, runs `npm ci && npm
   run build`, and confirms `dist/` is non-empty.
4. `dist/` is published; the machine is destroyed.

A failed build publishes nothing. The last good deployment stays live.

**`INFRA_REF` is `main` on both sites.** Any push to this repo's `main` is one
rebuild away from live. That is the right setting during active development and
the thing to change first if it ever stops being.

**Infra changes need a nudge.** Cloudflare watches content, so a change here
reaches a site only on the next content push or a manual retry. See the
`cloudflare` skill.

## Cloudflare

Account `44dc43bb4dbf488aa6034ef4fd9f3714`. Free plan throughout.

**Everything in this section was read back from Cloudflare on 2026-07-28** with
`wrangler pages project list` and `wrangler pages download config <project>`, so
it can be trusted without opening the dashboard. Reproduce it with:

```bash
npx wrangler pages project list
npx wrangler pages download config shifted-knowledge   # run in a scratch dir
```

| Pages project | Git | Domains |
|---|---|---|
| `shifted-knowledge` | yes | `shifted-knowledge.pages.dev`, `www.shiftedknowledge.com` |
| `moment-hill` | yes | `moment-hill.pages.dev`, `momenthill.com`, `www.momenthill.com` |
| `moment-hill-preview` | no | `moment-hill-preview.pages.dev` |

`moment-hill-preview` is a superseded direct-upload project from before Moment
Hill was git-connected. It serves nothing anyone links to and can be deleted.

### Build configuration, per project

Identical for both git-connected projects apart from `SITE` and the output path.
The build command set in the dashboard is:

```bash
git init .infra \
  && git -C .infra remote add origin "$INFRA_REPO" \
  && git -C .infra fetch --depth 1 origin "$INFRA_REF" \
  && git -C .infra checkout --detach FETCH_HEAD \
  && .infra/scripts/build-site.sh "$SITE" "$PWD"
```

| | `shifted-knowledge` | `moment-hill` |
|---|---|---|
| output dir | `.infra/sites/shifted-knowledge/dist` | `.infra/sites/moment-hill/dist` |
| compatibility date | `2026-07-23` | `2026-07-27` |
| `INFRA_REPO` | `https://github.com/shiftedknowledge/websites.git` | same |
| `SITE` | `shifted-knowledge` | `moment-hill` |
| `NODE_VERSION` | `22` | `22` |
| `INFRA_REF` (production) | `main` | `main` |
| `INFRA_REF` (preview) | `74d8fb08d7c5…` **pinned, stale** | `main` |

There are **no secrets in any Cloudflare environment variable.** The four vars
above are the complete set for both projects, in both environments.

The stale preview pin on `shifted-knowledge` is the one known drift. Production
is unaffected; a preview branch build would use infra from the first platform
commit. Nothing uses preview branches today.

Both zones are on Cloudflare DNS. Both domains stay registered at Hover;
only DNS moved. DNSSEC is off on both.

`shiftedknowledge.com` apex is **not** attached to the Pages project as a custom
domain — it resolves through a proxied record in the zone instead. It works, and
it means the apex has no certificate or redirect settings of its own. Both sites
serve apex and `www` with `200` rather than redirecting one to the other; the
canonical tag points at the apex in both cases, so search engines consolidate
correctly. Tidy if it ever matters, but nothing is broken.

## Secrets

Everything lives in `~/.env`, sourced explicitly, never automatically:

```bash
set -a; source ~/.env; set +a
```

This repo is public and holds no secrets. Do not put one here, do not echo one
into a transcript, do not paste one into a file.

Cloudflare access is **wrangler's OAuth token**, not an API token. It refreshes
on interactive use and covers Pages. It does not cover DNS writes: there is no
`CLOUDFLARE_API_TOKEN` in `~/.env`, so DNS changes are dashboard or browser work
today. Minting a scoped token is a decision Jochen has not taken.

`BUTTONDOWN_API_KEY` and `BUTTONDOWN_NEWSLETTER` are in `~/.env` and used only by
[`scripts/buttondown.mjs`](../scripts/buttondown.mjs).

Both repos and both content repos were scanned for committed credentials across
their **full git history** on 2026-07-28 (API-key prefixes, private-key headers,
AWS/Slack/GitHub token shapes). Nothing found.

## Dependencies and what the advisories mean here

`npm audit` is noisy on this project and the noise is mostly structural, so the
current state is recorded rather than left for each reader to re-derive. As of
**2026-07-28**:

| | high | moderate | low |
|---|---|---|---|
| `shifted-knowledge` | 6 | 2 | 1 |
| `moment-hill` | 3 | 4 | 1 |

The high-severity advisories are `astro`, `sharp`, `vite`, `postcss`, `js-yaml`
and `svgo`. **Read where each one actually runs before treating it as exposure:**

- `vite` (`server.fs.deny` bypass, `launch-editor` NTLM disclosure) — **dev
  server only, and Windows-specific.** Never runs in production; the build hosts
  are Linux and the author's machine is macOS.
- `postcss`, `js-yaml`, `svgo`, `sharp`/libvips — **build-time only.** They
  process this project's own CSS, frontmatter, SVGs and images, inside a
  throwaway Cloudflare build container, from private repos. There is no
  attacker-supplied input anywhere in that path.
- `astro` (three XSS advisories, view transitions and spread attributes) — the
  only class that touches **published output**. Both sites use `ClientRouter`,
  so the view-transition advisory is in-scope in principle. In practice the
  vector needs attacker-controlled values reaching those directives, and every
  byte of content is authored by one person in a private repo. Real risk today:
  low. Real risk if these sites ever accept third-party input: not low.

The fix for the `astro` and `sharp` advisories is **Astro 7**, a major version
bump on two bespoke apps. That is a deliberate piece of work, not a patch, and
it has not been done. `postcss`, `js-yaml`, `svgo` and `vite` have non-breaking
fixes available and are simply pending.

Nothing here is an emergency. Nothing here should be dismissed either — this
note exists so the decision is visible rather than implied by silence.

## Who owns what

The repo split *is* the boundary, which is why it holds.

**Jochen owns** the words and the look: everything in the content repos, plus
`configs/user.config.ts`, `src/styles/`, layouts and components in this one. And
every decision about what goes live and when.

**Agents own** everything that is neither words nor look: Cloudflare
configuration, triggering and triaging builds, drift between `sites.yml` and
reality, domain and TLS health, dependency and Astro upgrades, the content
schema contract, and the whole newsletter pipeline downstream of a finished
issue.

Two standing rules that fall out of that:

- **Never write prose into a content repo unless asked to.** Fixing broken
  frontmatter is maintenance. Writing a paragraph is not. See
  [`writing-workflow.md`](writing-workflow.md) — the constraint is stronger than
  it looks and it is the point of the whole arrangement.
- **Never trigger a production deploy or change a domain without saying so
  first.** Everything short of that needs no permission.

## The newsletter, in one paragraph

Moment Hill has a Buttondown newsletter on the free tier. Issues live in
`newsletters/` at the **root** of the content repo, beside `content/` and
therefore invisible to `build-site.sh`. Jochen writes an issue and marks it
`status: ready`; the agent does everything after that, including sending.
`scripts/buttondown.mjs` is the whole interface. Full detail in
[`newsletter.md`](newsletter.md).

## Known open items

Recorded so they are not rediscovered as surprises.

- `moment-hill-preview` Pages project is dead and undeleted.
- Three test subscribers (`test@`, `test3@`, `test4@spalink.me`) are on the live
  Moment Hill list with test mode off.
- Hover still holds the old Squarespace DNS records for `momenthill.com`. They
  are inert while the nameservers point at Cloudflare, and they are the rollback
  path for mail.
- Squarespace is still being paid for.
- Neither site has search. Fine at this size; a decision, not a gap.
- **Moment Hill has no Content-Security-Policy; Shifted Knowledge has one.** Not
  an oversight to fix blindly: Moment Hill's newsletter signup is a native form
  POST to `buttondown.com`, and a careless `form-action` or `connect-src` policy
  would silently break the one conversion path on the site. Worth doing, worth
  doing carefully.
- **Astro 7 is available and would clear the `astro` and `sharp` advisories.**
  A major bump across two bespoke apps; see "Dependencies" above for why it is
  not urgent and not ignorable.
- Shifted Knowledge's RSS feed renders each post with Astro's container API and
  registers **no renderers**, because `@astrojs/mdx` 6.0.3's container renderer
  fails to bundle (an unresolved `satteri` import). Every post is plain markdown
  so this costs nothing today, but an `.mdx` post using a framework component
  would need that resolved first.
- `shifted-knowledge`'s **preview** `INFRA_REF` is pinned to the first platform
  commit while production tracks `main`. Harmless while no preview branches
  exist.
- **There are no automated tests and no type-check step.** `@astrojs/check` is
  not installed in either app. The only gate on a change is that
  `scripts/build-site.sh` exits clean, which catches schema and syntax errors
  and nothing else. For a static site with two content collections this is a
  defensible trade; it is still the largest single gap in the setup.
- Nothing watches any of this. A broken build, an expired certificate or a site
  that stops resolving would be noticed by someone visiting it.
