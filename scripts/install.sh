#!/usr/bin/env bash
# cc-contextbar installer
#
#   install           copy statusline.sh to ~/.claude/ctxbar/, create pricing.env,
#                     and merge the statusLine entry into ~/.claude/settings.json
#   --uninstall       remove the statusLine entry and the ~/.claude/ctxbar/ dir
#
# Works both from a local clone (uses sibling files) and via curl one-liner
# (downloads from GitHub). Requires jq.
set -euo pipefail

CTXBAR_DIR="$HOME/.claude/ctxbar"
SETTINGS="$HOME/.claude/settings.json"
RAW_BASE="https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"

# --- uninstall ---
if [ "${1:-install}" = "--uninstall" ] || [ "${1:-}" = "uninstall" ]; then
  echo ">> Removing cc-contextbar..."
  if [ -f "$SETTINGS" ] && command -v jq >/dev/null 2>&1; then
    cp "$SETTINGS" "$SETTINGS.bak"
    tmp=$(mktemp)
    jq 'del(.statusLine)' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    echo "   removed statusLine from $SETTINGS (backup: $SETTINGS.bak)"
  fi
  rm -rf "$CTXBAR_DIR" && echo "   removed $CTXBAR_DIR"
  echo ">> Done. Restart Claude Code."
  exit 0
fi

echo ">> Installing cc-contextbar..."

# --- dependency: jq ---
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install with:  brew install jq   (or: apt install jq)" >&2
  exit 1
fi

mkdir -p "$CTXBAR_DIR"

# --- fetch a bundled file: prefer local sibling, else download from GitHub ---
fetch() { # $1=filename $2=dest
  if [ -f "$SCRIPT_DIR/$1" ]; then
    cp "$SCRIPT_DIR/$1" "$2"
  else
    echo "   downloading $1..."
    curl -fsSL "$RAW_BASE/$1" -o "$2" || { echo "ERROR: failed to fetch $1 from $RAW_BASE" >&2; exit 1; }
  fi
}

fetch statusline.sh "$CTXBAR_DIR/statusline.sh"
chmod +x "$CTXBAR_DIR/statusline.sh"

# --- pricing.env: create from template only if absent (preserve user edits) ---
if [ ! -f "$CTXBAR_DIR/pricing.env" ]; then
  fetch pricing.env.example "$CTXBAR_DIR/pricing.env"
  echo "   created $CTXBAR_DIR/pricing.env  (edit to set your rates)"
else
  echo "   kept existing $CTXBAR_DIR/pricing.env"
fi

# --- merge statusLine into settings.json (backup + atomic write) ---
TARGET="$CTXBAR_DIR/statusline.sh"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
cp "$SETTINGS" "$SETTINGS.bak"
tmp=$(mktemp)
jq --arg cmd "$TARGET" '.statusLine = {"type":"command","command":$cmd,"padding":0}' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
echo "   statusLine -> $TARGET  (backup: $SETTINGS.bak)"

cat <<EOF

>> Installed. Restart Claude Code to see the context bar.
>> Set your token rates:  $CTXBAR_DIR/pricing.env
>> Uninstall:             bash install.sh --uninstall

EOF
