# The newsletter

How the Moment Hill newsletter works, for whoever is running it next — including
future you, at 7am, having forgotten all of this.

It runs on **Buttondown**, free tier. One newsletter, one site. The design goal
was that publishing an issue costs one command and one decision, and that the
decision is always yours.

## Where it stands

| | |
|---|---|
| Newsletter | `momenthill` — `news_07rd0vfcnh9tt99qkepdn6b78w` |
| From | `Jochen <jochen@momenthill.com>`, sent on Buttondown's domain |
| Test mode | **off** — every send is real |
| Subscribers | 4 confirmed, of which 3 are test addresses (`test@`, `test3@`, `test4@spalink.me`) |
| Issues sent | one, a pipeline test |
| Locale | `en-GB`, Europe/London, tint `#425e4f` |

Those test addresses will receive the next real issue. Removing them needs
`Subscribers: Read & write` on the key, or two minutes in the dashboard.

Run `scripts/buttondown.mjs settings` rather than trusting this table if
anything depends on it.

---

## The loop

```
iA Writer  ->  newsletters/  ->  status: ready  ->  push  ->  review  ->  send
   you           you              you            agent     agent      agent
```

You write the issue and save it. Everything after that is the agent's job. The
one thing it will do is state the subject and the recipient count and wait for a
yes before the actual send, because that step mails real people and cannot be
undone.

1. **Write** in iA Writer, wherever you keep it. Nothing automated touches that
   library, by design and by instruction.
2. **Drop** the finished markdown into `newsletters/` in the content repo
   (`/Users/jochen/CODE/website-content/moment-hill`). Or scaffold it there in
   the first place with `./new-newsletter.sh "Your subject line"`.
3. **Mark it `status: ready`** in the frontmatter. This is the editorial gate,
   and it is the only authorisation that counts. Nothing gets pushed while it
   says `draft`, and the agent will not flip that field for you.
4. **Push.** `scripts/buttondown.mjs push <file>` creates a Buttondown draft and
   writes the resulting `buttondown_id` back into your file, so a second push
   updates that draft instead of making another.
5. **Review** in Buttondown. Real rendering, real preview.
6. **Send.** `send <id> --yes`. Irreversible.

## Commands

All from the root of this repo.

```bash
scripts/buttondown.mjs whoami                  # verify the key; print the real username
scripts/buttondown.mjs subscribers             # confirmed subscriber count
scripts/buttondown.mjs list                    # every email and its status
scripts/buttondown.mjs list --status draft     # just what is queued
scripts/buttondown.mjs show <id>               # full JSON for one email
scripts/buttondown.mjs push <file.md>          # markdown -> draft
scripts/buttondown.mjs send <id> --yes         # send. Irreversible.
scripts/buttondown.mjs design pull <dir>       # newsletter header/footer/css -> files
scripts/buttondown.mjs design push <dir>       # files -> newsletter
```

`send` without `--yes` tells you the subject and how many people would receive
it, then refuses. That is deliberate, and it is cheap to run as a check.

## The email design

`header`, `footer` and `css` live on the newsletter object, not on any email.
They are kept as files in `sites/moment-hill/newsletter/`:

```
header.html    HTML, supports Buttondown's template tags
footer.html    HTML, supports template tags
email.css      styles the sent mail
```

`design pull` overwrites those files from Buttondown; `design push` sends them
back, one field at a time so a plan restriction on one does not discard the
others. **Pull before editing** if the dashboard might have changed underneath
you, or a push silently reverts it. Design applies to mail sent from then on;
existing drafts re-render when they go out.

**`css` is blocked on the free plan.** Tested 2026-07-27: `PATCH` with a `css`
value returns `400 css__not_allowed`, "your current plan doesn't allow for
customizing css". `header`, `footer` and `tint_color` all apply fine. The error
does not say which plan unlocks it, and it is worth asking Buttondown before
paying for it, because it changes what an upgrade is actually worth.

So the free-tier design is three levers, not four:

1. **`tint_color`** — set to Tyne `#425e4f`. This is what colours links and
   accents in the body, and on free it is the main influence you have over how
   the body copy looks.
2. **`header.html` / `footer.html`** — carry their own inline styles, so they
   are fully branded regardless of the CSS restriction.
3. **The body** renders with Buttondown's stock template. Headings, quotes and
   code blocks will not match the site until `css` is unlocked.

