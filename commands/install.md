---
description: Install the cc-contextbar statusline (copies the script and wires settings.json)
allowed-tools: Bash(bash:*), Bash(find:*), Bash(chmod:*), Bash(curl:*), Read, Write
---

Install the **cc-contextbar** statusline for the user. Do the following:

1. Locate the bundled installer that ships with this plugin under `~/.claude/plugins`:
   - Run: `find ~/.claude/plugins -type f -name install.sh -path '*cc-contextbar*'`
2. If found, run it: `bash <path>/install.sh`
   - It copies `statusline.sh` to `~/.claude/ctxbar/`, creates `pricing.env` from the template, and merges the `statusLine` entry into `~/.claude/settings.json` (with a `.bak` backup).
3. If the local installer cannot be found, fall back to the one-line install:
   - `curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash`
4. After install, tell the user to:
   - **Restart Claude Code** so the statusline appears.
   - **Edit `~/.claude/ctxbar/pricing.env`** with their provider's token rates (defaults to 0, so cost shows `--` until set).
5. Briefly summarize what changed (script path, settings.json backup location).
