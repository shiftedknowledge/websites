# Audit brief

The prompt handed to an independent auditor (Codex) on 2026-07-28, kept in the
repo so the next audit can start from the same baseline and so the findings can
be read against what was actually asked.

Nothing in this file is instructions for building the site. It is a record.

---

## Prompt

You are auditing a small personal web platform. The owner is not a programmer.
He relies entirely on AI agents to build and maintain this, cannot review the
code himself, and has commissioned this audit because he wants an independent
opinion before treating the setup as a foundation to build on. Write for him,
not for an engineer: when you find something, say what could actually go wrong
and how bad it would be, not just which line is wrong.

### What this is

One public infrastructure repo builds two independent static websites. Each
site's prose and images live in a **separate private content repo**, so the
owner can write from a phone without touching code.

```
github.com/shiftedknowledge/websites                  public   <- you are auditing this
github.com/shiftedknowledge/shifted-knowledge-content private  markdown + images
github.com/shiftedknowledge/moment-hill-content       private  markdown + images
```

- **shiftedknowledge.com** — personal site, building in the open.
- **momenthill.com** — a one-person advisory practice. Has a newsletter
  (Buttondown) and a signup form. This is the one that carries business email.

Both are Astro 6 static sites on Tailwind v4, deployed on Cloudflare Pages, free
plan. There is no server, no database, no user accounts, no login, no
server-side rendering and no user-submitted content. Every page is a static file
built ahead of time.

Cloudflare's Pages project for each site is connected to that site's **content**
repo, not to the infrastructure repo. On a push it clones the infra repo at a
pinned ref into `.infra/`, runs `scripts/build-site.sh`, publishes `dist/`, and
throws the machine away. A failed build publishes nothing and the previous
deployment stays live.

### Start here

Read in this order. `AGENTS.md` is the operating manual, `docs/platform.md` is
the current state of everything, `docs/design-spec.md` is the rationale.

| | |
|---|---|
| `AGENTS.md` | how the repo works |
| `docs/platform.md` | current state, including verified Cloudflare and dependency posture |
| `docs/dns.md` | both DNS zones, record by record |
| `docs/newsletter.md` | the Buttondown pipeline |
| `scripts/build-site.sh` | what Cloudflare actually runs |
| `scripts/buttondown.mjs` | the only code that touches a secret |
| `sites.yml` | the deployment manifest |

### Treat the documentation as a claim, not as evidence

**This is the most important instruction in the brief.** Every file above was
written by the same AI agent that wrote the code. If that agent misunderstood
something, the docs describe the misunderstanding fluently and confidently. Your
value is in checking the code and the live systems against the prose.

Where the two disagree, the code wins and the disagreement is a finding. Where
the docs assert something you cannot verify, say so explicitly rather than
accepting it.

### Do not touch Cloudflare

The account is deliberately out of scope for you and there is no API token to
give you. Its full configuration — every Pages build setting, both sets of
environment variables, both DNS zones — is recorded in `docs/platform.md` and
`docs/dns.md`, read back from the live systems on 2026-07-28. Audit that
configuration **as documented**. If the documentation is missing something you
need in order to judge it, name the gap in your report; do not go looking.

You may read the live sites over HTTPS (`https://shiftedknowledge.com`,
`https://momenthill.com`) — response headers, HTML, the RSS feeds. Do not
attempt anything intrusive against them.

### Where the real risk is

Aim here. A generic web-security checklist will mostly generate noise on a
static site, and noise costs the owner more than it helps him.

1. **Secret handling.** `~/.env` holds a Buttondown API key and other
   credentials. `scripts/buttondown.mjs` is the only code that reads one. Can a
   key leak into the public repo, into build output, into a log, into an error
   message, or into a terminal transcript? The infra repo is **public** — check
   its full git history, not just the working tree.
