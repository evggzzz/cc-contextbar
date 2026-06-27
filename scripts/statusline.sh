#!/usr/bin/env bash
# cc-contextbar — lightweight battery-style context-window statusline for Claude Code
#
# Native bash+jq only (~30ms, no Node). Why this exists:
#   Non-Anthropic models (GLM, etc.) leave context_window.used_percentage at 0,
#   so the context % is computed from the transcript (JSONL) instead.
#   Cost is computed from cumulative tokens × user-configured pricing.
set -o pipefail

# ------------------------------------------------------------------
# Pricing: source user config if present, otherwise neutral defaults.
# Edit ~/.claude/ctxbar/pricing.env to set your provider's rates.
# ------------------------------------------------------------------
CONF_DIR="$HOME/.claude/ctxbar"
[ -f "$CONF_DIR/pricing.env" ] && . "$CONF_DIR/pricing.env"

num() { case "${1:-}" in *[!0-9.]* | '') echo 0 ;; *) echo "$1" ;; esac; }
PRICE_INPUT=$(num "${PRICE_INPUT:-0}")
PRICE_CACHE_READ=$(num "${PRICE_CACHE_READ:-0}")
PRICE_OUTPUT=$(num "${PRICE_OUTPUT:-0}")
: "${CUR:=\$}"

# "configured" = at least one non-zero rate (controls cost display)
configured=0
for v in "$PRICE_INPUT" "$PRICE_CACHE_READ" "$PRICE_OUTPUT"; do
  [ "$v" != "0" ] && configured=1
done

input=$(cat)

# --- extract model + context window size from stdin (one jq call) ---
IFS=$'\t' read -r model ctx_size transcript < <(
  printf '%s' "$input" | jq -r '[
    (.model.display_name // "claude"),
    (.context_window.context_window_size // 200000),
    (.transcript_path // "")
  ] | @tsv'
)

# --- cumulative cost ($) and latest context tokens from transcript ---
cost=0
lastctx=0
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  IFS=$'\t' read -r cost lastctx < <(
    jq -r -s \
      --argjson pin "$PRICE_INPUT" \
      --argjson pcr "$PRICE_CACHE_READ" \
      --argjson pout "$PRICE_OUTPUT" '
      [ .[] | select(.message.role=="assistant" and .message.usage) | .message.usage ] as $u
      | ($u | last) as $last
      | [
          ( ( ([$u[].input_tokens // 0]|add // 0)
              + ([$u[].cache_creation_input_tokens // 0]|add // 0) ) / 1e6 * $pin )
          + ( ([$u[].cache_read_input_tokens // 0]|add // 0) / 1e6 * $pcr )
          + ( ([$u[].output_tokens // 0]|add // 0) / 1e6 * $pout ),
          ( ($last.input_tokens // 0) + ($last.cache_creation_input_tokens // 0)
            + ($last.cache_read_input_tokens // 0) )
        ] | @tsv
      ' "$transcript" 2>/dev/null
  )
fi
cost=${cost:-0}
lastctx=${lastctx:-0}

# --- usage percentage ---
den=${ctx_size:-200000}
[ "$den" -lt 1 ] 2>/dev/null && den=200000
pct=$(( lastctx * 100 / den ))
[ "$pct" -gt 100 ] && pct=100

# --- 10-segment battery-style bar ---
filled=$(( pct / 10 ))
[ "$filled" -gt 10 ] && filled=10
empty=$(( 10 - filled ))

# color: <50% green / <80% yellow / >=80% red
if   [ "$pct" -lt 50 ]; then c=$'\033[32m'
elif [ "$pct" -lt 80 ]; then c=$'\033[33m'
else                          c=$'\033[31m'; fi

# guard: macOS `seq 1 0` returns "1 0"
filled_part=""
[ "$filled" -gt 0 ] && filled_part=$(printf '█%.0s' $(seq 1 "$filled"))
empty_part=""
[ "$empty" -gt 0 ] && empty_part=$(printf '░%.0s' $(seq 1 "$empty"))

# cost display: "--" when unconfigured
if [ "$configured" -eq 1 ]; then
  cost_str="$CUR$(printf '%.2f' "$cost" 2>/dev/null || echo "0.00")"
else
  cost_str="$CUR--"
fi

printf '🤖 %s · %b[%s\033[90m%s\033[0m] %s%% · %s' \
  "$model" "$c" "$filled_part" "$empty_part" "$pct" "$cost_str"
