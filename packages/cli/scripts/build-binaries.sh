#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f dist/index.js ]]; then
  echo "dist/index.js not found. Run pnpm build first." >&2
  exit 1
fi

RAW_VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
RAW_VERSION="${RAW_VERSION#v}"
OUTPUT_VERSION="v${RAW_VERSION}"

TARGETS="${BUN_TARGETS:-${*:-}}"
if [[ -z "$TARGETS" ]]; then
  echo "No targets provided. Set BUN_TARGETS or pass targets as args." >&2
  exit 1
fi

OUTPUT_DIR="${OUTPUT_DIR:-"$ROOT_DIR/dist/bin"}"
mkdir -p "$OUTPUT_DIR"

for target in $TARGETS; do
  case "$target" in
    darwin-arm64) bun_target="bun-darwin-arm64" ;;
    darwin-x64) bun_target="bun-darwin-x64" ;;
    linux-arm64) bun_target="bun-linux-arm64" ;;
    linux-x64) bun_target="bun-linux-x64" ;;
    win-x64|windows-x64) bun_target="bun-windows-x64" ;;
    *)
      echo "Unknown target: $target" >&2
      exit 1
      ;;
  esac

  filename="moru-${OUTPUT_VERSION}-${target}"
  if [[ "$target" == "win-x64" || "$target" == "windows-x64" ]]; then
    filename="${filename}.exe"
  fi

  bun build --compile "$ROOT_DIR/dist/index.js" --target "$bun_target" --outfile "$OUTPUT_DIR/$filename"
done