2. **The public/private boundary.** Private content must never end up committed
   into the public infra repo. `scripts/dev-link.sh` symlinks a content repo
   into the app; `build-site.sh` copies content in. Can either leak content the
   wrong way, and does `.gitignore` genuinely hold?
3. **The build pipeline.** `build-site.sh` runs on a machine that checks out a
   repo and executes code from another repo. Look at the site-name allowlist,
   the schema contract check, and the `rm -rf` on the assembled content
   directory — especially its symlink handling, and what happens under
   unexpected arguments or a hostile content repo.
4. **Supply chain.** Both apps have known npm advisories.
   `docs/platform.md` contains an analysis of where each package actually runs
   and why most are considered build-time-only. **Check that reasoning rather
   than repeating the advisory list** — if the analysis is wrong or convenient,
   that is a significant finding. Also look at the dependency set itself: is
   anything unnecessary, unmaintained, or oddly sourced?
5. **DNS and mail.** Mail is load-bearing and the websites are not. Read
   `docs/dns.md` against what you can resolve publicly. Assess SPF, DKIM and
   DMARC posture on both domains and say plainly whether the current settings
   leave either domain spoofable. Note that `momenthill.com` requires three
   records to stay unproxied.
6. **The Buttondown newsletter path.** `scripts/buttondown.mjs` sends drafts and
   can send live email. Check the guards around sending, the API key scoping
   advice it prints, and the signup form on momenthill.com, which is a native
   HTML POST to a third-party domain.
7. **Correctness bugs in the site code.** Broken links, wrong canonical URLs,
   wrong dates, feeds that break in real readers, redirects that do not fire,
   accessibility failures, anything that produces a wrong page rather than an
   insecure one. The Shifted Knowledge RSS feed renders full post content
   through Astro's container API and rewrites relative URLs to absolute with
   regular expressions — scrutinise that specifically.
8. **Anything you consider relevant that this brief failed to anticipate.** The
   brief was written by the agent being audited. Its blind spots are inherited.
   Treat this item as real scope, not a formality.

### Known and already accepted

Do not spend effort rediscovering these; they are in `docs/platform.md` under
"Known open items". Do tell us if we have **misjudged the severity** of any.

- No automated tests and no type-check step. The only gate is a clean build.
- Moment Hill has no Content-Security-Policy. Shifted Knowledge does. Not fixed
  blindly because a careless `form-action` would break the newsletter signup.
- Astro 7 is available and would clear the `astro` and `sharp` advisories. It is
  a major bump on two bespoke apps and has not been done.
- `shifted-knowledge`'s *preview* environment pins an old infra commit.
  Production tracks `main`. No preview branches are in use.
- A dead `moment-hill-preview` Pages project still exists.
- Nothing monitors any of this.

### What to produce

A single markdown report. Structure it as:

1. **Verdict** — three or four sentences. Is this a sound foundation to build
   on? Written for a non-programmer.
2. **Findings**, ordered by severity, worst first. For each:
   - severity (critical / high / medium / low), and what it would take to
     exploit or trigger it
   - the file and line, or the specific configuration
   - **the concrete consequence** — what actually happens to him if this is
     left alone
   - the fix, and whether it is a five-minute change or a project
   - your confidence, and what you could not verify
3. **Things you checked and found sound.** Explicitly list these. A report that
   only contains problems gives him no way to tell thorough from alarmist.
4. **Where the documentation misleads.** Any place the prose and the code
   disagree, listed separately, because the docs are load-bearing for whoever
   maintains this next.
5. **Disagreements with the accepted list** above, if any.

Rules for the report:

- **Separate what you verified from what you inferred.** Mark every finding.
- **No speculative findings.** If you cannot show the path, say it is a
  hypothesis and rank it low.
- Do not recommend adding infrastructure (CI, tests, monitoring, a framework)
  as a finding in its own right unless you can tie it to a specific failure that
  would actually have occurred here.
- Say when something is fine. Over-reporting on a two-page personal website is a
  real cost: it will cause the owner to spend money and attention on nothing.
