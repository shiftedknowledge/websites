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
| Collections | `posts`, `pages` | `posts`, `pages`, `frameworks`, `explainers` |
| Search | Pagefind, built in | none |
| Newsletter | none | Buttondown |
| Mail | Fastmail | Microsoft 365 |
| Voice | first person, plain | measured, senior, British |

Both are bespoke Astro 6 apps on Tailwind v4. They share the build and deploy
plumbing and nothing visual. `CONTENT_SCHEMA` is `1` for both.

The asymmetry is deliberate, not drift. Moment Hill has no Pagefind dependency
and its `npm run build` is a bare `astro build`; Shifted Knowledge's `build`
script runs Pagefind and copies the index into place. Do not add search to
Moment Hill to make them match.

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

| Pages project | Git | Domains |
|---|---|---|
| `shifted-knowledge` | yes | `shifted-knowledge.pages.dev`, `www.shiftedknowledge.com` |
| `moment-hill` | yes | `moment-hill.pages.dev`, `momenthill.com`, `www.momenthill.com` |
| `moment-hill-preview` | no | `moment-hill-preview.pages.dev` |

`moment-hill-preview` is a superseded direct-upload project from before Moment
Hill was git-connected. It serves nothing anyone links to and can be deleted.

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
- Moment Hill has no site search. Fine for its size; a decision, not a gap.
