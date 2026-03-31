# MCP Director — 要件定義書

## 1. プロジェクト概要

### 背景
Claude Codeのセッション起動時に、全MCP（14プラグイン + 26 MCPサーバー）が一括で読み込まれるため、初期起動が非常に重い。しかし、1セッションで実際に使うMCPは2〜3個程度。

### 解決策
**MCP Director** — 常駐する超軽量MCPサーバー1つだけで、「やりたいこと」に応じて必要なMCPを提案し、プロファイル切り替えで `.mcp.json` を書き換える。

### ゴール
- 起動時のMCPサーバー数を **26 → 1〜3** に削減
- 「何をしたいか」入力するだけで必要なMCPが分かる
- プロファイル切り替え1コマンドで環境切り替え（次セッションから反映）

---

## 2. アーキテクチャ

```
mcp-director/
├── index.js            # MCP Server本体（Node.js, 軽量）
├── catalog.json        # 全MCPの能力マップ（静的定義）
├── profiles.json       # プリセット定義
├── package.json
├── docs/
│   └── REQUIREMENTS.md # 本ファイル
└── tests/
    └── director.test.js
```

### 動作フロー
```
ユーザー: 「議事録を作りたい」
    ↓
MCP Director (recommend ツール)
    ↓ catalog.json を検索
「以下のMCPが必要です:
 - whisper (音声文字起こし)
 - notebooklm-mcp (ノートブック管理)
 プロファイル '議事録' を適用しますか？」
    ↓
MCP Director (apply_profile ツール)
    ↓ .mcp.json を書き換え
「適用しました。次のセッションから反映されます。」
```

---

## 3. ツール定義（3つ）

### 3.1 `recommend`
やりたいことを入力 → 必要なMCPを提案する。

| 項目 | 内容 |
|------|------|
| 入力 | `task` (string) — やりたいことの自然言語記述 |
| 出力 | マッチしたMCPのリスト（名前・説明・理由）+ 該当プロファイル候補 |
| ロジック | catalog.json の `keywords` / `capabilities` をタスク文とマッチング |

**マッチングロジック:**
- キーワード完全一致 → スコア高
- カテゴリ一致 → スコア中
- 説明文の部分一致 → スコア低
- スコア上位のMCPを返す

### 3.2 `apply_profile`
プロファイルを適用し、対象の `.mcp.json` を書き換える。

| 項目 | 内容 |
|------|------|
| 入力 | `profile_name` (string) — プロファイル名 |
| 入力(任意) | `target` (string) — 書き換え先パス（デフォルト: プロジェクトの `.mcp.json`） |
| 出力 | 適用結果（有効化/無効化されたMCP一覧） |
| 副作用 | `.mcp.json` ファイルの書き換え |

**安全策:**
- 書き換え前に `.mcp.json.bak` を自動バックアップ
- `director` 自身は常に残す（自分を消さない）
- dry-run オプションあり

### 3.3 `list_profiles`
利用可能なプロファイル一覧を表示する。

| 項目 | 内容 |
|------|------|
| 入力 | なし |
| 出力 | 全プロファイルの名前・説明・含まれるMCPリスト |

---

## 4. データ定義

### 4.1 catalog.json
全MCPの能力マップ。MCP Director のコアデータ。

