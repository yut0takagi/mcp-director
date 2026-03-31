# MCP Director — OSS設計仕様書

## 概要

**mcp-director** は、Claude Code ユーザー向けの超軽量MCPサーバー。常駐する1つのMCPサーバーが「やりたいこと」に応じて必要なMCPを提案し、プロファイル切り替えで `.mcp.json` を書き換える。

- **ターゲット:** Claude Code ユーザー全般（汎用OSS）
- **配布:** npm パッケージ (`npx mcp-director`)
- **ライセンス:** MIT

---

## アーキテクチャ

### ファイル構造

```
mcp-director/
├── src/
│   ├── server.js          # MCPサーバー本体。ツール登録・起動
│   ├── catalog.js         # catalog読み込み・マージ・検索
│   ├── matcher.js         # スコアリングエンジン + LLM支援
│   ├── profiles.js        # プロファイルCRUD・.mcp.json書き換え
│   └── init.js            # 既存.mcp.jsonからcatalogインポート
├── data/
│   ├── default-catalog.json   # バンドル済み公式MCPプリセット
│   └── default-profiles.json  # バンドル済みプロファイル
├── package.json
├── README.md
├── LICENSE
└── tests/
    ├── catalog.test.js
    ├── matcher.test.js
    ├── profiles.test.js
    └── init.test.js
```

### 設計方針

- **純 Node.js ESM** — ビルドステップなし
- **依存は `@modelcontextprotocol/sdk` のみ** — 軽量が最優先
- **stdio方式** — Claude Code標準のMCP接続方式

### ユーザーデータの保存場所

ユーザーのカスタムcatalog/profilesはプロジェクトルートに保存:

```
.mcp-director/
├── catalog.json     # ユーザー定義のMCPエントリ
└── profiles.json    # ユーザー定義のプロファイル
```

### 起動フロー

1. `npx mcp-director` → `server.js` が stdio でMCPサーバー起動
2. `data/default-catalog.json` を読み込み
3. `.mcp-director/catalog.json` があればマージ（ユーザー定義が優先）
4. profilesも同様にマージ
5. ツール群を登録して待機

---

## MCPツール定義（7ツール）

### コアツール

#### `recommend`

やりたいことを入力 → 必要なMCPを提案する。

| 項目 | 内容 |
|------|------|
| 入力 | `task` (string) — やりたいことの自然言語記述 |
| 入力(任意) | `smart` (boolean, default: false) — LLM支援モード |
| 出力 | マッチしたMCPリスト（名前・説明・マッチ理由・スコア）+ 該当プロファイル候補 |

- `smart: false` → matcher.js のスコアリング
- `smart: true` → catalogの全エントリをコンテキストとしてレスポンスに含め、ホストLLMが判断

#### `apply_profile`

プロファイルを適用し、`.mcp.json` を書き換える。

| 項目 | 内容 |
|------|------|
| 入力 | `profile_name` (string) — プロファイル名 |
| 入力(任意) | `dry_run` (boolean, default: false) — プレビューのみ |
| 出力 | 有効化/無効化されたMCP一覧、差分表示 |
| 副作用 | `.mcp.json` ファイルの書き換え（dry_run=false時） |

- `.mcp.json.bak` を自動バックアップ
- `mcp-director` 自身は常に残す（自己保存ルール）

#### `list_profiles`

| 項目 | 内容 |
|------|------|
| 入力 | なし |
| 出力 | 全プロファイルの名前・説明・含まれるMCPリスト + 現在の `.mcp.json` の状態 |

### プロファイル管理ツール

#### `create_profile`

| 項目 | 内容 |
|------|------|
| 入力 | `name` (string), `description` (string), `mcp_servers` (string[]) |
| 出力 | 作成されたプロファイル情報 |
| 副作用 | `.mcp-director/profiles.json` に保存 |

#### `update_profile`

| 項目 | 内容 |
|------|------|
| 入力 | `name` (string), `description` (string, optional), `add` (string[], optional), `remove` (string[], optional) |
| 出力 | 更新後のプロファイル情報 |

#### `delete_profile`

| 項目 | 内容 |
|------|------|
| 入力 | `name` (string) |
| 出力 | 削除確認 |
| 制約 | デフォルトプロファイル（default-profiles.json由来）は削除不可 |

### セットアップツール

#### `init`

| 項目 | 内容 |
|------|------|
| 入力 | なし |
| 出力 | インポートされたMCP数、生成されたcatalogエントリ |

処理フロー:
1. カレントディレクトリの `.mcp.json` を読み込み
2. `.mcp-director/` ディレクトリを作成
3. 各 mcpServer エントリの config を抽出
4. パッケージ名から description/category/keywords を推測
5. `.mcp-director/catalog.json` に書き出し
6. `.mcp-director/profiles.json` を空テンプレートで生成
7. 既に `.mcp-director/` が存在する場合は既存エントリを保持（上書きしない）

