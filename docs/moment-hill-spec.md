# Moment Hill — website build spec

**Status:** For the next session. Not built. Shifted Knowledge is built and live on
this platform and is the working reference for everything here. Read this top to
bottom, then settle the one open decision in section 2 before writing any code.

Moment Hill is a consultancy brand (Moment Hill Ltd), currently on Squarespace. This
rebuilds it as a markdown-first static site **on the same platform as Shifted
Knowledge**, so there is one way of working. The heavy lifting (content/infra split,
build/deploy mechanism, custom-domain + DNS migration) is already proven on SK.

## 0. What changed since this spec was first written

The original MH spec assumed a *standalone* repo under a separate `MomentHill` GitHub
org, its own SSH alias, and a direct Cloudflare connection. **That is superseded.**
There is now a platform (`shiftedknowledge/websites`, public infra) that builds each
site from a private per-site content repo. MH folds into it exactly like SK did:

- App: `websites/sites/moment-hill/` (a bespoke Astro app).
- Content: `shiftedknowledge/moment-hill-content` (private repo).
- One `shiftedknowledge` GitHub owner, one Cloudflare account. No separate org, no
  SSH alias.

The platform design is in [`design-spec.md`](design-spec.md); the operating manual is
[`../AGENTS.md`](../AGENTS.md). SK is the copy-paste reference:
`websites/sites/shifted-knowledge` (app) and the `shifted-knowledge-content` repo.

## 1. What the site needs

Consultancy / marketing site, not heavy commerce:

| Need | Notes |
|------|-------|
| Front page | landing sections |
| Products / services | overview + one page per product/service (outbound "buy" links to an external platform, TBD; no commerce backend) |
| Blog | posts, tags, RSS, related posts |
| About | standalone page |
| Legal / small print | privacy + terms pages |
| Newsletter subscribe | UI only; wire an ESP later (Buttondown/MailerLite) or leave a marked placeholder |
| SEO | canonical, sitemap, RSS, OG images |
| Analytics | Cloudflare Web Analytics (cookieless), set in the Pages dashboard — not GA/GTM |

## 2. THE decision to make first: what the app is built on

This was left open last session. Settle it before building, because it determines
the toolchain and one change to the platform's build script.

**Option A — lighter npm app, matches the platform (recommended for "one system").**
Build MH as a bespoke Astro app on the platform's existing **npm** toolchain, with
its own consultancy design and the Moment Hill brand. `scripts/build-site.sh` works
unchanged (it runs `npm ci && npm run build`). Nothing new to install. More design
work up front (build the product/blog structure), but full toolchain parity with SK.

**Option B — the `astro-cloudflare-starter` (rich, but heavier).**
`milzamsz/astro-cloudflare-starter`: Astro 7 + React + Tailwind v4, ready-made
`blog`/`services`(=products)/`pages` collections, a design knowledge base, and a KPI
guard (`pnpm lint` fails the build on off-system edits). Costs:
- Pins **Node 24 + pnpm 8.15** exactly (`.node-version`, `packageManager`). Neither
  is installed on this Mac; enable via `corepack enable && corepack prepare pnpm@8.15.0 --activate`
  plus a Node 24 install.
- `scripts/build-site.sh` currently assumes npm. It would need a **per-site package
  manager**: for `moment-hill`, run `corepack pnpm install --frozen-lockfile && corepack pnpm build`
  instead of `npm ci && npm run build`. Cloudflare's build image supports this via
  `NODE_VERSION=24`.
- Diverges from the pure-npm "one system" (SK is npm, MH would be pnpm).

Recommendation: **Option A** unless the starter's ready-made commerce scaffolding is
worth the pnpm/Node divergence. Owner decides at session start.

## 3. How MH fits the platform (once the stack is chosen)

Mirror SK exactly:

1. **App** at `websites/sites/moment-hill/` — a full Astro project with the MH design.
   Add `sites/moment-hill/CONTENT_SCHEMA` (= `1`).
2. **Content repo** `shiftedknowledge/moment-hill-content` (private) — `content/`
   (blog, products/services, pages), `content-contract.yml` (`site: moment-hill`,
   `schema: 1`), an `AGENTS.md` carrying MH voice + brand + the content contract,
   author docs, and a `new-*.sh` scaffolder.
3. **Wire the platform:** add `moment-hill` to the `case` allowlist in
   `scripts/build-site.sh` (and, if Option B, its pnpm branch); add a `moment-hill`
   row to `sites.yml`.
