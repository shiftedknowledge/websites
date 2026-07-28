# Cloudflare Pages — connecting a site

This is the one-time browser step that puts a site live and keeps it live. Only the
Cloudflare account owner can do it. Each **content repo** gets its own Pages project;
this repo (the infrastructure) is never connected to Cloudflare directly.

The example below is for Shifted Knowledge. Adding another site repeats it verbatim
with that site's names.

## Before you start

- Push both repos to GitHub (see the project setup). The infrastructure repo
  (`shiftedknowledge/websites`) must be **public** so the build can clone it without
  credentials.
- Decide whether this project should follow active development on `main` or be
  frozen to a specific infrastructure commit SHA. Get the current SHA with:

  ```bash
  git -C /Users/jochen/CODE/websites rev-parse HEAD
  ```

  Use `main` during active development, matching the current sites. Pin to a
  **specific commit SHA** when you want a reproducible frozen release that moves
  only when you deliberately bump it.

## 1. Create the project and connect the content repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorise Cloudflare's GitHub app against **`shiftedknowledge/shifted-knowledge-content`**
   (the private content repo). This authorisation is what lets Cloudflare read the
   private repo and receive a webhook on every push.
3. Select `shifted-knowledge-content`. Production branch: **`main`**.

## 2. Build settings

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | see below |
| Build output directory | `.infra/sites/shifted-knowledge/dist` |
| Production branch | `main` |

Build command (one line):

```bash
git init .infra && git -C .infra remote add origin "$INFRA_REPO" && git -C .infra fetch --depth 1 origin "$INFRA_REF" && git -C .infra checkout --detach FETCH_HEAD && .infra/scripts/build-site.sh "$SITE" "$PWD"
```

## 3. Environment variables

Set these under the project's **Settings → Environment variables** (Production):

| Variable | Value |
|----------|-------|
| `INFRA_REPO` | `https://github.com/shiftedknowledge/websites.git` |
| `INFRA_REF` | `main` while following active development, or a commit SHA when frozen |
| `SITE` | `shifted-knowledge` |
| `NODE_VERSION` | `22` |

Then **Save and Deploy**. The first build runs immediately; when it finishes you get
a `*.pages.dev` URL.

## 4. Point the site at its real address

Once the final domain is known (the `pages.dev` one, or a custom domain), set it in
`sites/shifted-knowledge/configs/user.config.ts` → `url` and in `sites.yml`, commit,
push the infrastructure repo, and trigger a new deployment. If the project is
frozen to a commit, bump `INFRA_REF` to the new SHA first (step 3). That `url`
drives canonical links, RSS, the sitemap, and share images, so it must match the
address people actually visit.

## Everyday deploys after this

There is nothing more to do here. A push to `shifted-knowledge-content`'s `main`
branch rebuilds and publishes automatically. A failed build changes nothing: the
last good deployment stays live.

## Rolling out an infrastructure change

Infrastructure changes do not deploy themselves because Cloudflare watches the
content repo. When `INFRA_REF` is `main`, push the infrastructure change, trigger a
new deployment and verify it. For a frozen project, set `INFRA_REF` to the new SHA
first. Roll back by freezing to the previous SHA and redeploying. See `AGENTS.md`
→ "Releasing an infrastructure change".
