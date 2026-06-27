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
  <a href="https://code.claude.com">Claude Code</a> 向けの、バッテリー残量のような<strong>コンテキストステータスライン</strong>。<br>
  軽量・高速で、<strong>GLM などの非 Anthropic モデルでもちゃんと動きます</strong>。
</p>

<p align="center">
  <sub><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a></sub>
</p>

<p align="center">
  <img src="assets/demo.gif" alt="cc-contextbar デモ（アニメーション）" width="640">
</p>

---

## ✨ 機能

| | |
|---|---|
| 🔋 **バッテリーバー** | `[██████░░░░]` のように、会話が進むほど埋まっていきます。緑 → 黄 → 赤に切り替わります。 |
| 🧠 **どのモデルでも使える** | GLM などプロキシ経由のモデルは `used_percentage` がずっと 0 のまま。cc-contextbar はトランスクリプトを直接読んで、**本当の使用量**を計算します。 |
| ⚡ **高速** | `bash` + `jq` だけで動き、描画ごとに約 30 ms。Node 不要でプロセスも溜まりません。 |
| 💸 **実コスト表示** | 累計トークン × 単価で計算します。モデル名から**料金を自動判定**（GLM / DeepSeek / Qwen / Kimi / Claude / GPT）し、ファイル1つで上書きもできます。 |
| 🛠️ **設定不要** | インストールするだけで動きます。自動 pricing に設定は要りません。 |
| 🧩 **プラグイン or 1 行** | Claude Code のプラグインとして入れるか、1 行コピペで入れるか、お好きな方で。 |

## 🚀 インストール

> [`jq`](https://stedolan.github.io/jq/) が必要です —— `brew install jq` / `apt install jq`。

**A — プラグインで入れる**

```bash
claude plugin marketplace add evggzzz/cc-contextbar
claude plugin install cc-contextbar@cc-contextbar
```

そのあと、Claude Code 上で次を実行します。

```
/cc-contextbar:install
```

**B — 1 行で入れる**

```bash
curl -fsSL https://raw.githubusercontent.com/evggzzz/cc-contextbar/main/scripts/install.sh | bash
```

どちらの方法でも、`statusline.sh` を `~/.claude/ctxbar/` に置き、`pricing.env` を生成して、`statusLine` の設定を `~/.claude/settings.json` に追記します（事前に `.bak` でバックアップを取ります）。終わったら **Claude Code を再起動**してください。

## ⚙️ 料金設定

料金はモデル名から**自動で判定**されるため、設定なしで使えます（GLM / DeepSeek / Qwen / Kimi / Claude / GPT に対応）。ただし自動判定は推定値なので、正確な金額を出したいときは `~/.claude/ctxbar/pricing.env` を作って指定してください（単位は 100 万トークンあたり）。

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

`pricing.env` を置けばそちらが常に優先されます（自動判定は使われなくなります）。未対応のモデルで `pricing.env` もない場合は、コストは `--` と表示されます。

## 🤔 なぜこれを作ったのか

> [!IMPORTANT]
> Claude Code の標準ステータスラインは、GLM などプロキシ経由のモデルだと **`context_window.used_percentage` がずっと 0** を返します。つまり Anthropic 製以外のモデルを使うときほど、標準メーターが役に立たない —— cc-contextbar は**トランスクリプトを直接読む**ことで、これを解決します。

また、描画のたびに約 2 秒の Node プロセスを立ち上げて `node` が大量に溜まってしまう、重いステータスラインツールの代替にもなります。本ツールは `bash` + `jq` だけで、約 30 ms です。

## 🔬 仕組み

- ステータスラインは stdin で Claude Code の JSON を受け取ります。そこから `model.display_name` と `context_window.context_window_size` を読みます。
- **コンテキスト使用率** = 直近の assistant メッセージの `input + cache_creation + cache_read` トークン ÷ コンテキストウィンドウサイズ。
- **コスト** = セッション全体でのこれらトークンの累計 × 単価。
- 色の切り替わりは、`50%` 未満が緑、`80%` 未満が黄、`80%` 以上が赤。

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

`settings.json` から `statusLine` の設定を削除し（バックアップ付き）、`~/.claude/ctxbar/` を消します。

## ⭐ Star History

<a href="https://star-history.com/#evggzzz/cc-contextbar&Date">
  <img src="https://api.star-history.com/svg?repos=evggzzz/cc-contextbar&type=Date" alt="Star History" width="600">
</a>

## 📄 ライセンス

MIT © [evggzzz](https://github.com/evggzzz)
