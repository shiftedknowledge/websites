---
name: moment-hill-content
description: Manage content for momenthill.com — posts, explainers, frameworks, pages, the home page hero, drafts, and publishing. Use when the user mentions Moment Hill content, a post or explainer or framework, the home page copy, or wants something published, hidden, or fixed on momenthill.com.
---

# Moment Hill — content

Repo: `/Users/jochen/CODE/website-content/moment-hill`
(`shiftedknowledge/moment-hill-content`, private). Content only: markdown and
images. No build step, nothing to run, and you cannot break the site from here.

**Its `AGENTS.md` is the precise reference for schemas and voice.** Read it
rather than trusting this file for field-level detail. This skill is the
operating layer around it.

## Before writing anything

Read [`docs/writing-workflow.md`](../../../docs/writing-workflow.md). The short
version, because it governs everything below:

**Jochen writes. You diagnose. You do not draft.**

Say what is wrong — "this paragraph does two jobs", "you assert this and never
support it", "your best line is buried" — and let him write the fix. Do not hand
over replacement sentences, do not outline a piece before he writes it, do not
supply vocabulary lists unprompted. Research (dates, figures, sources, the
strongest counter-argument) is always welcome; phrasing is his.

An explicit "write this for me" overrides all of it. The default is the
constraint.

**Never read from or write to the iA Writer library.** The git working copy is
the handoff point.

## What is here

| Folder | Collection | URL |
|---|---|---|
| `content/posts/` | `posts` | `/posts/<filename>` |
| `content/explainers/` | `explainers` | `/explainers/<filename>` |
| `content/frameworks/` | `frameworks` | `/frameworks/<filename>` |
| `content/pages/` | `pages` | `/<filename>` |
| `newsletters/` | — | never published. See the `buttondown` skill. |

**Filename is the slug.** Flat, lowercase, hyphenated. Never
`my-thing/index.md` — the URL becomes `/my-thing/index`.

Scaffold rather than hand-writing frontmatter:

```bash
./new-post.sh "The Title"
./new-explainer.sh "The Title"
./new-framework.sh "The Title"
./new-newsletter.sh "The subject line"
```

**What distinguishes the three article types:** a *post* is a blog entry. An
*explainer* is educational, tagged with exactly one `level` (beginner /
intermediate / advanced) which powers the filter, and has no buy link. A
*framework* is an article with an optional `buyUrl`; without one the page shows
"Availability coming soon". `explainers` was called `tutorials` until 2026-07-25
— if you find that word anywhere, it is stale.

## Publishing

`draft: true` hides an entry from the live site; local preview still shows it. A
future `published` date does the same. Removing the flag and pushing is the
entire publish action — Cloudflare rebuilds on the push and it is live in a
minute or two.

**Currently hidden behind `draft: true`:** the Porter's Five Forces post and the
matching framework. Both were pulled before the site went live and are waiting
on a decision, not on a fix.

Order: if the change also needs an infra change, **push infra first, then
content**. The content push is what triggers the build.

## home.md is special

`content/pages/home.md` never renders as its own page. It carries the hero copy
`index.astro` reads: `tagline`, `intro`, `offerings` (each
`eyebrow`/`title`/`blurb`/`ctaLabel`/`ctaHref`), and `foundation`
(`label`/`headline`/`blurb`).

**`intro` and `foundation.headline` are plain text, not markdown.** The page
escapes them and hand-renders only `**bold**` and paragraph breaks. Links,
italics and lists appear literally.

Two known blemishes Jochen has not addressed, so do not silently fix them:
`foundation.headline` reads "here proven business thinking meets practical AI."
(missing a W) and contains a zero-width space (U+200B).

## Frontmatter breaks in specific ways

Jochen writes in iA Writer, which is a prose editor and does prose-editor things
to YAML. Three faults have already broken a build:

- **Smart quotes.** iA Writer turns `"` into `“ ”`. YAML does not accept
  typographic quotes as delimiters. Use straight quotes or none.
- **Frontmatter must start on line 1.** A stray title above the opening `---`
  means Astro sees no frontmatter and reports every field missing.
- **Block scalars must be indented.** Under `intro: >-`, every line needs two
  spaces. Unindented content silently leaves the value and the next key fails.

Fixing these is maintenance, not writing — do it without asking. A finished file
may also carry an **iA Writer authorship metadata block at the end**. Leave it
alone: do not strip it, reformat it, or comment on it.

## Voice

British English. First person where natural. **No em dashes, no emojis.**
Measured, senior, plain. A senior operator with thirty years of judgement who
uses current tools fluently, not a hype merchant.

Tagline: *The bridge between knowing and delivering.* Triad: *Trusted Frameworks
· Smart Leverage · Real Results.*

Brand facts that must not drift: Moment Hill Limited, Company No. 17209339,
England and Wales, Collingwood Buildings, 38 Collingwood Street, Newcastle
NE1 1JF. `hello@momenthill.com` appears only on About; `consultancy@momenthill.com`
only on Consulting.

## Checking before it ships

```bash
cd /Users/jochen/CODE/websites
scripts/dev-link.sh moment-hill ../website-content/moment-hill
cd sites/moment-hill && ./preview.sh          # drafts visible
scripts/build-site.sh moment-hill ../website-content/moment-hill   # what Cloudflare runs
```

Zod validates every entry including drafts. A missing required field fails the
build for this site only, and the live version stays up until a good build
succeeds.

## The newsletter is not the blog

`newsletters/` sits at the repo **root**, beside `content/`. `build-site.sh`
copies only `content/*/`, so nothing there reaches the site. That separation is
deliberate and enforced by the build script.

Do not offer to turn a post into an issue or an issue into a post. Two sets of
notes, even where that means copy and paste. The `buttondown` skill owns
everything from a finished issue onwards.
