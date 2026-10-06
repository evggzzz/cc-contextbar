<p align="center">
  <img src="assets/banner.svg" alt="cc-contextbar" width="760">
</p>

<p align="center">
  <a href="https://github.com/evggzzz/cc-contextbar/releases"><img src="https://img.shields.io/badge/version-1.2.0-3fb950?style=flat-square"></a>
  <a href="https://github.com/evggzzz/cc-contextbar/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/evggzzz/cc-contextbar/ci.yml?style=flat-square&label=CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey?style=flat-square">
  <img src="https://img.shields.io/badge/Claude%20Code-statusline-6f42c1?style=flat-square">
  <img src="https://img.shields.io/badge/built%20with-bash%20%2B%20jq-1f1f1f?style=flat-square">
  <img src="https://img.shields.io/github/stars/evggzzz/cc-contextbar?style=flat-square&color=yellow">
</p>

<p align="center">
  <a href="https://code.claude.com">Claude Code</a> のステータスラインに、コンテキストの使用量を <strong>バッテリー風のバー</strong> で表示します。<br>
  軽量・高速で、<strong>GLM などの非 Anthropic モデルにも対応</strong>しています。
</p>

<p align="center">
  <sub><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a></sub>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="cc-contextbar デモ（アニメーション）" width="640">
</p>

---

## ✨ できること

| | |
|---|---|
| 🎛️ **バンド（mod）表示** | 1.1.0 から：**プロンプト上部のライブバンド** として表示。ターミナルとデスクトップの Code タブの両方に対応し、`statusLine` の設定も不要です。1.2.0 から quota 行は **サーフェスで切り替え**: ターミナルでは z.ai quota、デスクトップでは Claude プランのレートリミットを表示します。 |
| 🔋 **バッテリー風バー** | `[██████░░░░]` のように、会話が進むにつれて埋まっていき、緑 → 黄 → 赤に切り替わります。 |
| 🧠 **非 Anthropic モデル対応** | GLM などプロキシ越しのモデルだと `used_percentage` がずっと 0 になってしまいます。cc-contextbar はトランスクリプトを直接読んで、**本当の使用量** を計算します。 |
| ⚡ **高速** | `bash` + `jq` だけで動き、1 回の更新あたり約 30 ms。Node を使わないのでプロセスも溜まりません。 |
| 💸 **コスト表示** | 累計トークン × 単価で計算します。モデル名から **料金を自動で判定**（GLM / DeepSeek / Qwen / Kimi / Claude / GPT）し、ファイル 1 つで上書きもできます。 |
| 🛠️ **設定不要** | 入れるだけで動きます。自動 pricing のために何か設定する必要はありません。 |
| 🧩 **簡単導入** | Claude Code プラグインとしても、1 行スクリプトからでも導入できます。 |

## 🚀 インストール

**A. バンド（mod）として導入 — 推奨**

```bash
claude plugin marketplace add evggzzz/cc-contextbar
claude plugin install cc-contextbar@cc-contextbar
```

