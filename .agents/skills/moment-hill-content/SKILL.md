---
name: moment-hill-content
description: Handle the repository handoff for finished Moment Hill content, including posts, explainers, frameworks, pages, images, frontmatter maintenance, build verification, and production publishing. Use when work concerns content in the private moment-hill repository or a content push to momenthill.com. Jochen writes elsewhere; do not draft or rewrite prose unless explicitly asked.
---

# Moment Hill content

Repository: `/Users/jochen/CODE/website-content/moment-hill`.

Read this infrastructure repository's [`AGENTS.md`](../../../AGENTS.md) and
[`HANDOVER.md`](../../../HANDOVER.md), then read the content repository's nearest
`AGENTS.md` completely. The content repository is authoritative for collection
schemas, frontmatter, voice and brand facts.

## Respect authorship

Jochen writes elsewhere and places finished content in the repository. Diagnose
prose when asked, but do not draft, rewrite, extend or supply replacement wording
unless he explicitly asks for writing. Never access the external writing library;
the git checkout is the handoff point.

Fix frontmatter, filenames, image paths and broken links as maintenance. Preserve
any authorship metadata block already attached to a handed-over file.

Newsletter work is deferred and manual in Buttondown. Do not operate newsletter
files or automation through this skill.

## Publish finished content

The normal workflow has no drafting phase in git:

1. Inspect both repositories' status and the incoming finished files.
2. Validate the file location, lowercase hyphenated filename, required
   frontmatter and relative image paths against the content repository's
   `AGENTS.md`.
3. Do not add `draft: true` as a routine publishing step. Existing draft support
   is legacy behaviour pending the coordinated decision in `HANDOVER.md`.
4. Run the assembled production build from the infrastructure repository:

   ```bash
   cd /Users/jochen/CODE/websites
   scripts/build-site.sh moment-hill ../website-content/moment-hill
   ```

5. Inspect the generated route and relevant listing or feed.
6. Commit intentionally in the content repository.
7. State that pushing the content repository will deploy Moment Hill.
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