4. **Cloudflare Pages project** connected to `moment-hill-content` (not the infra
   repo). Build command + env vars as SK: `INFRA_REPO`, `INFRA_REF=main`,
   `SITE=moment-hill`, `NODE_VERSION` (22 for Option A, 24 for Option B), output
   `.infra/sites/moment-hill/dist`. See [`../CLOUDFLARE_SETUP.md`](../CLOUDFLARE_SETUP.md).
   `INFRA_REF` tracks `main` (deploy = push infra + trigger via a content-repo push).
5. Point the app's `url`/`SITE_URL` config at `https://momenthill.com`.

The content-contract gate, draft flag, dev-link workflow, and fail-safe deploys all
work identically to SK; do not reinvent them.

## 4. Brand — Moment Hill (Tyne Bridge identity, locked 2026-06-07)

Full system in the vault:
`THE_BRAIN/05_AREAS/Marketing/Moment Hill Branding/Moment Hill Brand Guide.md`
(+ `Moment Hill Brand Reference.md`). Pull from those; do not restate the whole
system. Image assets (no brand PDF): `THE_BRAIN/+/assets/logo-stacked.png`,
`Moment Hill Colour Theme.png`, `Moment Hill Logo - colourways.png`.

Palette (five working tones + one spot):

| Role | Name | Hex |
|------|------|-----|
| Text / anchor | Charcoal | `#3F3F3F` |
| Default surface | Moment Grey | `#6F7C77` |
| Heritage accent | Tyne Green | `#425E4F` |
| Light separation | Hill Sage | `#9BACA4` |
| Light ground | Stone | `#EDEEE6` |
| Spot (rare) | Burnt Orange | `#B85C38` |

**Burnt Orange rule:** graphics/illustration only, never UI, type, or theme; max one
instance per composition. (SK enforces the same rule; its RSS icon is monochrome for
exactly this reason.) Typography: **Libertinus** family (Serif headings/wordmark,
Sans body/UI, Serif Display for large titles, Mono for code). Reuse the
`LibertinusSans-*.woff2` from the archived site (see section 6); self-host via local
`@font-face` if Fontsource lacks Libertinus. Messaging (locked): tagline "The bridge
between knowing and delivering."; triad "Trusted Frameworks / Smart Leverage / Real
Results."

Where brand plugs in depends on the stack: Option A, a `theme.css`/config like SK;
Option B, `src/config/site.config.ts` `branding.colors` translated to OKLCH tokens
(never hardcode hex; the KPI guard enforces it).

## 5. Content model

- **Products/services:** `slug`, `title`, `description`, `features[]`, `priceRange`,
  `order`, markdown body. Overview at `/services` (or `/products`), detail per slug.
