<p align="center">
  <img src="assets/banner.svg" alt="cc-contextbar" width="760">
</p>

<p align="center">
  <a href="https://github.com/evggzzz/cc-contextbar/releases"><img src="https://img.shields.io/badge/version-1.0.0-3fb950?style=flat-square"></a>
  <a href="https://github.com/evggzzz/cc-contextbar/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/evggzzz/cc-contextbar/ci.yml?style=flat-square&label=CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey?style=flat-square">
  <img src="https://img.shields.io/badge/Claude%20Code-statusline-6f42c1?style=flat-square">
  <img src="https://img.shields.io/badge/built%20with-bash%20%2B%20jq-1f1f1f?style=flat-square">
  <img src="https://img.shields.io/github/stars/evggzzz/cc-contextbar?style=flat-square&color=yellow">
</p>

<p align="center">
  <a href="https://code.claude.com">Claude Code</a> 用の<strong>バッテリー式コンテキスト状態栏</strong>。<br>
  軽量・高速 —— そして<strong>非 Anthropic モデル（GLM 等）でも実際に動く</strong>。
</p>

<p align="center">
  <sub><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a></sub>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="cc-contextbar アニメーションデモ" width="640">
</p>

---

## ✨ 特徴

| | |
|---|---|
| 🔋 **バッテリーバー** | `[██████░░░░]` が上下文の増加に合わせて埋まる。緑 → 黄 → 赤。 |
| 🧠 **任意のモデル** | GLM などプロキシ経由のモデルは `used_percentage` が常に 0。cc-contextbar はトランスクリプトを直接読んで**実値**を計算。 |
| ⚡ **高速** | 純 `bash` + `jq`、1回の描画で約 30 ms。Node 不要、プロセス溜まりなし。 |
| 💸 **実コスト** | 累積トークン × 単価。モデル名で**自動判定**（GLM/DeepSeek/Qwen/Kimi/Claude/GPT）、1ファイルで上書きも可。 |
| 🛠️ **設定不要** | そのまま動く —— 自動pricingに設定は不要。 |
| 🧩 **プラグイン or 1行** | Claude Code プラグインとして、または1行スクリプトで導入。 |

## 🚀 クイックスタート

> [`jq`](https://stedolan.github.io/jq/) が必要 —— `brew install jq` / `apt install jq`。

**方式 A —— プラグイン**

```bash
claude plugin marketplace add evggzzz/cc-contextbar
claude plugin install cc-contextbar@cc-contextbar
```

その後 Claude Code 内で：

```
/cc-contextbar:install
```

**方式 B —— 1行インストール**

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash
```

どちらも `statusline.sh` を `~/.claude/ctxbar/` にコピーし、`pricing.env` を生成して、`statusLine` エントリを `~/.claude/settings.json` に書き込みます（先に `.bak` でバックアップ）。完了したら **Claude Code を再起動**。

## ⚙️ 料金設定

料金はモデル名から**自動判定**されます（GLM/DeepSeek/Qwen/Kimi/Claude/GPT）—— 設定不要です。自動値は推定なので、正確な単価を使いたい場合は `~/.claude/ctxbar/pricing.env` を作成（単位：100万トークンあたり）：

```bash
PRICE_INPUT=1.00        # 通常入力 + キャッシュ生成
PRICE_CACHE_READ=0.10   # キャッシュ読込（安い）
PRICE_OUTPUT=4.00       # 出力
CUR='$'                 # 通貨記号（$、¥、€ など）

# 外観（任意）
# CTXBAR_SEGMENTS=10    # バーのセル数
# CTXBAR_FILL=█         # 埋まったセルの文字
# CTXBAR_EMPTY=░        # 空セルの文字
```

`pricing.env` が存在すれば常に優先（自動判定は無効化）。未対応モデルで `pricing.env` がない場合、コストは `--` と表示されます。

## 🤔 なぜこれを作ったか？

> [!IMPORTANT]
> Claude Code のネイティブ状態欄は、非 Anthropic モデル（GLM やプロキシ経由のモデル）だと **`context_window.used_percentage` が常に 0** を返します。つまり Anthropic 以外のときほど標準メーターが使えない —— cc-contextbar は**トランスクリプトを直接読む**ことでこれを解決します。

また、毎描画で約 2 秒の Node プロセスを起動し、`node` プロセスが大量に堆積する重い状態欄ツールの置き換えにもなります。これは `bash` + `jq` だけで約 30 ms。

## 🔬 仕組み

- 状態欄は stdin で Claude Code の JSON を受け取ります。そこから `model.display_name` と `context_window.context_window_size` を読みます。
- **コンテキスト比** = 直近の assistant メッセージの `input + cache_creation + cache_read` トークン ÷ コンテキストウィンドウサイズ。
- **コスト** = セッション全体のこれらトークン量の累計 × 単価。
- 色の閾値：`< 50%` 緑 · `< 80%` 黄 · `≥ 80%` 赤。

## 📊 比較

| | ネイティブ `/context` | `ccusage statusline` | **cc-contextbar** |
|---|:--:|:--:|:--:|
| 非Anthropicモデル | ❌ 0表示 | ✅ | ✅ |
| 常時表示 | ❌ オンデマンド | ✅ | ✅ |
| カスタム価格でコスト | ❌ | ⚠️ 独自レート | ✅ |
| 起動速度 | — | ~2 s (Node) | **~30 ms (bash)** |
| プロセス堆積 | — | ⚠️ よく起きる | ✅ なし |

## 🗑️ アンインストール

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash -s -- --uninstall
```

`settings.json` から `statusLine` エントリを削除（バックアップ付き）し、`~/.claude/ctxbar/` を削除します。

## ⭐ Star History

<a href="https://star-history.com/#evggzzz/cc-contextbar&Date">
  <img src="https://api.star-history.com/svg?repos=evggzzz/cc-contextbar&type=Date" alt="Star History" width="600">
</a>

## 📄 ライセンス

MIT © [evggzzz](https://github.com/evggzzz)
