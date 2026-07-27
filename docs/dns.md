# DNS

Both zones as they are today. Enumerated with `dig` against the live
nameservers on 2026-07-27, not copied off a dashboard.

**Both domains are registered at Hover and served by Cloudflare DNS.** Only DNS
moved; registration stays at Hover deliberately, so the domains can be taken
anywhere. Nameservers are `alex.ns.cloudflare.com` and
`donna.ns.cloudflare.com` for both. DNSSEC is off on both, and there are no `DS`
records at the registry.

**Mail is the part that matters.** The websites can go down and it is
survivable. Mail cannot. Every record below marked *mail* is load-bearing; check
twice before touching one, and verify by sending a real message afterwards
rather than by reading records back.

---

## momenthill.com

Mail on **Microsoft 365**. Web on the `moment-hill` Pages project.

### Mail — do not break

| Type | Host | Value | Proxy |
|---|---|---|---|
| MX | `@` | `0 momenthill-com.mail.protection.outlook.com` | n/a |
| TXT | `@` | `MS=ms50284058` | n/a |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` | n/a |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@momenthill.com` | n/a |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | **DNS only** |
| CNAME | `selector1._domainkey` | `selector1-momenthill-com._domainkey.momenthill.p-v1.dkim.mail.microsoft` | **DNS only** |
| CNAME | `selector2._domainkey` | `selector2-momenthill-com._domainkey.momenthill.p-v1.dkim.mail.microsoft` | **DNS only** |

`MS=` is Microsoft's domain-ownership proof. Dropping it can un-verify the
domain in the tenant.

**The three CNAMEs must stay grey-clouded.** Cloudflare's zone import proxied
all three, which looks correct in the dashboard and silently breaks Outlook
autodiscovery and DKIM signing. This was caught before cutover. If mail
misbehaves after any zone edit, check the proxy flags first.

SPF is `-all`, a hard fail. Adding any other sender — Buttondown's custom
sending domain, for instance — means editing that record deliberately, not
discovering the problem through bounces.

DMARC is in monitor mode, so it changes no delivery behaviour. Tighten to
`p=quarantine` once the reports show only legitimate senders.

### Web

`@` and `www` both resolve to Cloudflare (`104.21.89.241`, `172.67.192.26` and
the matching IPv6), served by the `moment-hill` Pages project through attached
custom domains and CNAME flattening at the apex.

### Still at Hover

The old Squarespace records are still in Hover's zone: four apex `A` records, a
`www` CNAME to `ext-cust.squarespace.com`, and a `verify.squarespace.com`
CNAME. They are inert while the nameservers point at Cloudflare.

Hover's copies of the six mail records are also still there, and that is on
purpose: pointing the nameservers back at Hover is the rollback, and it only
works if that zone is intact. Leave it until Squarespace is cancelled and the
migration has been quiet for a while.

---

## shiftedknowledge.com

Mail on **Fastmail**. Web on the `shifted-knowledge` Pages project.

### Mail

| Type | Host | Value |
|---|---|---|
| MX | `@` | `10 us1-smtp.messagingengine.com`, `20 us2-smtp.messagingengine.com` |
| TXT | `@` | `v=spf1 include:spf.messagingengine.com ?all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |
| CNAME | `fm1._domainkey` | `fm1.shiftedknowledge.com.dkim.fmhosted.com` |
| CNAME | `fm2._domainkey` | `fm2.shiftedknowledge.com.dkim.fmhosted.com` |
| CNAME | `fm3._domainkey` | `fm3.shiftedknowledge.com.dkim.fmhosted.com` |
| SRV | `_imaps._tcp` | `0 1 993 imap.fastmail.com` |
| SRV | `_submission._tcp` | `0 0 0 .` (deliberately null) |

SPF here is `?all` (neutral), not `-all`. Softer than Moment Hill and fine for
what this domain is.

DMARC has no `rua`, so no reports are collected. Worth adding if the domain ever
carries anything that matters.

### Web

`@` and `www` both resolve to Cloudflare (`104.21.37.76`, `172.67.205.227`).

**Only `www` is attached to the Pages project as a custom domain.** The apex
resolves through a proxied record in the zone rather than an attached domain, so
it has no certificate or redirect configuration of its own. It works. If the
apex ever needs its own settings, attach it properly rather than adding another
record.

---

## Working on a zone

There is **no Cloudflare API token on this machine** with DNS write access.
Wrangler's OAuth token covers Pages and `zone (read)` only, so DNS edits are
dashboard or browser work. That is a deliberate gap, not an oversight; minting a
scoped `Zone → DNS → Edit` token is Jochen's call.

Whatever the route, the same two rules apply:

**Verify against the authoritative nameserver, not a resolver.** Public
resolvers are anycast and will cheerfully return different answers from
different nodes for tens of minutes after a change. Two disagreeing `dig`s do
not mean a broken zone.

```bash
dig @alex.ns.cloudflare.com MX momenthill.com
dig @alex.ns.cloudflare.com CNAME selector1._domainkey.momenthill.com
```

**Print the values you are comparing.** A sweep that reports "no differences"
after rate-limiting has silenced every query is comparing empty to empty. It has
happened here. Make the script show what it matched, and include one record you
know should differ as a canary.

To check the website while DNS is still settling, bypass the resolver entirely:

```bash
curl -sI --resolve momenthill.com:443:104.21.89.241 https://momenthill.com
```

---

## The migration, in one paragraph

`momenthill.com` moved from Squarespace to Cloudflare on 2026-07-27 by
delegating the nameservers. The whole zone was built and verified at Cloudflare
*before* the delegation changed, by querying Cloudflare's nameservers directly
while Hover was still authoritative. Mail never broke. Cloudflare refuses to
attach a custom domain until the zone is active, so there is an unavoidable
window between the nameserver switch and the domain attachment where the website
does not resolve; mail is unaffected throughout. If another domain ever moves,
that is the sequence: build, verify against `@ns`, switch, attach, verify again,
then send a real email.
