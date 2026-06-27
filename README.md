# cc-contextbar

A lightweight, battery-style **context-window statusline** for [Claude Code](https://code.claude.com).

```
🤖 glm-5.2[1m] · [█████░░░░░] 52% · $1.23
```

It shows, next to your chat input:

- 🤖 current model
- `[█████░░░░░]` a **battery-style bar** of context-window usage (green → yellow → red)
- the usage **%** and the running **cost** (from your own token pricing)

### Why

Claude Code's native statusline fields (`context_window.used_percentage`) report **0** for non-Anthropic models (GLM, and other proxy-backed models). cc-contextbar instead reads the **transcript** and computes real token usage — so the bar actually works no matter which model you run.

It's also **fast**: pure `bash` + `jq`, ~30 ms per render (vs. ~2 s for Node-based tools that pile up processes).

---

## Requirements

- [Claude Code](https://code.claude.com) (statusline support)
- [`jq`](https://stedolan.github.io/jq/) — `brew install jq` (macOS) or `apt install jq` (Linux)

## Install

### Option A — as a Claude Code plugin (recommended)

```bash
claude plugin marketplace add evggzzz/cc-contextbar
claude plugin install cc-contextbar@cc-contextbar
```

Then inside Claude Code run:

```
/cc-contextbar:install
```

### Option B — one-line install (no plugin)

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash
```

Both methods copy `statusline.sh` to `~/.claude/ctxbar/`, create a `pricing.env`, and wire the `statusLine` entry into `~/.claude/settings.json` (a `.bak` backup is written first).

**Restart Claude Code** after installing.

## Configure pricing

Edit `~/.claude/ctxbar/pricing.env` with your provider's rates (per 1,000,000 tokens):

```bash
PRICE_INPUT=1.00        # regular input + cache creation
PRICE_CACHE_READ=0.10   # cache read (cheaper)
PRICE_OUTPUT=4.00       # output
CUR='$'                 # currency symbol ($, ¥, €, …)
```

Until you set these, the cost shows `--` (rates default to 0).

## Uninstall

```bash
bash ~/.claude/ctxbar/../cc-contextbar/scripts/install.sh --uninstall
# or, if you used curl/plugin:
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash -s -- --uninstall
```

This removes the `statusLine` entry from `settings.json` (with backup) and deletes `~/.claude/ctxbar/`.

## How it works

- The statusline command receives Claude Code's JSON on stdin. From it, cc-contextbar takes `model.display_name` and `context_window.context_window_size`.
- **Context %** = (last assistant message's `input + cache_creation + cache_read` tokens) ÷ context window size. Reading the transcript is what makes it work for non-Anthropic models.
- **Cost** = Σ over the session of those token buckets × your configured rates.
- Color thresholds: `<50%` green, `<80%` yellow, `≥80%` red.

## License

MIT © [evggzzz](https://github.com/evggzzz)
