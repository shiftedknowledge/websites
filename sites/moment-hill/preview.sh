#!/usr/bin/env bash
# Local preview in Safari. Nothing here is ever published.
#
#   ./preview.sh          live editing — reloads as you save, shows drafts
#   ./preview.sh final    the exact production site — what would actually go live
#
# Press Ctrl+C in this terminal to stop the preview.
set -euo pipefail
cd "$(dirname "$0")"

URL="http://localhost:4321"
mode="${1:-live}"

case "$mode" in
  live)
    echo "Starting live preview (reloads as you edit, drafts visible)…"
    npm run dev -- --host >/tmp/mh-preview.log 2>&1 &
    SRV=$!
    ;;
  final)
    echo "Building the exact production site (this takes a few seconds)…"
    npm run build
    echo "Starting production preview (drafts hidden, images optimised)…"
    npm run preview -- --host >/tmp/mh-preview.log 2>&1 &
    SRV=$!
    ;;
  *)
    echo "Usage: ./preview.sh [live|final]"
    exit 1
    ;;
esac

# Stop the server whenever this script exits (including Ctrl+C).
trap 'kill $SRV 2>/dev/null || true' EXIT INT TERM

printf "Waiting for the server to come up"
for _ in $(seq 1 60); do
  curl -s -o /dev/null "$URL" && break
  printf "."
  sleep 0.5
done
echo

# Open in Safari (set PREVIEW_NO_OPEN=1 to skip, e.g. for automated checks).
if [ "${PREVIEW_NO_OPEN:-}" != "1" ]; then
  open -a Safari "$URL"
fi

# Wi-Fi address, so you can open the same preview on a phone on the same network.
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)

echo
echo "▶  On this Mac:    $URL"
if [ -n "$LAN_IP" ]; then
  echo "▶  On your phone:  http://$LAN_IP:4321   (same Wi-Fi)"
else
  echo "   (no Wi-Fi address found — phone access needs both devices on one network)"
fi
echo
echo "   Local only, nothing is published. The page reloads as you edit."
echo "   Press Ctrl+C here when you are done."
wait "$SRV"