---

## マッチングロジック

### シンプルモード（デフォルト）

```
入力: "議事録を作りたい"

1. 入力文を空白・助詞で分割: ["議事録", "作りたい"]
2. catalogの各MCPに対してスコア計算:
   - keywords 完全一致: +3点/hit
   - keywords 部分一致: +2点/hit
   - capabilities 部分一致: +1点/hit
   - description 部分一致: +1点/hit
   - category 一致: +2点
3. スコア > 0 のMCPを降順でソート
4. profilesからmcp_serversが全てマッチするプロファイルを探して候補提示
```

日本語・英語両対応。keywordsに両言語を書いておくことでバイリンガル対応。

### LLM支援モード（`smart: true`）

MCP Director自体がLLMを呼ぶのではなく、ホストのLLMに判断材料を渡す形式:

- レスポンスに `catalogContext` フィールドを追加
- catalog全体のサマリー + タスク文を含む構造化テキストを返す
- LLM側でコンテキストを読んで判断
- 外部API依存ゼロを維持

---

## データ形式

### catalog エントリ

```json
{
  "whisper": {
    "description": "音声ファイルの文字起こし",
    "category": "音声・メディア",
    "keywords": ["文字起こし", "音声", "transcribe", "whisper"],
    "capabilities": ["音声文字起こし", "モデル管理"],
    "config": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-whisper"]
    },
    "weight": "light"
  }
}
```

`config` は `.mcp.json` の `mcpServers` にそのまま書き出せる形式。`command` + `args` 方式と `url` 方式の両方をサポート。

### マージ戦略

```
最終catalog = default-catalog.json ← .mcp-director/catalog.json (shallow merge by key)
最終profiles = default-profiles.json ← .mcp-director/profiles.json (shallow merge by key)
```

- 同名キーはユーザー定義が上書き
- デフォルトを除外したい場合: `"whisper": null` で明示的に除外
- `"ALL"` はプロファイルの特殊値で、catalog全キーに展開

### .mcp.json 書き出し形式

```json
{
  "mcpServers": {
    "mcp-director": {
      "command": "npx",
      "args": ["-y", "mcp-director"]
    },
    "whisper": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-whisper"]
    }
  }
}
```

---

## 安全策

| リスク | 対策 |
|--------|------|
| `.mcp.json` 破壊 | `apply_profile` 前に `.mcp.json.bak` を自動バックアップ |
| director自身の削除 | 書き出し時に必ず `mcp-director` エントリを注入 |
| 意図しない書き換え | `dry_run` オプションでプレビュー可能 |
| init で既存カスタムを上書き | 既存 `.mcp-director/catalog.json` のエントリは保持 |
| 不正なプロファイル名 | `"フル"` プロファイルの `["ALL"]` は特殊値として catalog全キーに展開 |

### .gitignore 推奨

init時にユーザーに提案:

```
.mcp-director/
.mcp.json.bak
```

---

## エラーハンドリング

| 状況 | 挙動 |
|------|------|
| `.mcp.json` が存在しない | `apply_profile` → エラー「.mcp.jsonが見つかりません」+ 空の `.mcp.json` を生成するか確認 |
| 存在しないプロファイル名 | エラー + 利用可能なプロファイル一覧を返す |
| catalogにないMCPをプロファイルに追加 | 警告を返しつつ処理は続行（configが不明なため書き出し不可の旨を通知） |
| `.mcp-director/` が存在しない | `recommend`, `list_profiles` → デフォルトデータのみで動作。エラーにはしない |
| `.mcp.json` のパースエラー | エラー + バックアップからの復元を提案 |
| `init` 時に `.mcp.json` がない | エラー「.mcp.jsonが見つかりません」 |

---

## テスト方針

Node.js 組み込みの `node:test` + `node:assert` を使用。外部テストフレームワーク不要。

```
tests/
├── catalog.test.js    # マージ戦略、null除外、デフォルト読み込み
├── matcher.test.js    # スコアリング計算、日英マッチ、ソート順
├── profiles.test.js   # CRUD操作、.mcp.json書き出し、バックアップ、自己保存
└── init.test.js       # .mcp.jsonインポート、既存マージ、ディレクトリ作成
```

テストではファイルシステム操作は一時ディレクトリで実施。実際の `.mcp.json` には触れない。

---

## 書き換え対象スコープ

- プロジェクトローカルの `.mcp.json` のみ
- グローバル設定（`~/.claude/.mcp.json`）は対象外

---

## 将来拡張（スコープ外）

- 自動プロファイル推薦（CLAUDE.md やプロジェクト構成から推薦）
- 使用頻度トラッキング
- プラグイン制御
- セッション中の動的MCP追加（Claude Code側の対応待ち）
- グローバル設定の書き換えサポート
