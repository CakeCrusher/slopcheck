#!/bin/bash
# Packs the MCP server as an MCP bundle (.mcpb): one file a desktop client installs with a click, and the package type the official
# MCP registry accepts from a GitHub release (no npm account needed). Output: dist/slopcheck.mcpb and its SHA-256.
# Usage: bash build_bundle.sh        (needs npx; the packer is @anthropic-ai/mcpb)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="$HERE/dist/work"; OUT="$HERE/dist/slopcheck.mcpb"
V=$(node -p "require('$HERE/package.json').version")
MV=$(node -p "require('$HERE/bundle/manifest.json').version")
[ "$V" = "$MV" ] || { echo "version mismatch: package.json $V, bundle/manifest.json $MV"; exit 1; }
grep -q "const VERSION = \"$V\";" "$HERE/index.js" || { echo "index.js does not say version $V"; exit 1; }
rm -rf "$WORK"; mkdir -p "$WORK"
cp "$HERE/bundle/manifest.json" "$HERE/index.js" "$WORK/"
printf '{\n  "name": "slopcheck-mcp",\n  "version": "%s",\n  "type": "module",\n  "license": "MIT"\n}\n' "$V" > "$WORK/package.json"
for L in "$HERE/../LICENSE" "$HERE/../public/LICENSE"; do [ -f "$L" ] && { cp "$L" "$WORK/LICENSE"; break; }; done
(cd "$WORK" && npx -y @anthropic-ai/mcpb validate manifest.json && npx -y @anthropic-ai/mcpb pack . "$OUT")
rm -rf "$WORK"
echo "bundle: $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes), version $V"
echo "sha256: $(shasum -a 256 "$OUT" | cut -d' ' -f1)"
