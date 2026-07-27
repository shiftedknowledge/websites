---
name: cloudflare
description: Operate the Cloudflare side of the websites platform — Pages projects, deployments, build settings, custom domains, and DNS for shiftedknowledge.com and momenthill.com. Use when the user mentions Cloudflare, wrangler, a deploy, a build failure, a domain, DNS, or "why is the site not updating".
---

# Cloudflare

Account `44dc43bb4dbf488aa6034ef4fd9f3714`, free plan. Two live sites, three
Pages projects, two zones. Full current state in [`docs/platform.md`](../../../docs/platform.md)
and [`docs/dns.md`](../../../docs/dns.md).

## The one thing to understand first

**Each Pages project is connected to the site's _content_ repo, not to this
infra repo.** Cloudflare watches content. On a push it clones this repo at
`INFRA_REF` into `.infra/` and runs `.infra/scripts/build-site.sh`.

The consequence catches people out every time: **an infra-only change does not
deploy itself.** Push it, then nudge the site. See "Shipping an infra change".

## What wrangler can and cannot do

Wrangler is authenticated by an **OAuth token**, not an API token. It refreshes
on interactive use, which is fine for a session and useless for anything
unattended.

| Can | Cannot |
|---|---|
| list projects and deployments | change build settings or env vars |
| download a project's build config | trigger a rebuild of a git-connected project |
| tail live build and function logs | manage DNS |
| direct-upload deploys | attach a custom domain |
| create and delete projects | anything needing `dns_records:write` |

Everything in the right-hand column needs either the dashboard or a scoped API
token. **There is no `CLOUDFLARE_API_TOKEN` in `~/.env`.** Minting one
(`Pages:Edit`, `Zone:Read`, `DNS:Edit`, `Account:Read`) is Jochen's call, not
something to do unprompted. Until then, DNS is browser work.

## Commands that work

```bash
npx wrangler pages project list                              # projects + attached domains
npx wrangler pages project list --json                       # same, parseable
npx wrangler pages deployment list --project-name moment-hill
npx wrangler pages download config moment-hill               # writes wrangler.toml — env vars + output dir
npx wrangler pages deployment tail --project-name moment-hill
```

`pages download config` is the drift-detection tool. Run it in a scratch
directory, never in a repo — it drops a `wrangler.toml` where you stand and
neither site uses one.

Note what it returns: the `[vars]` block is the **preview** environment and
`[env.production.vars]` is production. They can differ, and they do.

## The three projects

| Project | Git | Domains |
|---|---|---|
| `shifted-knowledge` | yes | `shifted-knowledge.pages.dev`, `www.shiftedknowledge.com` |
| `moment-hill` | yes | `moment-hill.pages.dev`, `momenthill.com`, `www.momenthill.com` |
| `moment-hill-preview` | no | `moment-hill-preview.pages.dev` |

`moment-hill-preview` is dead — a direct-upload project from before Moment Hill
was git-connected. Nothing links to it. Deleting it is safe and still pending.

Build settings, both git projects:

```
build command    git init .infra \
                   && git -C .infra remote add origin "$INFRA_REPO" \
                   && git -C .infra fetch --depth 1 origin "$INFRA_REF" \
                   && git -C .infra checkout --detach FETCH_HEAD \
                   && .infra/scripts/build-site.sh "$SITE" "$PWD"
output dir       .infra/sites/<SITE>/dist
env vars         INFRA_REPO, INFRA_REF, SITE, NODE_VERSION=22
production branch main
```

**Known drift:** `shifted-knowledge`'s *preview* `INFRA_REF` is pinned to
`74d8fb08d7c59b4297e50727d56429484c182ebd` (the first platform commit) while
production tracks `main`. Production is unaffected. Preview branch builds would
use ancient infra. Left as-is because no preview branches are in use; fix it if
that changes.

## Shipping an infra change

1. Verify locally first: `scripts/build-site.sh <site> ../website-content/<site>`.
   That is the same script Cloudflare runs. If it fails here it fails there.
2. Push this repo to `main`.
3. Nudge the site. There is no wrangler command for this. Either:
   - push a trivial commit to the content repo (it auto-deploys), or
   - "Retry deployment" on the latest build in the dashboard.
4. `npx wrangler pages deployment list --project-name <p>` to watch it land.

**Order matters: infra first, then content.** Pushing content first starts a
build against stale infra, which ships a half-change and then needs a second
round trip. This has happened.

A failed build publishes nothing; the last good deployment stays live.

## Rolling back

Two levers, in order of preference:

- **Content problem:** revert the commit in the content repo and push.
- **Infra problem:** set that site's `INFRA_REF` to the last good SHA in the
  dashboard, then trigger a rebuild. `main` is the current setting on both, so
  this is also how you freeze a site while working on something else.

## DNS

Both zones live at Cloudflare; both domains stay registered at Hover. Record by
record in [`docs/dns.md`](../../../docs/dns.md). Three rules before touching one:

- **Mail is the only thing that must not break.** The websites can go down.
  `momenthill.com` receives on Microsoft 365, `shiftedknowledge.com` on
  Fastmail. Read the mail table before any zone edit.
- **`autodiscover` and both `_domainkey` CNAMEs on momenthill.com must stay
  "DNS only".** Cloudflare's import proxied all three, which looks correct in
  the dashboard and silently breaks autodiscovery and DKIM signing.
- **Verify against the authoritative nameserver, not a resolver.** Public
  resolvers are anycast; two `dig`s can legitimately disagree for tens of
  minutes after a change.

```bash
dig @alex.ns.cloudflare.com MX momenthill.com
curl -sI --resolve momenthill.com:443:104.21.89.241 https://momenthill.com
```

If you write a comparison script, **print the values you matched** and include a
record you know should differ, as a canary. A sweep that reports "no
differences" after rate-limiting has silenced every query is comparing empty to
empty. That has happened here, on a zone carrying live business email, and it is
exactly the false pass a migration cannot afford.

## Attaching a domain

Cloudflare **refuses to attach a custom domain until the zone is active** — that
is, until the nameservers actually point at Cloudflare. The domain cannot be
pre-staged, so the order is forced: switch nameservers, wait for active, attach.
There is an unavoidable window in the middle where the website does not resolve.
Mail is unaffected if the mail records were already built and verified.

## Confirm before

- triggering a production deploy
- attaching, detaching or changing a domain
- any DNS write
- deleting a project or a deployment

Reading anything — projects, deployments, configs, logs, `dig`, `curl` — needs
no permission. Do it freely rather than asking what the state is.
