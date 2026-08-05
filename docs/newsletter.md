# The newsletter

> **Deferred:** newsletter publishing is currently manual in Buttondown's own
> interface. The CLI and this document remain as unfinished implementation
> material, not as an active agent workflow. Do not use the CLI unless Jochen
> explicitly reopens this work. See [`HANDOVER.md`](../HANDOVER.md).

How the Moment Hill newsletter works, for whoever is running it next — including
future you, at 7am, having forgotten all of this.

It runs on **Buttondown**, free tier. One newsletter, one site. The design goal
was that publishing an issue costs one command and one decision, and that the
decision is always yours.

## Where it stands

| | |
|---|---|
| Newsletter | `momenthill` — `news_07rd0vfcnh9tt99qkepdn6b78w` |
| From | `Jochen <insights@newsletter.momenthill.com>` — the custom sending domain, live since 2026-07-28 |
| Reply-to | `insights@momenthill.com`, a Microsoft 365 alias, so replies are filterable by address |
| Test mode | **off** — every send is real |
| Subscribers | 5 confirmed, all `@spalink.me` test addresses |
| Issues sent | three, all pipeline or design tests |
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
scripts/buttondown.mjs subscribers --details   # addresses too; avoid in shared transcripts
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
header.html    HTML, supports Buttondown's template tags. Deliberately EMPTY.
footer.html    HTML, supports template tags
email.css      styles the sent mail
```

**`header.html` is empty on purpose, and must stay a file.** Buttondown's stock
wrapper already prints the newsletter name and the date directly above the
body, so a wordmark underneath said the same thing twice in forty pixels. It
was removed on 2026-07-28. Note that `design push` clears a field only when the
file exists and is empty — a *missing* file is skipped, not cleared
([`buttondown.mjs`](../scripts/buttondown.mjs) `cmdDesign`), so deleting
`header.html` would silently leave the old header live.

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

**The design is locked until 50 subscribers.** Decided 2026-07-28. The current
header/footer are what goes out, and they are not to be revisited on taste
grounds before that threshold. At 50 the plan gets paid for anyway, `css`
unlocks with it, and `email.css` — already written and sitting in this repo
unapplied — gets pushed then. So the trigger is a subscriber count, not an
opinion about how the email looks. Check with `subscribers`.

So the free-tier design is three levers, not four:

1. **`tint_color`** — set to Tyne `#425e4f`. This is what colours links and
   accents in the body, and on free it is the main influence you have over how
   the body copy looks.
2. **`footer.html`** — a wordmark link, the positioning line, and the company
   disclosure. It carries **no unsubscribe link**: Buttondown's wrapper prints
   its own immediately below, and having both rendered two unsubscribes in the
   same footer. `header.html` is empty, as above.

   **It is authored in Buttondown's editor, not here.** Jochen rewrote it in
   the dashboard on 2026-07-28, so the file is now markdown with a
   `buttondown-editor-mode` marker rather than the hand-written HTML block it
   started as. That is fine, but it means the file is a *pulled artefact*: any
   HTML comment you add to it is destroyed by the next `design pull`. Rationale
   about the footer belongs in this document, which is why it is here.
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
| Current operating status | manual in Buttondown; see [`HANDOVER.md`](../HANDOVER.md) |
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
with no archive content on it.

**One link does still point there, and it cannot be removed on this plan.**
Buttondown's stock template prints "Did someone forward you this? Subscribe to
this newsletter" above the body, linked to `buttondown.com/momenthill`. It is
part of the wrapper, not of `header`/`footer`, so the only way out is the
$79/mo custom-template plan. Noted as a known exception rather than left to
make the paragraph above quietly untrue.

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
- **Mail goes out on the custom sending domain.** `sending_domain_status` is
  `valid` as of 2026-07-28. `newsletter.momenthill.com` is delegated to
  Buttondown's nameservers under Buttondown's "managed" option, so it creates
  and rotates the DKIM, MX, bounce and click-tracking records itself and there
  is nothing to maintain in Cloudflare beyond the two `NS` records. The root
  SPF was never touched: alignment happens on `pm-bounces` inside the
  subdomain. See [`dns.md`](dns.md).
- **The API rejects a body starting with `---`**, reading it as stray
  frontmatter. The CLI strips ours. If you ever hand-roll a call, strip it too.
- **`send-draft` needs a JSON body.** With none it 422s "field required:
  payload". The body *is* the payload, so `{}` means send with defaults. A
  nested `{"payload": {}}` is rejected.
- **Publishing is `PATCH /emails/{id}` with `status: about_to_send`. Settled.**
  This entry previously argued the opposite and was wrong, so the evidence is
  recorded here rather than left to be re-litigated. The CLI used to
  `POST /emails/{id}/send-draft`, defended on the grounds that the one issue
  ever sent had delivery stats and the `send-draft` code predated it by three
  hours. That was correlation; the send was made by hand in the dashboard.
  Tested directly on 2026-07-28: `send-draft` returns **200 with an empty body,
  the email stays `draft`, `publish_date` stays null, and nothing is
  delivered** — not to the list, not to the account address. Called twice,
  delivered nothing twice. The `PATCH` then sent to all 5 subscribers within a
  minute. So `send --yes` was printing "Sent" and mailing no one. A 2xx from
  Buttondown is not delivery evidence; the CLI now polls the status and
  reports what it actually finds.
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
