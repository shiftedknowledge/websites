#!/usr/bin/env bash
#
# dev-link.sh — wire a local content repo into a site app for local development,
# so `npm run dev` / preview.sh in the app render real content.
#
#   dev-link.sh <site> <content-repo-path>
#
#     <site>               folder name under sites/ (e.g. shifted-knowledge)
#     <content-repo-path>  path to a local checkout of that site's content repo
#
# It symlinks sites/<site>/src/content -> <content-repo>/content. That path is
# gitignored, so the link is never committed. On Cloudflare the equivalent step
# is a real copy done by build-site.sh; this is the live-editing convenience for
# a developer on their own machine.
#
set -euo pipefail

SITE="${1:-}"
CONTENT_REPO="${2:-}"

if [ -z "$SITE" ] || [ -z "$CONTENT_REPO" ]; then
  echo "usage: dev-link.sh <site> <content-repo-path>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP="$INFRA_ROOT/sites/$SITE"
[ -d "$APP" ] || { echo "dev-link: no app at $APP" >&2; exit 1; }

CONTENT_DIR="$(cd "$CONTENT_REPO" && pwd)/content"
[ -d "$CONTENT_DIR" ] || { echo "dev-link: no content/ dir at $CONTENT_DIR" >&2; exit 1; }

TARGET="$APP/src/content"
# Replace whatever is there (a stale copy from a build, or an old link).
rm -rf "$TARGET"
ln -s "$CONTENT_DIR" "$TARGET"

echo "dev-link: $APP/src/content -> $CONTENT_DIR"
echo "Now: cd sites/$SITE && npm install && ./preview.sh"
