#!/usr/bin/env sh
set -euo pipefail

if ! command -v flyctl >/dev/null 2>&1; then
  echo "flyctl not found in PATH." >&2
  exit 1
fi

if [ -z "${1:-}" ]; then
  echo "Usage: scripts/set-tg-session.sh <TG_SESSION>" >&2
  exit 1
fi

TG_SESSION="$1"
flyctl secrets set TG_SESSION="$TG_SESSION"