`email.css` stays in this repo as the intended design. It is written and
correct; it is simply not applied. If `css` is ever unlocked, `design push`
applies it with no further work.

`web_css` styles the public archive at `buttondown.com/momenthill` and is
deliberately not managed here. Add it to `DESIGN` in the CLI if the archive ever
starts to matter.

Custom *templates* — replacing the wrapper HTML rather than styling it — need
the $79/mo Professional plan. Header, footer and CSS are free.

## Where everything lives

| What | Where |
|---|---|
| Issues (markdown) | `newsletters/` at the **root** of the content repo |
| Scaffold script | `new-newsletter.sh` in the content repo |
| CLI | [`scripts/buttondown.mjs`](../scripts/buttondown.mjs) |
| Agent instructions | `.claude/skills/buttondown/SKILL.md` |
| Signup form | [`sites/moment-hill/src/components/Newsletter.astro`](../sites/moment-hill/src/components/Newsletter.astro) |
| Newsletter username | `sites/moment-hill/configs/user.config.ts` → `newsletter.username` |
| API key | `~/.env` → `BUTTONDOWN_API_KEY` |

`newsletters/` is a **sibling** of `content/`, never inside it. `build-site.sh`
copies only `content/*/`, so issues cannot leak onto the website. If you ever
move that folder inside `content/`, drafts start shipping to the build machine.
Do not.

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

`status` means editorial readiness and nothing else. It is **not** a record of
what has been sent. Buttondown is the only thing that knows that, so ask it with
`list` rather than trusting a file.

## The API key

Created at **buttondown.com → Settings → API → Keys**. Buttondown supports
granular keys, so this one is scoped to the minimum:

| Category | Level | Why |
|---|---|---|
| Subscribers | Read | Counts, confirming a signup landed |
| Emails | Read & write | Create and update drafts |
| Sending | Enabled | The agent sends. See below. |
| Automations | None | Paid add-on, unused |
| Forms | None | The signup form is plain HTML, not the Forms API |
| Surveys | None | Paid add-on, unused |
| Settings | **Read & write** | Required for the email design — see below |
| Styling | Read & write | Set alongside Settings; not sufficient on its own |

The key also pins its own API version. Keep it on **2026-04-01**, whose default
email status is `draft`. Older versions defaulted to `about_to_send`.

**`Sending: Enabled` is a deliberate choice.** Buttondown can hard-block sending
at the key level, which would make the agent incapable of mailing anyone. That
was rejected: if you write the issue and the agent owns everything downstream,
the send belongs downstream too. Half an automation is worse than none.

What guards it instead:

- `status: ready` in the file. Your authorisation, in the artefact rather than
  in a chat message. `push` refuses anything else, and the agent is instructed
  never to set that field itself.
- `send` refuses without `--yes`, reporting the subject and recipient count.
- The agent states subject and recipient count and waits for a yes in that turn.

Three soft gates rather than one hard one, which is the right trade when the
alternative is you doing the last step by hand every time.

**The design needs `Settings: Read & write`, despite the category names.**
Tested on 2026-07-27: with `Styling: Read & write` and `Settings: Read`, every
`PATCH /v1/newsletters/{id}` returns 403 — including `tint_color`, which is
about as styling as a field gets. The whole newsletter object appears to sit
behind Settings, and Styling on its own grants nothing that `design push` needs.

That is a broader permission than the job deserves: Settings also covers the
sending address, domain registration and billing. It is the price of keeping the
email design in git rather than stranded in the dashboard. If that trade is not
worth it, set Settings to Read, edit the design by hand in Buttondown, and treat
the files here as a reference copy that `design pull` refreshes.

**To rotate:** create a new key in Buttondown, replace the value in `~/.env`,
delete the old key. Nothing caches it. The CLI reads `~/.env` directly, so no
shell reload is needed.

The key lives in `~/.env` and nowhere else. This repo is public.

## The signup form

[`Newsletter.astro`](../sites/moment-hill/src/components/Newsletter.astro) posts
a plain HTML form to Buttondown. No JavaScript, no API key in the page, nothing
to break if scripts are blocked.

It reads the username from `user.config.ts`. **A wrong slug 404s silently** —
the form looks fine and subscriptions vanish. Confirm with
`scripts/buttondown.mjs whoami` after any change. Remove the `newsletter` block
from the config entirely and the form reverts to its inert "coming soon" state,
which is what every other site in the platform gets by default.

