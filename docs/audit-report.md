# Independent platform audit

**Date:** 28 July 2026  
**Scope:** the public `websites` repository, both private content repositories,
the documented Cloudflare configuration, public DNS, and the two live websites.
Cloudflare's account and Buttondown's live API were not accessed, as required by
the audit brief.

This report distinguishes the state I found from repairs made during the audit.
Those repairs are local and uncommitted. Nothing has been pushed, deployed or sent.

## 1. Verdict

This is a sound foundation for two small static websites, and I found no evidence
of malicious code, an intrusion, leaked credentials or private content in the
public repository. I did find one broken newsletter-send command and one avoidable
way for a compromised content repository to run code during a Cloudflare build;
both are repaired locally. The remaining material decision is mail protection:
both domains currently monitor spoofing but do not ask receiving mail systems to
block it. Once the repairs are deployed and that mail policy is tightened
carefully, there is no reason to treat the platform itself as unsafe.

## 2. Findings

### Medium — the newsletter command did not send the newsletter

**Status: VERIFIED. Repaired locally, not used against the live account.**

- **Trigger:** running `scripts/buttondown.mjs send <id> --yes` on a finished
  Buttondown draft.
- **Where:** the previous implementation in `scripts/buttondown.mjs` called
  `POST /emails/{id}/send-draft` and then printed `Sent`. Buttondown documents
  that route as a preview-copy operation. Publishing is a `PATCH` of the email's
  status to `about_to_send`.
- **Concrete consequence:** the command could tell Jochen that a newsletter had
  been sent even though subscribers had not received it. With the recommended
  key permissions at the time, it could instead fail with a permission error.
  This is a business-process failure, not a cyber attack or data breach.
