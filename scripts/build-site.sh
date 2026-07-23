#!/usr/bin/env bash
#
# build-site.sh — assemble one site from its content repo + this infrastructure,
# then build it. This is the script Cloudflare runs inside its throwaway build.
#
#   build-site.sh <site> <content-root>
#
#     <site>          folder name under sites/ (e.g. shifted-knowledge)
#     <content-root>  path to the checked-out content repo (Cloudflare: "$PWD")
#
# It writes ONLY into sites/<site>/src/content. It never touches app source.
# On any failure it exits non-zero and publishes nothing, so the last good
# deployment of the site stays live.
#
set -euo pipefail

SITE="${1:-}"
CONTENT_ROOT="${2:-}"

if [ -z "$SITE" ] || [ -z "$CONTENT_ROOT" ]; then
  echo "usage: build-site.sh <site> <content-root>" >&2
  exit 2
fi

# Resolve this script's location so the command works from any CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTENT_ROOT="$(cd "$CONTENT_ROOT" && pwd)"

# 1. Allowlist the site. Never trust an arbitrary name to index into the tree.
case "$SITE" in
  shifted-knowledge) ;;
  # moment-hill) ;;   # uncomment when the app exists
  *) echo "build-site: unknown site '$SITE'" >&2; exit 1 ;;
esac

APP="$INFRA_ROOT/sites/$SITE"
[ -d "$APP" ] || { echo "build-site: no app at $APP" >&2; exit 1; }

# 2. Enforce the content contract: the content repo must target the schema
#    version this app was built for.
EXPECTED="$(tr -d '[:space:]' < "$APP/CONTENT_SCHEMA")"
CONTRACT="$CONTENT_ROOT/content-contract.yml"
[ -f "$CONTRACT" ] || { echo "build-site: content repo has no content-contract.yml" >&2; exit 1; }
ACTUAL="$(awk -F: '/^schema:/ {gsub(/[[:space:]]/,"",$2); print $2}' "$CONTRACT")"

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "build-site: content schema $ACTUAL is incompatible with $SITE infrastructure schema $EXPECTED." >&2
  echo "            Migrate the content (or pin an infrastructure version expecting schema $ACTUAL) before deploying." >&2
  exit 1
fi

# 3. Assemble content. Only src/content is ever written; wipe it first so no
#    stale entry survives, then copy the two collections in.
DEST="$APP/src/content"
# If a developer ran dev-link.sh, src/content is a symlink into the content repo.
# Remove the LINK (not its target) before wiping, so we never rm -rf through it
# into the real content. Cloudflare's fresh checkout never has this link.
[ -L "$DEST" ] && rm -f "$DEST"
rm -rf "$DEST/posts" "$DEST/pages"
mkdir -p "$DEST"

for collection in posts pages; do
  if [ -d "$CONTENT_ROOT/content/$collection" ]; then
    # -L resolves symlinks to real files so nothing escapes the content dir.
    cp -RL "$CONTENT_ROOT/content/$collection" "$DEST/$collection"
  else
    mkdir -p "$DEST/$collection"
  fi
done

# 4. Build the app. `npm run build` (not bare astro build) so Pagefind runs.
cd "$APP"
npm ci
npm run build

# 5. Confirm output before declaring success.
if [ ! -d "$APP/dist" ] || [ -z "$(ls -A "$APP/dist" 2>/dev/null)" ]; then
  echo "build-site: build produced no dist/ output" >&2
  exit 1
fi

echo "build-site: $SITE built successfully -> sites/$SITE/dist"