The form targets a new tab, because Buttondown owns the confirmation screen and
the alternative is throwing people off momenthill.com mid-signup.

## What this costs

Free, at up to **100 subscribers**. Custom sending domain, hosted archives and
the markdown editor are all included.

Buttondown prices features à la carte rather than in tiers, so the upgrades that
might matter later:

| Feature | Cost | Worth it when |
|---|---|---|
| RSS-to-email | $9/mo | The newsletter becomes the blog. It is not, currently. |
| Tagging & segmentation | $9/mo | You want to mail part of the list |
| Analytics | $9/mo | Opens and clicks start driving decisions |
| Multiple newsletters | $29/mo | Almost certainly never — a second free account per brand is cheaper and cleaner |
| Custom email templates | $79/mo | You have outgrown restyling the stock template |

Add-ons stack. Two brands in one account with RSS-to-email is $38/mo; two
separate accounts with the same feature is $18/mo. Separate accounts also give
each brand its own key and sending domain, which matches how the rest of the
platform is arranged.

## No web presence

Deliberately configured so a subscriber never touches a Buttondown-hosted page.
Applied 2026-07-27:

| Setting | Value | Effect |
|---|---|---|
| `enabled_features` | `["api"]` | Archives **and** the subscriber portal off |
| `subscription_redirect_url` | `https://momenthill.com/subscribed` | After the form: "check your inbox and confirm" |
| `subscription_confirmation_redirect_url` | `https://momenthill.com/confirmed` | After the confirm link: "you're on the list" |
| `footer.html` | no archive or "view in browser" link | Only outbound links are the site and unsubscribe |

The two redirects are **two different pages on purpose**. Pointing both at one
page tells someone who has just confirmed to go and check their inbox for an
email they already acted on, which reads as a failure. `subscribed.astro` and
`confirmed.astro` are both `noindex`; they are destinations, not pages anyone
should find by search.

`buttondown.com/momenthill` still resolves, but it is now a bare subscribe page
with no archive content on it. Nothing your subscribers see ever links there.

**Do not use Buttondown's "private mode" for this.** It sounds like the right
setting and is not: it blocks public subscriptions entirely, including from form
endpoints, which would break the signup form. Disabling archives via
`enabled_features` is the correct mechanism.

That page does carry "Powered by Buttondown", and removing Buttondown branding
is part of whitelabeling at $79/mo. Assume the same line appears in sent email
until proven otherwise.

## Known constraints

- **100 subscribers** on free. Past that, check what Buttondown charges before
  it surprises you.
- **`css` is not editable on free** (`css__not_allowed`). Header, footer and
  `tint_color` are. Custom email *templates* are $79/mo on top of that.
- **Mail goes out on Buttondown's default sending domain.**
  `sending_domain_status` is `none`. The blocker used to be that
  `momenthill.com` was not on Cloudflare; it is now, so this is available
  whenever it is wanted. It is not free work: SPF on that domain is `-all`, a
  hard fail, so adding Buttondown as a sender means editing that record
  deliberately. See [`dns.md`](dns.md).
- **The API rejects a body starting with `---`**, reading it as stray
  frontmatter. The CLI strips ours. If you ever hand-roll a call, strip it too.
- **`send-draft` needs a JSON body.** With none it 422s "field required:
  payload". The body *is* the payload, so `{}` means send with defaults. A
  nested `{"payload": {}}` is rejected.
- **Test mode is OFF.** `test_mode: false` as of 2026-07-27. Every send goes to
  the real list. When it was on, a send went to the account address only and
  left the email a draft, so "still a draft" did not mean the send had failed;
  that no longer applies. Check `settings` rather than assuming either way.
- **`X-API-Version: 2026-04-01` is pinned** in the CLI. That version defaults new
  emails to `draft`. Older versions defaulted to `about_to_send`, which means
  the entire list. Do not unpin it.

## Scaling to another site

The CLI knows nothing about Moment Hill. To add a newsletter for another site:

1. New Buttondown account for that brand, its own login.
2. Its key in `~/.env` under a distinct name.
3. A `newsletter` block in that site's `user.config.ts`.
4. A `newsletters/` folder at the root of its content repo.

Same `n + 1` shape as everything else here: one account, one config block, one
folder per site, and no shared state between brands.
