#!/usr/bin/env bash
# cc-contextbar — lightweight battery-style context-window statusline for Claude Code
#
# Native bash+jq only (~30ms, no Node). Why this exists:
#   Non-Anthropic models (GLM, etc.) leave context_window.used_percentage at 0,
#   so the context % is computed from the transcript (JSONL) instead.
#   Cost is computed from cumulative tokens × pricing.
#
# Pricing priority:
#   1. ~/.claude/ctxbar/pricing.env  (manual — always wins if the file exists)
#   2. auto-detect by model name     (estimates, see PRESET below — edit pricing.env to override)
#   3. unknown model → rates 0 → cost shows "$--"
set -o pipefail

# ------------------------------------------------------------------
# Auto-pricing preset (USD per 1,000,000 tokens). ESTIMATES, as of 2026-06.
# Sources: official pricing pages / OpenRouter. Cache-read rates for GLM and
# Kimi are estimates (not published separately). Verify and override via pricing.env.
# ------------------------------------------------------------------
auto_price() {  # $1 = model name (matched case-insensitively as a substring)
  local m; m=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  case "$m" in
    *glm*)               PRICE_INPUT=0.60;  PRICE_CACHE_READ=0.06;   PRICE_OUTPUT=2.20 ;;
    *deepseek*)          PRICE_INPUT=0.27;  PRICE_CACHE_READ=0.014;  PRICE_OUTPUT=1.10 ;;
    *qwen*)              PRICE_INPUT=0.35;  PRICE_CACHE_READ=0.035;  PRICE_OUTPUT=1.39 ;;
    *kimi*|*moonshot*)   PRICE_INPUT=0.60;  PRICE_CACHE_READ=0.06;   PRICE_OUTPUT=3.00 ;;
    *opus*)              PRICE_INPUT=5.00;  PRICE_CACHE_READ=0.50;   PRICE_OUTPUT=25.00 ;;
    *sonnet*)            PRICE_INPUT=3.00;  PRICE_CACHE_READ=0.30;   PRICE_OUTPUT=15.00 ;;
    *claude*)            PRICE_INPUT=3.00;  PRICE_CACHE_READ=0.30;   PRICE_OUTPUT=15.00 ;;
    *gpt-4o*|*gpt4o*)    PRICE_INPUT=2.50;  PRICE_CACHE_READ=1.25;   PRICE_OUTPUT=10.00 ;;
    *gpt*)               PRICE_INPUT=2.50;  PRICE_CACHE_READ=0.25;   PRICE_OUTPUT=15.00 ;;
    *)                   PRICE_INPUT=0;     PRICE_CACHE_READ=0;      PRICE_OUTPUT=0 ;;
  esac
}

num() { case "${1:-}" in *[!0-9.]* | '') echo 0 ;; *) echo "$1" ;; esac; }

input=$(cat)

# --- extract model + context window size + transcript path from stdin ---
IFS=$'\t' read -r model ctx_size transcript < <(
  printf '%s' "$input" | jq -r '[
    (.model.display_name // "claude"),
    (.context_window.context_window_size // 200000),
    (.transcript_path // "")
  ] | @tsv'
)

# --- pricing: manual (pricing.env) > auto-detect ---
CONF_DIR="$HOME/.claude/ctxbar"
if [ -f "$CONF_DIR/pricing.env" ]; then
  # shellcheck source=/dev/null
  . "$CONF_DIR/pricing.env"          # manual: respect whatever it says
else
  auto_price "$model"                # auto: best-effort estimate
fi
PRICE_INPUT=$(num "${PRICE_INPUT:-0}")
PRICE_CACHE_READ=$(num "${PRICE_CACHE_READ:-0}")
PRICE_OUTPUT=$(num "${PRICE_OUTPUT:-0}")
: "${CUR:=\$}"

# --- customization knobs (also settable in pricing.env) ---
: "${CTXBAR_SEGMENTS:=10}"; CTXBAR_SEGMENTS=$(num "$CTXBAR_SEGMENTS"); [ "${CTXBAR_SEGMENTS:-10}" -lt 1 ] 2>/dev/null && CTXBAR_SEGMENTS=10
: "${CTXBAR_FILL:=█}"
: "${CTXBAR_EMPTY:=░}"

# "configured" = at least one non-zero rate (controls cost display)
configured=0
for v in "$PRICE_INPUT" "$PRICE_CACHE_READ" "$PRICE_OUTPUT"; do
  [ "$v" != "0" ] && configured=1
done

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

# --- N-segment battery-style bar ---
n=${CTXBAR_SEGMENTS:-10}
filled=$(( pct * n / 100 ))
[ "$filled" -gt "$n" ] && filled=$n
empty=$(( n - filled ))

# color: <50% green / <80% yellow / >=80% red
if   [ "$pct" -lt 50 ]; then c=$'\033[32m'
elif [ "$pct" -lt 80 ]; then c=$'\033[33m'
else                          c=$'\033[31m'; fi

# build bar (loop supports multi-char fill/empty symbols)
filled_part=""; i=0; while [ "$i" -lt "$filled" ]; do filled_part="${filled_part}${CTXBAR_FILL}"; i=$((i+1)); done
empty_part="";  i=0; while [ "$i" -lt "$empty"  ]; do empty_part="${empty_part}${CTXBAR_EMPTY}"; i=$((i+1)); done

# cost display: "--" when unconfigured
if [ "$configured" -eq 1 ]; then
  cost_str="$CUR$(printf '%.2f' "$cost" 2>/dev/null || echo "0.00")"
else
  cost_str="$CUR--"
fi

printf '🤖 %s · %b[%s\033[90m%s\033[0m] %s%% · %s' \
  "$model" "$c" "$filled_part" "$empty_part" "$pct" "$cost_str"
