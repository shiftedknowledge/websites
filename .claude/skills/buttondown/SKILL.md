---
name: buttondown
description: Manage the Buttondown newsletter for a site in this platform — turn a markdown issue into a draft, list and inspect emails, check subscribers, and send a signed-off draft. Use when the user mentions the newsletter, Buttondown, sending an issue, subscribers, or the signup form.
---

# Buttondown

The newsletter runs on Buttondown's free tier. Everything here goes through
`scripts/buttondown.mjs`, a dependency-free CLI over the API. Prefer it to raw
`curl`: it pins the safe API version, strips frontmatter the API would reject,
and refuses to send without an explicit flag.

```bash
scripts/buttondown.mjs whoami                  # verify the key, get the real username
scripts/buttondown.mjs subscribers             # confirmed subscriber count
scripts/buttondown.mjs list --status draft     # what is queued
scripts/buttondown.mjs push <file.md>          # markdown -> draft
scripts/buttondown.mjs send <id> --yes         # irreversible
scripts/buttondown.mjs design pull <dir>       # newsletter header/footer/css -> files
scripts/buttondown.mjs design push <dir>       # files -> newsletter
```

Moment Hill's design directory is `sites/moment-hill/newsletter/`
(`header.html`, `footer.html`, `email.css`). Always `design pull` before editing
if the dashboard may have changed underneath you, or a push silently reverts it.

## The division of labour

**Jochen writes the issue and saves it to the repo. You do everything else.**

That is the whole arrangement, and it includes sending. Do not hand steps back
to him that you are capable of doing. Do not suggest he do it in the Buttondown
UI. Pushing, styling, listing, checking subscribers, scheduling, sending: yours.

**The editorial gate is `status: ready` in the file's frontmatter.** That is how
he authorises an issue, and it is the only signal that counts. `push` enforces
it. Never edit that field yourself to get past it — if an issue reads as
finished but is still marked `draft`, ask him.

**Before the actual send**, state the subject and the number of people who will
receive it, and get a yes in that turn. One line, not a negotiation. Sending
mails real people and cannot be undone, so it earns a confirmation even though
the capability is yours. Everything short of the send needs no permission.

## Where it stands

| | |
|---|---|
| Newsletter | `momenthill` — `news_07rd0vfcnh9tt99qkepdn6b78w` |
| Test mode | **off** — every send is real |
| Subscribers | 4 confirmed, of which 3 are test addresses (`test@`, `test3@`, `test4@spalink.me`) |
| Sent | one pipeline test |

Those test addresses will receive the next real issue. Removing them needs
`Subscribers: Read & write` on the key, which it does not have. Say so; do not
quietly widen the key.

## Key permissions

`Emails: Read & write`, `Subscribers: Read`, `Sending: Enabled`,
`Styling: Read & write`, `Settings: Read & write`, everything else `None`.
Pinned to API version `2026-04-01`.

The key is narrowed and widened by hand as needed. `push`, `send`, `list` and
`subscribers` all work without `Settings`; only `design push` and reading
`settings` need it. If a command 403s, name the missing permission and let
Jochen decide — never treat "more permission" as the default answer.

**`design push` needs `Settings: Read & write`, not `Styling`.** Tested
2026-07-27: with Settings at Read, every `PATCH /v1/newsletters/{id}` returns
403 regardless of the field, `tint_color` included. If `design push` 403s, that
is the cause. Say so and let Jochen decide whether to widen the key — never
assume the answer is more permission.

## Where things live

| What | Where |
|---|---|
| Issues (markdown) | `newsletters/` at the **root** of the site's content repo |
| CLI | `scripts/buttondown.mjs` (this repo) |
| Signup form | `sites/<site>/src/components/Newsletter.astro` |
| Newsletter username | `sites/<site>/configs/user.config.ts` → `newsletter.username` |
| API key | `~/.env` → `BUTTONDOWN_API_KEY`. Never read it aloud, never commit it, never paste it into a file. |

Moment Hill's content repo is at `/Users/jochen/CODE/website-content/moment-hill`.

`newsletters/` sits beside `content/`, not inside it — `build-site.sh` copies
only `content/*/`, so issues never reach the website. Keep it that way.

## The authoring loop

1. The user writes in iA Writer and drops a finished issue into `newsletters/`.
   **That library is off-limits — never read from it or write to it.** The git
   working copy is the handoff point.
2. They set `status: ready` in the frontmatter. That is the editorial gate.
3. You run `push`, which creates a Buttondown draft and stamps `buttondown_id`
   back onto the file so a second run updates rather than duplicates.
4. They review in Buttondown and send — or ask you to.

`push` refuses anything not marked `ready`. Do not work around that by editing
the field yourself; if an issue looks ready but is not marked, ask.

## Frontmatter

```yaml
---
subject: "As it lands in the inbox"
description: One sentence for the archive listing.   # optional
date: 2026-07-27
status: draft                 # draft | ready
buttondown_id:                # written by the CLI; do not hand-edit
---
```

`status` is editorial readiness only, never a record of what was sent.
Buttondown is the only source of truth for that — check with `list`, never
infer it from the repo.

## Writing an issue

The newsletter is **not** the blog. Do not assume an issue should mirror a post,
and do not offer to generate one from published content unless asked. Voice
follows Moment Hill's `AGENTS.md`: British English, no em dashes, no emojis,
measured and senior.

## Gotchas worth knowing

- The API rejects a body starting with `---`, reading it as stray frontmatter.
  The CLI strips ours already; if you ever call the API directly, strip it too.
- `POST /emails/{id}/send-draft` requires a JSON body. With none it 422s with
  "field required: payload". The body **is** the payload, so `{}` means "send
  with defaults" — a nested `{"payload": {}}` is rejected as an extra input.
- **Test mode is OFF** (`test_mode: false`, 2026-07-27). Every send reaches the
  real list. There is no harmless "test" send any more. When it was on, a send
  went to the account address only and left the email a draft; that behaviour no
  longer applies, so do not reason from it. Check `settings` if it matters.
- `X-API-Version: 2026-04-01` makes `draft` the default status. Older versions
  defaulted to `about_to_send`, i.e. straight to the whole list. The CLI pins it.
- Free tier caps at 100 subscribers. `css` is **not** editable on free
  (`400 css__not_allowed`); `header`, `footer` and `tint_color` are.
  `design push` reports blocked fields and carries on — that is expected, not a
  bug to fix.
- The newsletter has no public web presence by design: `enabled_features` is
  `["api"]` (archives and portal off). Do not re-enable archives, and never
  suggest "private mode" — it blocks public subscriptions and would break the
  signup form.
- The two subscription redirects are **different pages on purpose**:
  `subscription_redirect_url` → `/subscribed` (after the form, "check your
  inbox"), `subscription_confirmation_redirect_url` → `/confirmed` (after the
  confirm link, "you're on the list"). Pointing both at one page tells a
  confirmed subscriber to go and confirm, which reads as a failure.
- Mail goes out on Buttondown's shared sending domain
  (`sending_domain_status: none`). A custom sending domain is now possible —
  `momenthill.com` is on Cloudflare — but SPF there is `-all`, a hard fail, so
  adding Buttondown as a sender means editing that record deliberately rather
  than discovering it through bounces.
