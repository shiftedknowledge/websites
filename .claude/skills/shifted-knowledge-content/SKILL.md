---
name: shifted-knowledge-content
description: Manage content for shiftedknowledge.com — posts (essays and notes), pages, images, tags, drafts, and publishing. Use when the user mentions Shifted Knowledge content, a post or essay or note on that site, or wants something published, hidden, or fixed on shiftedknowledge.com.
---

# Shifted Knowledge — content

Repo: `/Users/jochen/CODE/website-content/shifted-knowledge`
(`shiftedknowledge/shifted-knowledge-content`, private). Content only: markdown
and images. No build step, nothing to run, and you cannot break the site from
here.

**Its `AGENTS.md` is the precise reference for schemas and voice**, with
`docs/writing-and-publishing.md` and `docs/images.md` as the friendly versions.
Read those rather than trusting this file for field-level detail. This skill is
the operating layer around them.

## Before writing anything

Read [`docs/writing-workflow.md`](../../../docs/writing-workflow.md). The short
version, because it governs everything below:

**Jochen writes. You diagnose. You do not draft.**

Say what is wrong — "this paragraph does two jobs", "you assert this and never
support it", "your best line is buried" — and let him write the fix. Do not hand
over replacement sentences, do not outline a piece before he writes it, do not
supply vocabulary lists unprompted. Research is always welcome; phrasing is his.

An explicit "write this for me" overrides all of it. The default is the
constraint.

**Never read from or write to the iA Writer library.** The git working copy is
the handoff point.

## What is here

Two collections only. This site is deliberately simpler than Moment Hill.

| Folder | Collection | URL |
|---|---|---|
| `content/posts/` | `posts` | `/posts/<filename>` |
| `content/pages/` | `pages` | `/<filename>` |

**Filename is the slug.** Flat, lowercase, hyphenated. Never
`my-post/index.md` — the URL becomes `/posts/my-post/index`.

**Essays and notes are one collection**, separated by a field rather than a
folder:

- `category: Essay` — worked-through, long-form.
- `category: Note` — short, journal-style.

```bash
./new-post.sh "The Title" essay      # or: note
```

`tags` are lowercased and de-duplicated automatically, and drive `/tags`.
`annotation` is an optional short aside. `cover` points at an image in the repo.

The site has **Pagefind search** and generates OG images per post from `title`
and `description`, so those two fields do real work beyond the listing.

## Publishing

`draft: true` means saved and synced everywhere, invisible on the live site.
Push as often as you like; nobody sees it. Removing the flag and pushing is the
entire publish action — Cloudflare rebuilds on the push and it is live in a
minute or two. A future `published` date hides a post until that day.

This works from a phone via Working Copy, because there is nothing to build
locally. Keep it that way: no step that requires a laptop.

Order: if the change also needs an infra change, **push infra first, then
content**. The content push is what triggers the build.

## Images

Beside the post, referenced with a **relative path starting with `./`**:

```
content/posts/my-post.md
content/posts/my-post.hero.jpg
```

```markdown
![A real description, not a filename](./my-post.hero.jpg)
```

The `./` is what lets Astro optimise the image at build (resizing, modern
formats). An absolute URL is passed through unoptimised, so keep images you own
in the repo. Alt text is read aloud by screen readers — write it as a
description.

## Frontmatter breaks in specific ways

Jochen writes in iA Writer, which does prose-editor things to YAML:

- **Smart quotes.** `“ ”` are not valid YAML string delimiters. Use straight
  quotes or none.
- **Frontmatter must start on line 1.** A stray line above the opening `---`
  means Astro sees no frontmatter and reports every field missing.
- **Block scalars must be indented** two spaces under `>-`.

Fixing these is maintenance, not writing — do it without asking. A finished file
may also carry an **iA Writer authorship metadata block at the end**. Leave it
alone.

## Voice

British English. First person. **No em dashes, no emojis.** Plain,
unpretentious, technical when it needs to be and never for show.

This is the honest, behind-the-scenes record of building in the open: working
notes, not polished case studies. Tagline: *Raw vectors, quiet logic.* Sister
brand to Moment Hill, and the register is looser than Moment Hill's — that
difference is the point.

The full brand system is in the vault at
`THE_BRAIN/05_AREAS/Marketing/Shifted Knowledge Branding/`.

## Checking before it ships

```bash
cd /Users/jochen/CODE/websites
scripts/dev-link.sh shifted-knowledge ../website-content/shifted-knowledge
cd sites/shifted-knowledge && ./preview.sh          # drafts visible
./preview.sh final                                   # drafts hidden, search, images
scripts/build-site.sh shifted-knowledge ../website-content/shifted-knowledge
```

`preview.sh final` matters more here than on Moment Hill: it is the only local
mode that runs Pagefind and generates the OG images, so it is the only one that
proves search and share cards work.

Zod validates every entry including drafts. A missing required field fails the
build for this site only, and the live version stays up until a good build
succeeds.

## No newsletter

Shifted Knowledge has no Buttondown newsletter and no `newsletter` block in its
`user.config.ts`. If one is ever wanted it gets its **own Buttondown account**,
not a second newsletter inside Moment Hill's — that costs $29/mo where a second
free account costs nothing and keeps the brands properly separate.