```json
{
  "mcpServers": {
    "whisper": {
      "description": "音声ファイルの文字起こし",
      "category": "音声・メディア",
      "keywords": ["文字起こし", "音声", "transcribe", "whisper", "録音"],
      "capabilities": ["音声文字起こし", "モデル管理"],
      "config": {
        "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-whisper"]
      },
      "weight": "light"
    },
    "notebooklm-mcp": {
      "description": "Google NotebookLMとの連携",
      "category": "ナレッジ・ノート",
      "keywords": ["ノートブック", "NotebookLM", "ソース追加", "音声生成"],
      "capabilities": ["ノートブック管理", "ソース管理", "音声/動画生成"],
      "config": {
        "command": "npx",
        "args": ["-y", "notebooklm-mcp"]
      },
      "weight": "medium"
    },
    "github": {
      "description": "GitHub API連携（PR、Issue、リポジトリ操作）",
      "category": "開発ツール",
      "keywords": ["github", "PR", "issue", "リポジトリ", "コード"],
      "capabilities": ["PR作成", "Issue管理", "コード検索", "ファイル操作"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"]
      },
      "weight": "medium"
    },
    "playwright": {
      "description": "ブラウザ自動操作・テスト・スクリーンショット",
      "category": "Web・ブラウザ",
      "keywords": ["ブラウザ", "テスト", "スクリーンショット", "Web操作", "playwright"],
      "capabilities": ["ページ遷移", "クリック", "入力", "スクリーンショット"],
      "config": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@0.0.68", "--extension"]
      },
      "weight": "heavy"
    },
    "context7": {
      "description": "ライブラリ・フレームワークの最新ドキュメント検索",
      "category": "開発ツール",
      "keywords": ["ドキュメント", "API", "ライブラリ", "docs"],
      "capabilities": ["ドキュメント検索", "コード例取得"],
      "config": {
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp@2.1.4"]
      },
      "weight": "light"
    },
    "memory": {
      "description": "永続的なメモリ・ナレッジグラフ管理",
      "category": "ナレッジ・ノート",
      "keywords": ["メモリ", "記憶", "ナレッジグラフ", "エンティティ"],
      "capabilities": ["エンティティ管理", "関係管理", "検索"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"]
      },
      "weight": "light"
    },
    "exa": {
      "description": "AI検索エンジンによるWeb検索",
      "category": "検索・リサーチ",
      "keywords": ["検索", "Web検索", "リサーチ", "調査"],
      "capabilities": ["セマンティック検索", "Web検索"],
      "config": {
        "url": "https://mcp.exa.ai/mcp"
      },
      "weight": "light"
    },
    "sequential-thinking": {
      "description": "複雑な推論のための段階的思考",
      "category": "推論・分析",
      "keywords": ["分析", "推論", "思考", "複雑な問題"],
      "capabilities": ["段階的推論", "複雑な分析"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
      },
      "weight": "light"
    },
    "figma": {
      "description": "Figmaデザインの取得・操作",
      "category": "デザイン",
      "keywords": ["figma", "デザイン", "UI", "コンポーネント", "スクリーンショット"],
      "capabilities": ["デザイン取得", "スクリーンショット", "Code Connect"],
      "config": {
        "url": "https://mcp.figma.com/mcp"
      },
      "weight": "medium"
    },
    "slack": {
      "description": "Slackワークスペースの検索・メッセージ送信",
      "category": "コミュニケーション",
      "keywords": ["slack", "メッセージ", "チャンネル", "通知"],
      "capabilities": ["メッセージ送信", "チャンネル検索", "メッセージ検索"],
      "config": {
        "url": "https://mcp.slack.com/mcp"
      },
      "weight": "medium"
    },
    "linear": {
      "description": "Linearのイシュー・プロジェクト管理",
      "category": "プロジェクト管理",
      "keywords": ["linear", "イシュー", "タスク", "プロジェクト管理"],
      "capabilities": ["イシュー作成", "プロジェクト管理", "ドキュメント検索"],
      "config": {
        "url": "https://mcp.linear.app/mcp"
      },
      "weight": "medium"
    },
    "filesystem": {
      "description": "ローカルファイルシステムの読み書き",
      "category": "ファイル操作",
      "keywords": ["ファイル", "ディレクトリ", "読み込み", "書き込み"],
      "capabilities": ["ファイル読み書き", "ディレクトリ操作", "検索"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/s32747"]
      },
      "weight": "light"
    },
    "google-calendar": {
      "description": "Googleカレンダーの予定管理",
      "category": "スケジュール",
      "keywords": ["カレンダー", "予定", "スケジュール", "会議"],
      "capabilities": ["予定一覧", "予定作成", "空き時間確認"],
      "config": {
        "command": "npx",
        "args": ["-y", "@anthropic-ai/mcp-google-calendar"]
      },
      "weight": "medium"
    },
    "screenpipe": {
      "description": "画面・音声の記録と検索",
      "category": "音声・メディア",
      "keywords": ["画面録画", "音声録音", "アクティビティ", "会議"],
      "capabilities": ["画面検索", "音声検索", "アクティビティ要約"],
      "config": {
        "command": "screenpipe",
        "args": ["mcp"]
      },
      "weight": "heavy"
    },
    "n8n-mcp": {
      "description": "n8nワークフローの検索・バリデーション",
      "category": "自動化",
      "keywords": ["n8n", "ワークフロー", "自動化", "ノード"],
      "capabilities": ["ノード検索", "テンプレート検索", "バリデーション"],
      "config": {
        "command": "npx",
        "args": ["-y", "n8n-mcp"]
      },
      "weight": "light"
    }
  }
}
```

