---
name: cloudflare
description: Inspect and operate Cloudflare Pages, deployments, build settings, custom domains, DNS, TLS, and production rollout for shiftedknowledge.com and momenthill.com. Use for Wrangler, deployment failures, stale sites, domain changes, DNS or mail-record work, Pages drift, release or rollback. Query current provider state before relying on documented snapshots.
---

# Cloudflare

Read [`AGENTS.md`](../../../AGENTS.md),
[`HANDOVER.md`](../../../HANDOVER.md),
[`docs/platform.md`](../../../docs/platform.md) and, for any zone work,
[`docs/dns.md`](../../../docs/dns.md) before acting.

## Understand the release path

Each Pages project watches its site's private content repository. A content push
checks out that repository, clones this public infrastructure repository at
`INFRA_REF`, and runs `scripts/build-site.sh` from the infrastructure checkout.

Consequences:

- A content push is a production deployment.
- An infrastructure push does not deploy by itself. It reaches a site on the
  next content push or deliberate Pages retry.
- Push infrastructure before content when a change spans both repositories.
- A failed build leaves the last successful deployment live.

## Query current state

Do not repeat project, domain, deployment, environment or DNS snapshots from
memory. Read them immediately before making a decision.

Useful read-only commands:

```bash
npx wrangler pages project list --json
npx wrangler pages deployment list --project-name <project> --json
npx wrangler pages download config <project>
dig <record-type> <name>
curl -sSI https://<domain>
```

Run `pages download config` in a scratch directory because it writes a
`wrangler.toml`. Distinguish preview `[vars]` from production
`[env.production.vars]`.

Compare live state with `sites.yml`, but remember that `sites.yml` is descriptive
and nothing enforces it automatically.

## Release infrastructure

1. Inspect git status and remote divergence.
2. Run `scripts/build-site.sh <site> ../website-content/<site>` locally.
3. Inspect the affected generated output.
4. Commit and push the infrastructure change.
5. State that the next step is a production deployment.
6. Trigger the affected site's rebuild only after the user has been told. Use a
   content push only when there is a real content change; otherwise prefer the
   Pages retry control.
7. Watch the deployment and verify the public domain, headers and affected page.

Do not call an infrastructure change live merely because it is on `main`.

## Roll back

- For a content problem, revert the content commit and push after stating that it
  will deploy.
- For an infrastructure problem, point production `INFRA_REF` at the last known
  good infrastructure SHA and rebuild, then verify. Restore the intended release
  strategy only after the incident is understood.

## Protect DNS and mail

Both domains use Cloudflare DNS while registration remains elsewhere. Website
records are recoverable; mail records are load-bearing.

Before any DNS write:

1. Read the full record inventory in `docs/dns.md`.
2. Query the authoritative nameserver and print the values being compared.
3. Include a canary query that should differ so rate limiting or empty responses
   cannot look like agreement.
4. Preserve DNS-only mail discovery and DKIM records where documented.
5. State the exact records to be changed and the expected consequence.
6. Verify authoritative DNS, public resolution, HTTPS and mail-related records
   after the change.

## Confirm consequential actions

State and obtain direction immediately before:

- triggering a production deployment;
- attaching, detaching or changing a domain;
- writing DNS;
- deleting a project or deployment;
- changing production build settings or environment variables.

Read-only inspection needs no permission. Use it to replace assumptions with
evidence.
