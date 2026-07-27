# Moving momenthill.com to Cloudflare

Getting the site off Squarespace and onto the Cloudflare Pages project, without
breaking Microsoft 365 mail.

The same shape as shifted-knowledge: delegate the nameservers to Cloudflare and
manage everything there. Registration stays at Hover; only DNS moves.

**The whole risk is mail.** `momenthill.com` receives on Microsoft 365, and the
records that make that work live in the zone we are replacing. Get those wrong
and mail stops the moment delegation propagates. Everything below is arranged
around making that impossible rather than unlikely.

---

## Status

**Phases 0 to 2 are done (2026-07-27). Nothing is live yet.** The zone exists at
Cloudflare and answers correctly, but `momenthill.com` is still delegated to
Hover and still served by Squarespace. Nothing has been deleted at Hover.

- Zone `momenthill.com` created on the Free plan.
- All six mail records imported by Cloudflare's scan and verified byte for byte
  against `dig`. No manual transcription was involved.
- `autodiscover`, `selector1._domainkey`, `selector2._domainkey` switched from
  Proxied to **DNS only**. Cloudflare's import had proxied all three, which
  would have broken Outlook autodiscovery and DKIM signing.
- Squarespace records removed from the Cloudflare zone: four apex `A` records
  and the `www` CNAME.
- **Assigned nameservers: `alex.ns.cloudflare.com`, `donna.ns.cloudflare.com`.**
- Phase 2 verification passed: all five mail queries answer identically from
  `alex.ns.cloudflare.com` and `ns1.hover.com`.

- **DMARC added** and verified live on Cloudflare's nameservers:
  `v=DMARC1; p=none; rua=mailto:hello@momenthill.com`. Monitor mode, so it
  changes no delivery behaviour; it just starts the reports.
- **DNSSEC is off** and always has been. Checked for `DS` records at the `.com`
  registry and there are none, so there is nothing to disable before the move.
  Same as shiftedknowledge.com.

Remaining: create the git-connected Pages project, attach the custom domain,
then the nameserver switch at Hover.

**Blocked:** the Cloudflare Pages GitHub App can only see
`shifted-knowledge-content`. Before a git-connected project can be created for
Moment Hill, its repository access must be extended to
`shiftedknowledge/moment-hill-content` (GitHub → Settings → Applications →
Cloudflare Pages → Configure).

## The zone as it stands

Enumerated by `dig` on 2026-07-27, not read off a screenshot. Nameservers are
`ns1.hover.com` / `ns2.hover.com`.

### Mail — must survive, exactly