### 4.2 profiles.json

```json
{
  "profiles": {
    "minimal": {
      "description": "最小構成 — Director のみ",
      "mcpServers": []
    },
    "議事録": {
      "description": "議事録作成（音声→文字起こし→ナレッジ化）",
      "mcpServers": ["whisper", "notebooklm-mcp", "filesystem"]
    },
    "開発": {
      "description": "コード開発（GitHub + ドキュメント + ブラウザテスト）",
      "mcpServers": ["github", "context7", "playwright"]
    },
    "リサーチ": {
      "description": "Web調査・情報収集",
      "mcpServers": ["exa", "context7"]
    },
    "コミュニケーション": {
      "description": "Slack・カレンダー連携",
      "mcpServers": ["slack", "google-calendar"]
    },
    "デザイン": {
      "description": "Figmaデザイン連携 + ブラウザ確認",
      "mcpServers": ["figma", "playwright"]
    },
    "フル": {
      "description": "全MCP有効（従来と同等）",
      "mcpServers": ["ALL"]
    }
  }
}
```

---

## 5. 技術仕様

### 5.1 MCP Server 実装
- **ランタイム:** Node.js (npxで起動可能にする)
- **SDK:** `@modelcontextprotocol/sdk`
- **起動方式:** stdio
- **依存:** なし（SDK以外）— 軽量が最優先

### 5.2 .mcp.json 書き換えロジック

```
apply_profile("議事録") の処理:

1. target の .mcp.json を読み込み
2. .mcp.json.bak としてバックアップ
3. profiles.json から "議事録" のMCPリストを取得
4. catalog.json から各MCPの config を取得
5. director 自身の設定を必ず含める
6. 新しい .mcp.json を生成・書き込み
7. 変更差分を返す
```

### 5.3 recommend マッチングロジック

```
入力: "議事録を作りたい"

1. 入力文をトークン分割: ["議事録", "作りたい"]
2. catalog の各MCPについて:
   - keywords 一致数 × 3点
   - capabilities 部分一致数 × 2点
   - description 部分一致数 × 1点
3. スコア > 0 のMCPを降順で返す
4. 該当プロファイルがあればそれも提案
```

---

## 6. 制約・前提

| 項目 | 内容 |
|------|------|
| **即時反映不可** | `.mcp.json` 書き換え後、次セッション起動から反映。現セッション中のMCP動的追加は不可 |
| **自己保存** | `apply_profile` は director 自身を必ず `.mcp.json` に残す |
| **バックアップ** | 書き換え前に `.mcp.json.bak` を必ず作成 |
| **カタログ手動更新** | 新しいMCPを追加したら `catalog.json` も手動で更新する |
| **書き換え対象** | デフォルトはプロジェクトの `.mcp.json`。グローバル設定は対象外 |

---

## 7. ユースケース

### UC-1: 議事録を作りたい
```
User: 「議事録を作りたい」
→ recommend("議事録を作りたい")
→ whisper, notebooklm-mcp を提案
→ apply_profile("議事録")
→ .mcp.json 書き換え
→ 次セッションで軽量起動
```

### UC-2: 現在のプロファイルを確認
```
User: 「今どのMCPが使える？」
→ list_profiles()
→ 全プロファイル一覧 + 現在の .mcp.json の状態を表示
```

### UC-3: 開発作業に切り替え
```
User: 「開発モードにして」
→ apply_profile("開発")
→ github, context7, playwright だけの .mcp.json に書き換え
→ 次セッションから反映
```

### UC-4: フル構成に戻す
```
User: 「全部入りに戻して」
→ apply_profile("フル")
→ 全MCPを有効化
```

---

## 8. 将来拡張（スコープ外）

- **自動プロファイル推薦:** CLAUDE.md やプロジェクト構成から自動でプロファイルを推薦
- **使用頻度トラッキング:** 各MCPの実使用回数を記録し、不要なMCPを提案
- **プラグイン制御:** MCPだけでなく、プラグインの有効/無効もプロファイルで制御
- **セッション中の動的追加:** Claude Code側の対応待ち
