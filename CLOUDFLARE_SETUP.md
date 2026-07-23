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
- Have the infrastructure commit SHA you want to build against. Get it with:

  ```bash
  git -C /Users/jochen/CODE/websites rev-parse HEAD
  ```

  Pin to a **specific commit SHA**, never `main`, so builds are reproducible and
  infrastructure changes reach the site only when you deliberately bump the pin.

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
| `INFRA_REF` | the infrastructure commit **SHA** to build against |
| `SITE` | `shifted-knowledge` |
| `NODE_VERSION` | `22` |

Then **Save and Deploy**. The first build runs immediately; when it finishes you get
a `*.pages.dev` URL.

## 4. Point the site at its real address

Once the final domain is known (the `pages.dev` one, or a custom domain), set it in
`sites/shifted-knowledge/configs/user.config.ts` → `url` and in `sites.yml`, commit,
push the infrastructure repo, and bump this project's `INFRA_REF` to the new SHA
(step 3). That `url` drives canonical links, RSS, the sitemap, and share images, so
it must match the address people actually visit.

## Everyday deploys after this

There is nothing more to do here. A push to `shifted-knowledge-content`'s `main`
branch rebuilds and publishes automatically. A failed build changes nothing: the
last good deployment stays live.

## Rolling out an infrastructure change

Infrastructure changes do not deploy themselves. To roll one out to a site: set that
project's `INFRA_REF` to the new SHA, trigger a deployment, verify it. To roll back,
restore the previous SHA and redeploy. See `AGENTS.md` → "Releasing an
infrastructure change".