| Type | Host | Value |
|---|---|---|
| MX | `@` | `0 momenthill-com.mail.protection.outlook.com` |
| TXT | `@` | `MS=ms50284058` |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` |
| CNAME | `autodiscover` | `autodiscover.outlook.com` |
| CNAME | `selector1._domainkey` | `selector1-momenthill-com._domainkey.momenthill.p-v1.dkim.mail.microsoft` |
| CNAME | `selector2._domainkey` | `selector2-momenthill-com._domainkey.momenthill.p-v1.dkim.mail.microsoft` |

`MS=` is Microsoft's domain-ownership proof. Dropping it can un-verify the
domain in the tenant. Keep it.

### Squarespace — to be dropped

| Type | Host | Value |
|---|---|---|
| A | `@` | `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145` |
| CNAME | `www` | `ext-cust.squarespace.com` |
| CNAME | `l6fnl6xgn5cjtm5aw…` | `verify.squarespace.com` |

### Absent

No `_dmarc`. No Teams/Skype SRV records, no `enterpriseregistration` or
`enterpriseenrollment`. So there is nothing else hiding in the zone: six mail
records is the complete list to carry across.

---

## Why nameserver delegation

The alternative is leaving DNS at Hover and pointing records at Cloudflare
Pages. That fails at the apex: `momenthill.com` needs to resolve to Pages, and a
CNAME is not legal at a zone apex. Cloudflare solves this with CNAME flattening,
which only works if Cloudflare runs the zone.

It also matches shifted-knowledge, so one platform, one place to look.

---

## The step that makes this safe

**Build the entire zone in Cloudflare and query Cloudflare's nameservers
directly, before touching the delegation.**

While Hover is still authoritative, Cloudflare will happily answer for the zone
if you ask it directly:

```bash
dig @<assigned-ns>.ns.cloudflare.com MX momenthill.com
dig @<assigned-ns>.ns.cloudflare.com TXT momenthill.com
dig @<assigned-ns>.ns.cloudflare.com CNAME selector1._domainkey.momenthill.com
```

If those return the right answers, the cutover is a formality. If they do not,
you have found out while mail is still flowing through Hover. This is the
difference between a migration and a gamble, and it costs five minutes.

---

## Sequence

### Phase 0 — prep, no risk

1. At Hover, drop the TTL on the mail records from 1 hour to the minimum
   offered. Wait out the old hour. This is purely so a rollback is fast.
2. Keep the table above to hand. Do not delete anything at Hover yet.

### Phase 1 — build the zone at Cloudflare, still no risk

3. Add `momenthill.com` as a site. Cloudflare scans the existing zone and
   imports what it finds. **Treat the scan as a draft, not an answer** — check
   every record against the table above.
4. Create or correct all six mail records. Set proxy status to **DNS only (grey
   cloud)** for `autodiscover` and both `_domainkey` CNAMEs. Proxying those
   breaks Outlook autodiscovery and DKIM validation respectively.
5. Do **not** create the Squarespace A records or the `www` CNAME.
6. Note the two nameservers Cloudflare assigns.

### Phase 2 — verify before cutover

7. Run the `dig @` checks above against Cloudflare's nameservers. Compare byte
   for byte with the table. The DKIM values are long and are the most likely
   thing to be mistyped.

### Phase 3 — cutover

8. At Hover, replace the nameservers with the two Cloudflare ones. Propagation
   is usually minutes, occasionally hours.
9. In the Pages project, add `momenthill.com` and `www.momenthill.com` as custom
   domains. Cloudflare issues the certificate.

### Phase 4 — verify after

10. Re-run the `dig` sweep with no `@` — this time against the world.
11. **Send a real email in and out of the M365 mailbox.** Resolving records are
    not proof of delivery.
12. Check Microsoft 365 admin centre → Settings → Domains: `momenthill.com`
    should still read healthy.
13. Repoint the Buttondown redirects from `moment-hill-preview.pages.dev` to
    `momenthill.com/subscribed` (see [`newsletter.md`](newsletter.md)).
14. Update `sites.yml`: domain attached, project still direct-upload unless it
    is also switched to git integration.
15. Only now cancel Squarespace.

### Rollback

Point the nameservers back to `ns1.hover.com` / `ns2.hover.com`. The Hover zone
is untouched throughout, which is why nothing is deleted there until Phase 4 has
passed. Recovery time is one TTL, which is why Phase 0 lowers it.

---

## Two things worth fixing while in there

**Add DMARC.** The domain has none, so nobody is told what to do with mail that
fails SPF or DKIM, and you get no visibility of anyone spoofing you. Start in
monitor mode, which changes no delivery behaviour:

```
_dmarc  TXT  v=DMARC1; p=none; rua=mailto:dmarc@momenthill.com
```

Tighten to `p=quarantine` later once the reports show only legitimate senders.

**The newsletter's sending domain.** Buttondown currently reports
`sending_domain_status: none`, so newsletters go out on Buttondown's shared
domain rather than momenthill.com. Sending from your own domain needs DNS
records Buttondown provides, which is straightforward once the zone is at
Cloudflare. Note that SPF is currently `-all`, a hard fail, so adding another
sender means updating that record deliberately rather than discovering it
through bounced mail.

---

## What can be scripted

Cloudflare's OAuth token on this machine has `zone (read)` and `pages (write)`
but **not** `dns_records (write)`, so the zone build cannot be automated as
things stand.

If you create a scoped API token with `Zone → DNS → Edit` for this zone and put
it in `~/.env`, Phase 1 becomes a single scripted pass that writes all six mail
records from the table above. That is worth doing for one reason: the two DKIM
values are 70-odd characters of near-identical text, and typing them into a form
twice is the most likely way this migration goes wrong.

Changing the nameservers at Hover is a registrar action and stays manual.
