---
name: shifted-knowledge-content
description: Handle the repository handoff for finished Shifted Knowledge content, including posts, guides, pages, images, frontmatter maintenance, build verification, and production publishing. Use when work concerns content in the private shifted-knowledge repository or a content push to shiftedknowledge.com. Jochen writes elsewhere; do not draft or rewrite prose unless explicitly asked.
---

# Shifted Knowledge content

Repository: `/Users/jochen/CODE/website-content/shifted-knowledge`.

Read this infrastructure repository's [`AGENTS.md`](../../../AGENTS.md) and
[`HANDOVER.md`](../../../HANDOVER.md), then read the content repository's nearest
`AGENTS.md` completely. The content repository is authoritative for collection
schemas, frontmatter, voice, images and brand facts.

## Respect authorship

Jochen writes elsewhere and places finished content in the repository. Diagnose
prose when asked, but do not draft, rewrite, extend or supply replacement wording
unless he explicitly asks for writing. Never access the external writing library;
the git checkout is the handoff point.

Fix frontmatter, filenames, image paths and broken links as maintenance. Preserve
any authorship metadata block already attached to a handed-over file.

## Preserve the content model

- Posts form the publication timeline and RSS feed.
- Guides are maintained reference pieces and stay outside the feed.
- Pages render at root-level routes.
- The filename is the slug. Keep entries flat, lowercase and hyphenated.
- Keep owned images beside the entry and use a relative `./image-name` path so
  Astro can optimise them.
- Tags are metadata, not site navigation. Do not reintroduce search, archive or
  tag pages unless explicitly asked.

Read the current schema from the content repository rather than copying field
lists from this skill.

## Publish finished content

The normal workflow has no drafting phase in git:

1. Inspect both repositories' status and the incoming finished files.
2. Validate collection, filename, required frontmatter and image paths against
   the content repository's `AGENTS.md`.
3. Do not add `draft: true` as a routine publishing step. Existing draft support
   is legacy behaviour pending the coordinated decision in `HANDOVER.md`.
4. Run the assembled production build from the infrastructure repository:

   ```bash
   cd /Users/jochen/CODE/websites
   scripts/build-site.sh shifted-knowledge ../website-content/shifted-knowledge
   ```

5. Inspect the generated route, relevant listing, RSS output and generated share
   image where applicable.
6. Commit intentionally in the content repository.
7. State that pushing the content repository will deploy Shifted Knowledge.
8. Push only after that consequence has been made explicit, then verify the
   Cloudflare deployment and live result.

If an infrastructure change is also required, release infrastructure first and
content second. The content push is the deployment trigger.

## Diagnose failures

Check, in order:

- `content-contract.yml` site and schema;
- frontmatter delimiters, straight quotes, indentation and required fields;
- collection directory and filename-derived slug;
- relative image path and file presence;
- symlinks or unsupported file formats;
- the first actionable error from the assembled build.

A failed build leaves the current live site in place but blocks the next publish.
Do not describe the content repository as incapable of breaking a build.
