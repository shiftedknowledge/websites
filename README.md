# websites

Shared infrastructure for a small family of independent websites. Each site has its
own bespoke design; they share the build and deploy plumbing, not visual code.
Content lives in a separate private repo per site, so it can be edited from anywhere
(including a phone) without touching this infrastructure.

- **How it works, and how to add a site:** [`AGENTS.md`](AGENTS.md)
- **The full design rationale:** [`docs/design-spec.md`](docs/design-spec.md)
- **Putting a site live on Cloudflare:** [`CLOUDFLARE_SETUP.md`](CLOUDFLARE_SETUP.md)
- **Which sites exist and their deploy settings:** [`sites.yml`](sites.yml)

This repo is public and holds no secrets. Site content lives in the content repos
(e.g. `shiftedknowledge/shifted-knowledge-content`), never here.