Claude Code を再起動すると、プロンプトの上にライブバンドが表示されます：コンテキスト使用率・セッションコストに加え、quota 行は **表示先で切り替わります** — ターミナルでは [cc-zaiquota](https://github.com/evggzzz/cc-zaiquota) の daemon キャッシュから **z.ai quota**（5h / 週 / MCP）、デスクトップの Code タブでは API が返した **Claude プランのレートリミット** を表示。`jq` も `statusLine` 設定も不要です。

**B. 従来の statusline として導入**

A と同じコマンドで導入したうえで、Claude Code 上で `/cc-contextbar:install` を実行してください。次の 1 行でも導入できます：

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash
```

どちらの方法でも、`statusline.sh` を `~/.claude/ctxbar/` に置き、`pricing.env` を生成したうえで、`~/.claude/settings.json` の `statusLine` を書き換えます（事前に `.bak` でバックアップを取ります）。[`jq`](https://stedolan.github.io/jq/) が必要です（`brew install jq` / `apt install jq`）。終わったら Claude Code を再起動してください。

> ⚠️ **どちらか一方だけ** にしてください。バンドと `statusLine` は同じ情報を表示するため、両方入れると二重表示になります。

## 📸 バンドの見た目

**ターミナル**（macOS）— 2行目は cc-zaiquota daemon のキャッシュから z.ai quota を表示:

![ターミナルでの cc-contextbar バンド](assets/band-cli.png)

**デスクトップの Code タブ** — 2行目は API が返した Claude プランのレートリミットを表示:

![Claude デスクトップアプリでの cc-contextbar バンド](assets/band-gui.png)

| サーフェス | 2行目の情報源 |
|---|---|
| ターミナル | z.ai quota — cc-zaiquota daemon の `quota.cache`（5h / 週 / MCP、通信なし） |
| デスクトップ / vscode / mobile | API のレートリミット（`five_hour` / `seven_day`）。プランが報告しない場合はキャッシュへフォールバック |

## ⚙️ 料金設定

料金はモデル名から **自動で判定** されるため、設定なしでそのまま使えます（GLM / DeepSeek / Qwen / Kimi / Claude / GPT に対応）。ただし自動判定は推定値なので、正確な金額を出したい場合は `~/.claude/ctxbar/pricing.env` で指定してください（単位は 100 万トークンあたり）。

```bash
PRICE_INPUT=1.00        # 通常入力 + キャッシュ生成
PRICE_CACHE_READ=0.10   # キャッシュ読込（安め）
PRICE_OUTPUT=4.00       # 出力
CUR='$'                 # 通貨記号（$ / ¥ / € など）

# 表示のカスタマイズ（任意）
# CTXBAR_SEGMENTS=10    # バーのセル数
# CTXBAR_FILL=█         # 埋まったセルの文字
# CTXBAR_EMPTY=░        # 空きセルの文字
```

`pricing.env` を置けばそちらが優先され、自動判定は使われなくなります。未対応のモデルで `pricing.env` もない場合は、コストは `--` と表示されます。

## 🤔 なぜ作ったか

> [!IMPORTANT]
> Claude Code の標準機能は、GLM などプロキシ越しのモデルだと **`context_window.used_percentage` がずっと 0** を返します。つまり、Anthropic 以外のモデルを使うときほど標準の使用量メーターが役に立たない、という問題があります。cc-contextbar は **トランスクリプトを直接読む** ことでこれを解決します。

また、描画のたびに約 2 秒かかる Node プロセスを立ち上げ、`node` が大量に残ってしまうような重いステータスラインツールの代わりにもなります。本ツールは `bash` + `jq` だけで、約 30 ms で動きます。

## 🔬 仕組み

- ステータスラインは stdin で Claude Code の JSON を受け取ります。そこから `model.display_name` と `context_window.context_window_size` を読みます。
- **コンテキスト使用率** ＝ 直近の assistant メッセージの `input + cache_creation + cache_read` トークン ÷ コンテキストウィンドウサイズ。
- **コスト** ＝ セッション全体での上記トークンの累計 × 単価。
- 色は、`50%` 未満が緑、`80%` 未満が黄、`80%` 以上が赤に切り替わります。

## 📊 他との比較

| | 標準 `/context` | `ccusage statusline` | **cc-contextbar** |
|---|:--:|:--:|:--:|
| 非 Anthropic モデル | ❌ 0 のまま | ✅ | ✅ |
| 常時表示 | ❌ 呼び出し時のみ | ✅ | ✅ |
| 自前の価格でコスト計算 | ❌ | ⚠️ 独自レート | ✅ |
| 起動の速さ | — | 約 2 s（Node） | **約 30 ms（bash）** |
| プロセスの溜まり | — | ⚠️ よく起きる | ✅ 起きない |

## 🗑️ アンインストール

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash -s -- --uninstall
```

`settings.json` から `statusLine` を削除し（バックアップ付き）、`~/.claude/ctxbar/` を消去します。

## ⭐ Star History

<a href="https://star-history.com/#evggzzz/cc-contextbar&Date">
  <img src="https://api.star-history.com/svg?repos=evggzzz/cc-contextbar&type=Date" alt="Star History" width="600">
</a>

## 📄 ライセンス

MIT © [evggzzz](https://github.com/evggzzz)