- **Blog:** posts with tags, RSS, related posts. Flat files, **filename = slug** (the
  same Lipi-style gotcha SK hit: no `foo/index.md`, or the URL becomes `/foo/index`;
  verify the chosen theme's slug derivation).
- **Pages:** about, privacy, terms (mark legal pages as such).
- Images co-located with their entry, referenced relatively (as on SK).

## 6. Salvage from the archived attempt

`/Users/jochen/CODE/zzarchive/momenthill-site-cloudflare` (a superseded Astro 6
build — reuse content only, do not resurrect the code):
- Blog: `src/content/blog/porters-five-forces-the-ai-powered-competitive-analysis.md`.
- About copy, product/CTA wording, and the Libertinus `woff2` in `public/fonts/`.

Sibling `/Users/jochen/CODE/zzarchive/momenthill-site` is an older spec-driven
scaffold, prior-art only.

## 7. Domain migration: momenthill.com (do this the SK way)

momenthill.com is registered at **Hover** (Tucows), DNS hosted at
`ns1/ns2.hover.com`, **DNSSEC off**. The site is on **Squarespace** today (apex A →
Squarespace `198.185.159.x`/`198.49.23.x`, `www` → `ext-cust.squarespace.com`).
**Email is Microsoft 365** (MX → `momenthill-com.mail.protection.outlook.com`, SPF
`v=spf1 include:spf.protection.outlook.com -all`, an `MS=ms50284058` verification
TXT). This is the one real difference from SK, whose email was Fastmail — **the
records to preserve are the M365 set**, which is larger.

Follow the exact recipe proven on SK (see the recovery doc
`THE_BRAIN/05_AREAS/IT-Digital/shiftedknowledge.com-dns-cloudflare.md` for the full
play-by-play). In order:

1. **Capture the complete current momenthill.com zone first** and write a foolproof
   recovery doc in `THE_BRAIN/05_AREAS/IT-Digital/` (original zone + one-step
   rollback = point nameservers back to Hover). The M365 records to enumerate and
   preserve, all **DNS-only (never proxied)**:
   - MX → `momenthill-com.mail.protection.outlook.com`
   - TXT SPF → `v=spf1 include:spf.protection.outlook.com -all`, and the `MS=…`
     verification TXT
   - CNAME `autodiscover` → `autodiscover.outlook.com`
   - CNAME `selector1._domainkey` / `selector2._domainkey` → `…onmicrosoft.com` (DKIM)
   - CNAME `enterpriseregistration` / `enterpriseenrollment` (if present, Intune/MDM)
   - SRV/CNAME `_sip`, `sipdir`, `lyncdiscover` (if Teams/Skype is in use)
   - Add DMARC while here (none exists today): start `v=DMARC1; p=none;`.
   Query each before migrating; Cloudflare's import scan misses some (add manually).
2. Add momenthill.com to Cloudflare (Connect a domain), Free plan; recreate/verify
   every email record; **drop the Squarespace apex/www A records** (the site moves to
   Pages). Watch for DKIM/autodiscover CNAMEs importing as "Proxied" — flip them to
   DNS-only, exactly as on SK.
3. Change nameservers at Hover to the two Cloudflare nameservers; DNSSEC is off, so
   no extra step. Email keeps flowing because the M365 MX is unchanged.
4. Once the zone is active, attach the custom domain (apex + `www`) to the
   `moment-hill` Pages project; set the app `url` to `https://momenthill.com`.
5. Wind down Squarespace after the site is verified live on Cloudflare.

Gotchas learned on SK (expect them): a Cloudflare account "verify your email" gate;
custom-domain SSL takes minutes to issue; after the nameserver cutover, the owner's
own network keeps serving the old (Squarespace) IP from cached delegation for up to
~48h — fix per device with `1.1.1.1` and a DNS-cache flush (`sudo dscacheutil
-flushcache; sudo killall -HUP mDNSResponder`; a reboot is the definitive flush;
Tailscale/mDNSResponder can hold app-facing caches even when `dig` is already
correct).

## 8. Build sequence

1. Settle section 2 (stack). If Option B, install Node 24 + pnpm 8.15 and add the
   pnpm branch to `scripts/build-site.sh`.
2. Create `websites/sites/moment-hill/` (the app) and `moment-hill-content` (content
   repo); add `CONTENT_SCHEMA`, `content-contract.yml`, allowlist entry, `sites.yml`
   row.
3. Apply the MH brand (palette, Libertinus, logo, favicon; tokens-only if Option B).
4. Content: front page sections, 2–4 products, About, privacy + terms, the salvaged
   blog post; wire or placeholder the newsletter.
5. Prove the assembled build locally (`scripts/build-site.sh moment-hill <content-repo>`).
6. Push both repos under `shiftedknowledge`; create the Cloudflare Pages project
   against `moment-hill-content`; owner does the one-time connect.
7. Migrate momenthill.com per section 7 (recovery doc first).

## 9. Verification

- Assembled build clean; `dist/` has the front page, products overview + a detail,
  blog + the post, About, privacy, terms, `rss.xml`, sitemap, OG images.
- Renders in Moment Hill brand (Libertinus, the palette, Burnt Orange only as a
  single graphic spot).
- Live at `https://momenthill.com` (+ `www`) with a valid cert; `url` matches.
- **M365 email intact throughout** (send + receive a test); MX/SPF/DKIM verified on
  public resolvers after cutover.
- Analytics is Cloudflare Web Analytics only.
- The content repo's docs let a newcomer add a product or article and publish by
  pushing, no outside help.

## 10. Open items for the owner

- **Stack (section 2)** — the first decision.
- Whether the products surface is labelled "Products" or "Services".
- The external payment/checkout platform for outbound buttons (Lemon Squeezy, etc.).
- The newsletter ESP (or ship with a placeholder).
- Confirm momenthill.com moving to the `shiftedknowledge` Cloudflare account is
  acceptable (MH is a company asset; same knowing consolidation as noted for the
  platform — see design-spec section 7).