- **Fix:** the command now verifies that the email is a draft and still requires
  the explicit `--yes`, but publishes it with `PATCH /emails/{id}` and
  `{ "status": "about_to_send" }` at
  [`scripts/buttondown.mjs`](../scripts/buttondown.mjs#L353). The documented key
  scope now includes Buttondown's Sending permission. A mocked API run verified
  the exact method, path and body without sending real mail. This was a
  five-minute code change; a first real send should still be watched in the
  Buttondown dashboard.
- **Confidence:** high. This is supported by Buttondown's official
  [drafting guide](https://docs.buttondown.com/drafting-emails-via-the-api),
  [send-draft reference](https://docs.buttondown.com/api-emails-send-draft), and
  [API permission table](https://docs.buttondown.com/api-authentication). I did
  not make the irreversible live call, so I could not verify delivery through
  the real account.

### Medium — a content repository was more powerful than the design claimed

**Status: VERIFIED mechanics; INFERRED cloud consequence. Repaired locally.**

- **Trigger:** someone with write access to either private content repository,
  or an attacker who took over such an account, commits an `.mdx` file or a
  symlink under `content/`.
- **Where:** both collection definitions accepted `.mdx`; both Astro apps loaded
  the MDX integration; and the old copy at `scripts/build-site.sh` used `cp -RL`,
  which follows symlinks. The comment beside it incorrectly claimed `-L`
  prevented escape.
- **Concrete consequence:** content was not merely markdown and images. An MDX
  file could execute JavaScript while Cloudflare built the site, and a symlink
  could make the build copy a file from outside `content/`. In a harmless
  temporary-copy test, an MDX file read a marker from outside the content tree
  and placed it in generated output. On Cloudflare, the same mechanism could
  inspect whatever files and environment values the build process can see and
  send them elsewhere. There is no evidence this ever happened, and the real
  content repositories contained neither MDX nor symlinks.
- **Fix:** collections now accept `.md` only; the unnecessary MDX integrations
  and packages are removed; the build rejects every symlink below `content/`,
  copies without following links, and verifies the contract's `site` as well as
  its schema at [`scripts/build-site.sh`](../scripts/build-site.sh#L40). Schema
  versions were advanced in both app and content repositories so old
  infrastructure cannot silently accept the new contract. This was a small
  repair, not a new infrastructure project.
- **Confidence:** high for local execution and symlink behaviour. The possible
  Cloudflare exposure is an inference because the account and build environment
  were deliberately out of scope; I did not assume undocumented Cloudflare
  secrets exist.

### Medium — both mail domains remain spoofable at the policy level

**Status: VERIFIED configuration; INFERRED delivery outcome. Not changed.**

- **Trigger:** an attacker sends mail displaying an address at either domain
  from an unauthorised mail system, and the recipient's provider accepts a
  message that fails authentication.
- **Where:** public DNS matches [`docs/dns.md`](dns.md). Both domains publish
  `DMARC p=none`. Shifted Knowledge also uses a neutral `SPF ?all` and has no
  DMARC reporting address. Moment Hill has the stronger `SPF -all`, a reporting
  address, and two valid Microsoft 365 DKIM selectors.
- **Concrete consequence:** SPF and DKIM help receiving systems identify genuine
  mail, but `p=none` asks them only to report DMARC failures, not quarantine or
  reject them. A convincing fake invoice or change-of-bank-details message using
  `@momenthill.com` is therefore not blocked by the domain owner's DMARC policy.
  Individual providers may still reject it, so this is exposure rather than a
  guarantee that spoofed mail will arrive.
- **Fix:** this is a short, careful mail-hardening project rather than a blind
  five-minute edit. Confirm that all legitimate Microsoft 365 and Fastmail mail
  is DKIM-aligned; collect and inspect DMARC reports; add a reporting address for
  Shifted Knowledge; then move through `p=quarantine` to `p=reject`. Tighten
  Shifted Knowledge's SPF once every legitimate sender is known. Do not add
  Buttondown to Moment Hill's `SPF -all` unless a custom Buttondown sending domain
  is deliberately configured.
- **Confidence:** high on the published records and standards-level policy. I
  could not inspect real received-message headers, so I could not verify whether
  every legitimate outbound message is currently DKIM-aligned. That must happen
  before changing enforcement.

### Low — newsletter safety gates leaked more information or allowed more than documented

**Status: VERIFIED. Repaired locally.**

- **Trigger:** `push` was run on an issue with no `status` field, or
  `subscribers` was run in a recorded terminal session.
- **Where:** the old check at `scripts/buttondown.mjs` rejected a non-ready value
  but allowed a missing value; the default subscriber listing printed up to 25
  email addresses.
- **Concrete consequence:** an unfinished issue could be uploaded as a draft
  despite the claimed editorial gate, and subscriber addresses could appear in
  a terminal transcript unnecessarily. `push` still could not send the issue,
  and no leak into git or web output was found.
- **Fix:** `push` now requires exactly `status: ready` at
  [`scripts/buttondown.mjs`](../scripts/buttondown.mjs#L205), and `subscribers`
  prints only the count unless `--details` is explicitly supplied. Mocked runs
  verified both behaviours. Five-minute changes.
- **Confidence:** high. No live subscriber data was requested or printed during
  this audit.

### Low — the documented CSP protection was not present on either live site

**Status: VERIFIED. Repaired locally; deployment required.**

- **Trigger:** a future mistake or compromised page introduces a script from an
  origin the site did not intend to trust.
- **Where:** neither live site's response headers nor generated HTML contained a
  Content-Security-Policy. Shifted Knowledge's Astro configuration looked as if
  it enabled one, but a static build emitted no header or meta policy. The audit
  brief therefore had the facts wrong when it said Shifted Knowledge already had
  a CSP.
- **Concrete consequence:** this removed one layer that can limit the damage of
  a future content or dependency mistake. The present sites have no user input,
  server or accounts, so this did not expose a demonstrated attack and remains
  low severity.
- **Fix:** each site now has a Cloudflare Pages `_headers` policy at
  [`sites/shifted-knowledge/public/_headers`](../sites/shifted-knowledge/public/_headers)
  and [`sites/moment-hill/public/_headers`](../sites/moment-hill/public/_headers).
  Moment Hill explicitly permits form submission to `https://buttondown.com`.
  Local Wrangler and browser checks verified both headers, working pages and the
  unchanged form action. This is a small change, but it is not live until both
  sites are rebuilt.
- **Confidence:** high for the live absence and local repair. Only a post-deploy
  response-header check can verify Cloudflare is serving it in production.

### Low — one removed Shifted Knowledge route still returned a 404

**Status: VERIFIED. Repaired locally; deployment required.**

- **Trigger:** visiting an old `/search`, `/search/` or `/search/...` link.
- **Where:** [`sites/shifted-knowledge/public/_redirects`](../sites/shifted-knowledge/public/_redirects)
  covered old archive and tag URLs but not the removed search URLs, while the
  platform documentation claimed all removed URLs redirected to `/posts`.
- **Concrete consequence:** an old bookmark or search-engine result showed a 404
  instead of the post timeline. Nothing was exposed.
- **Fix:** the three Cloudflare Pages rules are now present. Local Wrangler and
  an in-app browser followed `/search` to `/posts/`. Five-minute change.
- **Confidence:** high. Production will retain the 404 until rebuilt.

### Low — the RSS package had a patch available for feed injection

**Status: VERIFIED. Repaired locally.**

- **Trigger:** a trusted content author deliberately or accidentally places
  crafted text in feed metadata handled by the affected package version.
- **Where:** both apps used `@astrojs/rss` 4.0.18; the current npm audit identified
  its XML-injection advisory. The feed content itself is additionally sanitised
  and relative links are rewritten after Astro renders each post.
- **Concrete consequence:** malformed trusted content could alter the structure
  of the generated RSS feed. It could not compromise the static website or a
  server, and only trusted repository writers control that content.
- **Fix:** both apps now use the patched 4.0.19 release. Full assembled builds
  produced well-formed feeds with absolute internal URLs. Five-minute update.
- **Confidence:** high on the version and output. Feed readers vary, so no finite
  test can prove compatibility with every reader.

## 3. Things checked and found sound

- **Secrets and history:** I scanned the complete git history of the public
  infrastructure repository and both content repositories for common token and
  private-key patterns and secret-like filenames. I found no credential, private
  key, `.env` file or private content committed at any point. The real `~/.env`
  is mode `600`; its secret values were not read or printed. The Buttondown code
  puts the key only in the HTTPS `Authorization` header and redacts the
  newsletter object's own API-key field by allowlisting settings fields.
- **Public/private boundary:** `sites/*/src/content` is ignored, neither site has
  ever tracked that path, and the local symlinks point from ignored app paths to
  the private repositories. Removing the destination link before `rm -rf` removes
  the link itself, not its target. The repaired build also rejects content
  symlinks and a wrong site contract before modifying the app.
- **Build behaviour:** both complete commands,
  `scripts/build-site.sh shifted-knowledge <content-repo>` and
  `scripts/build-site.sh moment-hill <content-repo>`, passed in clean temporary
  working-tree copies after repair. Negative tests rejected a content symlink and
  a Moment Hill contract supplied to the Shifted Knowledge app. A former MDX
  proof file was ignored after the markdown-only repair.
- **Dependencies:** all packages resolve from the npm registry; I found no git,
  URL or unusual private dependency source. After patching compatible versions,
  each app has three remaining npm audit entries: `astro`, `sharp` and `esbuild`.
  Their vulnerable paths are build/development tooling on this static deployment,
  not a long-running production server. Clearing the Astro and Sharp entries still
  requires the already accepted Astro 7 project. This is worth maintaining but is
  not evidence that the live static files are compromised.
- **Pages and feeds:** both live apex and `www` addresses use HTTPS and resolve to
  the apex canonical; HTTP redirects to HTTPS. Canonical URLs, RSS and sitemap
  URLs match each site. Feeds returned XML and the assembled local feeds parsed;
  drafts were excluded. A generated-output link check found no missing local
  targets.
- **Accessibility smoke check:** local browser inspection found a single `h1` on
  each home page, language declarations, text alternatives for images, no empty
  links, no duplicate IDs, named visible controls and no browser console errors.
  The Moment Hill email input is labelled and its form remains a plain HTTPS POST
  to Buttondown in a new tab. The only unnamed control detected was its hidden
  `embed=1` field, which does not need an accessible name.
- **DNS plumbing:** public A/AAAA/CNAME/MX/TXT/SRV answers matched the recorded
  zones. Both domains use the documented Cloudflare nameservers. Moment Hill's
  Microsoft 365 MX, autodiscover and two DKIM selectors resolve correctly, and
  its SPF is a hard fail. Shifted Knowledge's Fastmail MX, SPF, DKIM and service
  records resolve as documented. The Moment Hill mail-related records that must
  remain DNS-only resolve to their external Microsoft targets rather than a
  Cloudflare proxy address.
- **Newsletter surface:** the public signup page contains no API key and sends
  only the address and Buttondown's `embed=1` marker to Buttondown. `push` always
  creates or updates a draft, and `send` refuses a non-draft or an invocation
  without `--yes`.
- **Deployment safety:** the site-name allowlist is closed, schema mismatches fail
  before build, `npm ci` honours locks, and a failed Cloudflare build cannot
  replace the last successful static deployment under the documented Pages
  model.

## 4. Where the documentation misled

These disagreements were repaired in the local documentation alongside the code:

- The newsletter manual and skill described Buttondown's `send-draft` preview
  endpoint as the way to publish to the list, and recommended disabling the
  permission actually needed to send.
- The build comment said `cp -L` stopped symlinks escaping the content tree. It
  does the opposite: `-L` follows them.
- The audit brief said Shifted Knowledge had a CSP. Neither live site did; the
  apparent Astro setting did not survive a static build.
- The platform manual said all removed Shifted Knowledge URLs redirect, but the
  search routes returned 404.
- Several surfaces described production as pinned to an immutable SHA even
  though the recorded and current production setting is `main`. The operating
  docs now distinguish active `main` tracking from an optional frozen SHA.
- The design specification and site-platform skill contained stale content
  shapes, schema examples and search behaviour. They now match the actual
  collections and markdown-only contract.
- The docs described a content repository as data-only without enforcing it.
  The code and schema contract now enforce markdown-only regular files.

## 5. Disagreements with the accepted list

- **CSP:** I disagree with the factual premise, not the original severity. Shifted
  Knowledge did not have an effective CSP, but the absence on these static,
  input-free sites was still low severity. Both policies are now staged locally,
  with Moment Hill's Buttondown form explicitly allowed.
- **Astro 7:** I agree with deferring the major upgrade. Compatible dependency
  patches reduced each app from several audit entries to three, and the remaining
  vulnerable paths are not exposed as a production server. Revisit the upgrade
  deliberately rather than treating an npm severity label as a live-site breach.
- **Tests, preview drift, dead Pages project and monitoring:** I found no evidence
  that their severity was understated. The lack of an automated check allowed
  the newsletter endpoint and redirect errors to survive, but the brief already
  calls it the largest engineering gap. That is a maintenance priority, not a
  new security finding on two static sites.

## Repair and release status

All code and documentation repairs described above are present only in the local
working trees. They span the public infrastructure repository and the two private
content repositories because the content contract version had to move in step.
They have passed full assembled builds and targeted negative tests. No commit,
push, production rebuild, DNS change, Buttondown API call or newsletter send was
performed during this audit.
