# MCP Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight MCP server that recommends MCPs based on user tasks and manages profile-based `.mcp.json` switching.

**Architecture:** Pure Node.js ESM, no build step. 5 source modules (server, catalog, matcher, profiles, init) + 2 bundled data files. MCP SDK with stdio transport. Tests use `node:test`.

**Tech Stack:** Node.js ESM, `@modelcontextprotocol/sdk`, `zod` (peer of SDK), `node:test` + `node:assert`

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | npm metadata, bin entry, ESM config |
| `src/server.js` | MCP server startup, tool registration |
| `src/catalog.js` | Load default + user catalog, merge, search by key |
| `src/matcher.js` | Score MCPs against task text, LLM context builder |
| `src/profiles.js` | Profile CRUD, `.mcp.json` read/write/backup |
| `src/init.js` | Import existing `.mcp.json` into `.mcp-director/catalog.json` |
| `data/default-catalog.json` | Bundled MCP preset entries |
| `data/default-profiles.json` | Bundled profile presets |
| `tests/catalog.test.js` | Catalog loading, merging, null exclusion |
| `tests/matcher.test.js` | Scoring, bilingual matching, sort order |
| `tests/profiles.test.js` | CRUD, `.mcp.json` write, backup, self-preservation |
| `tests/init.test.js` | Import, merge with existing, directory creation |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `src/server.js` (stub)
- Create: `LICENSE`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "mcp-director",
  "version": "0.1.0",
  "description": "Lightweight MCP server that recommends and manages MCP profiles for Claude Code",
  "type": "module",
  "bin": {
    "mcp-director": "./src/server.js"
  },
  "main": "./src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/"
  },
  "keywords": ["mcp", "claude-code", "profile-manager"],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create stub server.js**

```js
#!/usr/bin/env node

// MCP Director — lightweight MCP profile manager
console.error('mcp-director starting...');
```

- [ ] **Step 3: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 mcp-director contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated, `@modelcontextprotocol/sdk` installed.

- [ ] **Step 5: Verify stub runs**

Run: `node src/server.js`
Expected: prints `mcp-director starting...` to stderr and exits.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json package-lock.json src/server.js LICENSE
git commit -m "chore: scaffold mcp-director project"
```

---

### Task 2: Bundled Data Files

**Files:**
- Create: `data/default-catalog.json`
- Create: `data/default-profiles.json`

- [ ] **Step 1: Create default-catalog.json**

```json
{
  "mcpServers": {
    "github": {
      "description": "GitHub API integration (PR, Issue, repository operations)",
      "category": "Development",
      "keywords": ["github", "PR", "issue", "repository", "code", "リポジトリ", "コード"],
      "capabilities": ["PR creation", "Issue management", "Code search", "File operations"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"]
      },
      "weight": "medium"
    },
    "playwright": {
      "description": "Browser automation, testing, and screenshots",
      "category": "Web & Browser",
      "keywords": ["browser", "test", "screenshot", "web", "playwright", "ブラウザ", "テスト", "スクリーンショット"],
      "capabilities": ["Page navigation", "Click", "Input", "Screenshot"],
      "config": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest", "--extension"]
      },
      "weight": "heavy"
    },
    "context7": {
      "description": "Up-to-date library and framework documentation search",
      "category": "Development",
      "keywords": ["documentation", "API", "library", "docs", "ドキュメント", "ライブラリ"],
      "capabilities": ["Documentation search", "Code examples"],
      "config": {
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp@latest"]
      },
      "weight": "light"
    },
    "memory": {
      "description": "Persistent memory and knowledge graph management",
      "category": "Knowledge",
      "keywords": ["memory", "knowledge", "graph", "entity", "メモリ", "記憶", "ナレッジ"],
      "capabilities": ["Entity management", "Relation management", "Search"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"]
      },
      "weight": "light"
    },
    "filesystem": {
      "description": "Local filesystem read/write operations",
      "category": "File Operations",
      "keywords": ["file", "directory", "read", "write", "ファイル", "ディレクトリ"],
      "capabilities": ["File read/write", "Directory operations", "Search"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
      },
      "weight": "light"
    },
    "sequential-thinking": {
      "description": "Step-by-step reasoning for complex problems",
      "category": "Reasoning",
      "keywords": ["analysis", "reasoning", "thinking", "complex", "分析", "推論", "思考"],
      "capabilities": ["Step-by-step reasoning", "Complex analysis"],
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
      },
      "weight": "light"
    },
    "slack": {
      "description": "Slack workspace search and messaging",
      "category": "Communication",
      "keywords": ["slack", "message", "channel", "メッセージ", "チャンネル", "通知"],
      "capabilities": ["Send messages", "Search channels", "Search messages"],
      "config": {
        "url": "https://mcp.slack.com/mcp"
      },
      "weight": "medium"
    },
    "figma": {
      "description": "Figma design retrieval and operations",
      "category": "Design",
      "keywords": ["figma", "design", "UI", "component", "デザイン", "コンポーネント"],
      "capabilities": ["Design retrieval", "Screenshot", "Code Connect"],
      "config": {
        "url": "https://mcp.figma.com/mcp"
      },
      "weight": "medium"
    },
    "linear": {
      "description": "Linear issue and project management",
      "category": "Project Management",
      "keywords": ["linear", "issue", "task", "project", "イシュー", "タスク", "プロジェクト管理"],
      "capabilities": ["Issue creation", "Project management", "Document search"],
      "config": {
        "url": "https://mcp.linear.app/mcp"
      },
      "weight": "medium"
    }
  }
}
```

- [ ] **Step 2: Create default-profiles.json**

```json
{
  "profiles": {
    "minimal": {
      "description": "Minimal — Director only",
      "mcpServers": []
    },
    "development": {
      "description": "Code development (GitHub + docs + browser testing)",
      "mcpServers": ["github", "context7", "playwright"]
    },
    "research": {
      "description": "Web research and information gathering",
      "mcpServers": ["context7", "sequential-thinking"]
    },
    "communication": {
      "description": "Slack and project management",
      "mcpServers": ["slack", "linear"]
    },
    "design": {
      "description": "Figma design + browser preview",
      "mcpServers": ["figma", "playwright"]
    },
    "full": {
      "description": "All MCPs enabled",
      "mcpServers": ["ALL"]
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add data/
git commit -m "feat: add bundled default catalog and profiles"
```

---

### Task 3: Catalog Module

**Files:**
- Create: `src/catalog.js`
- Create: `tests/catalog.test.js`

- [ ] **Step 1: Write failing tests for catalog**

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, mergeCatalogs, getCatalogEntry } from '../src/catalog.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('catalog', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-director-test-'));
  });

  describe('mergeCatalogs', () => {
    it('should return defaults when no user catalog exists', () => {
      const defaults = {
        mcpServers: {
          github: { description: 'GitHub', keywords: ['github'] }
        }
      };
      const result = mergeCatalogs(defaults, null);
      assert.deepStrictEqual(result, defaults);
    });

    it('should override default entry with user entry', () => {
      const defaults = {
        mcpServers: {
          github: { description: 'GitHub default', keywords: ['github'] }
        }
      };
      const user = {
        mcpServers: {
          github: { description: 'My GitHub', keywords: ['github', 'gh'] }
        }
      };
      const result = mergeCatalogs(defaults, user);
      assert.equal(result.mcpServers.github.description, 'My GitHub');
      assert.deepStrictEqual(result.mcpServers.github.keywords, ['github', 'gh']);
    });

    it('should add user-only entries', () => {
      const defaults = {
        mcpServers: {
          github: { description: 'GitHub', keywords: [] }
        }
      };
      const user = {
        mcpServers: {
          custom: { description: 'My custom MCP', keywords: ['custom'] }
        }
      };
      const result = mergeCatalogs(defaults, user);
      assert.ok(result.mcpServers.github);
      assert.ok(result.mcpServers.custom);
    });

    it('should exclude entries set to null in user catalog', () => {
      const defaults = {
        mcpServers: {
          github: { description: 'GitHub', keywords: [] },
          slack: { description: 'Slack', keywords: [] }
        }
      };
      const user = {
        mcpServers: {
          github: null
        }
      };
      const result = mergeCatalogs(defaults, user);
      assert.equal(result.mcpServers.github, undefined);
      assert.ok(result.mcpServers.slack);
    });
  });

  describe('loadCatalog', () => {
    it('should load catalog from a JSON file', async () => {
      const catalogData = {
        mcpServers: {
          test: { description: 'Test MCP', keywords: ['test'] }
        }
      };
      const filePath = join(tempDir, 'catalog.json');
      await writeFile(filePath, JSON.stringify(catalogData));
      const result = await loadCatalog(filePath);
      assert.deepStrictEqual(result, catalogData);
    });

    it('should return null for non-existent file', async () => {
      const result = await loadCatalog(join(tempDir, 'nonexistent.json'));
      assert.equal(result, null);
    });
  });

  describe('getCatalogEntry', () => {
    it('should return entry by name', () => {
      const catalog = {
        mcpServers: {
          github: { description: 'GitHub', keywords: ['github'] }
        }
      };
      const entry = getCatalogEntry(catalog, 'github');
      assert.equal(entry.description, 'GitHub');
    });

    it('should return undefined for unknown name', () => {
      const catalog = { mcpServers: {} };
      const entry = getCatalogEntry(catalog, 'unknown');
      assert.equal(entry, undefined);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/catalog.test.js`
Expected: FAIL — `cannot find module '../src/catalog.js'`

- [ ] **Step 3: Implement catalog.js**

```js
import { readFile } from 'node:fs/promises';

/**
 * Load a catalog JSON file. Returns null if file doesn't exist.
 */
export async function loadCatalog(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Merge default catalog with user catalog.
 * User entries override defaults. null values exclude the entry.
 */
export function mergeCatalogs(defaults, user) {
  if (!user) return defaults;

  const merged = { mcpServers: { ...defaults.mcpServers } };

  for (const [name, entry] of Object.entries(user.mcpServers || {})) {
    if (entry === null) {
      delete merged.mcpServers[name];
    } else {
      merged.mcpServers[name] = entry;
    }
  }

  return merged;
}

/**
 * Get a single catalog entry by name.
 */
export function getCatalogEntry(catalog, name) {
  return catalog.mcpServers[name];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/catalog.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog.js tests/catalog.test.js
git commit -m "feat: add catalog module with load, merge, and lookup"
```

---

### Task 4: Matcher Module

**Files:**
- Create: `src/matcher.js`
- Create: `tests/matcher.test.js`

- [ ] **Step 1: Write failing tests for matcher**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMatch, recommend, buildLlmContext } from '../src/matcher.js';

const testCatalog = {
  mcpServers: {
    whisper: {
      description: '音声ファイルの文字起こし',
      category: '音声・メディア',
      keywords: ['文字起こし', '音声', 'transcribe', 'whisper', '録音'],
      capabilities: ['音声文字起こし', 'モデル管理']
    },
    github: {
      description: 'GitHub API integration',
      category: 'Development',
      keywords: ['github', 'PR', 'issue', 'code'],
      capabilities: ['PR creation', 'Issue management']
    },
    playwright: {
      description: 'Browser automation and testing',
      category: 'Web & Browser',
      keywords: ['browser', 'test', 'screenshot', 'ブラウザ'],
      capabilities: ['Page navigation', 'Screenshot']
    }
  }
};

const testProfiles = {
  profiles: {
    development: {
      description: 'Development',
      mcpServers: ['github', 'playwright']
    }
  }
};

describe('matcher', () => {
  describe('scoreMatch', () => {
    it('should score keyword exact match at 3 points', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['whisper']);
      assert.ok(score >= 3);
    });

    it('should score keyword partial match at 2 points', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['文字']);
      assert.ok(score >= 2);
    });

    it('should score description partial match at 1 point', () => {
      const entry = testCatalog.mcpServers.github;
      const score = scoreMatch(entry, ['API']);
      assert.ok(score >= 1);
    });

    it('should return 0 for no match', () => {
      const entry = testCatalog.mcpServers.github;
      const score = scoreMatch(entry, ['カレンダー']);
      assert.equal(score, 0);
    });

    it('should handle Japanese input', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['音声']);
      assert.ok(score >= 3);
    });
  });

  describe('recommend', () => {
    it('should return matched MCPs sorted by score descending', () => {
      const results = recommend(testCatalog, testProfiles, 'github PR');
      assert.ok(results.matches.length > 0);
      assert.equal(results.matches[0].name, 'github');
    });

    it('should include matching profiles', () => {
      const results = recommend(testCatalog, testProfiles, 'github browser test');
      const profileNames = results.suggestedProfiles.map(p => p.name);
      assert.ok(profileNames.includes('development'));
    });

    it('should return empty for no match', () => {
      const results = recommend(testCatalog, testProfiles, 'xyz123nonsense');
      assert.equal(results.matches.length, 0);
    });
  });

  describe('buildLlmContext', () => {
    it('should return structured context string with catalog summary', () => {
      const context = buildLlmContext(testCatalog, '議事録を作りたい');
      assert.ok(context.includes('whisper'));
      assert.ok(context.includes('github'));
      assert.ok(context.includes('議事録を作りたい'));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/matcher.test.js`
Expected: FAIL — `cannot find module '../src/matcher.js'`

- [ ] **Step 3: Implement matcher.js**

```js
/**
 * Tokenize input text into search terms.
 * Splits on whitespace and common Japanese particles.
 */
function tokenize(text) {
  return text
    .split(/[\s、。・を　に　で　が　は　の　と]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

/**
 * Score a single catalog entry against search tokens.
 *
 * - keyword exact match: +3
 * - keyword partial match: +2
 * - capability partial match: +1
 * - description partial match: +1
 * - category match: +2
 */
export function scoreMatch(entry, tokens) {
  let score = 0;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Keywords
    for (const kw of entry.keywords || []) {
      const kwLower = kw.toLowerCase();
      if (kwLower === lower) {
        score += 3;
      } else if (kwLower.includes(lower) || lower.includes(kwLower)) {
        score += 2;
      }
    }

    // Capabilities
    for (const cap of entry.capabilities || []) {
      if (cap.toLowerCase().includes(lower)) {
        score += 1;
      }
    }

    // Description
    if ((entry.description || '').toLowerCase().includes(lower)) {
      score += 1;
    }

    // Category
    if ((entry.category || '').toLowerCase().includes(lower)) {
      score += 2;
    }
  }

  return score;
}

/**
 * Recommend MCPs for a given task.
 * Returns { matches: [...], suggestedProfiles: [...] }
 */
export function recommend(catalog, profiles, task) {
  const tokens = tokenize(task);

  const scored = Object.entries(catalog.mcpServers)
    .map(([name, entry]) => ({
      name,
      description: entry.description,
      score: scoreMatch(entry, tokens),
      keywords: entry.keywords
    }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);

  const matchedNames = new Set(scored.map(m => m.name));

  const suggestedProfiles = Object.entries(profiles.profiles || {})
    .filter(([, profile]) => {
      const servers = profile.mcpServers || [];
      if (servers.length === 0) return false;
      if (servers.includes('ALL')) return false;
      return servers.every(s => matchedNames.has(s));
    })
    .map(([name, profile]) => ({
      name,
      description: profile.description,
      mcpServers: profile.mcpServers
    }));

  return {
    matches: scored,
    suggestedProfiles
  };
}

/**
 * Build structured context for LLM-assisted recommendation.
 * Returns a text block the host LLM can use to decide which MCPs to suggest.
 */
export function buildLlmContext(catalog, task) {
  const lines = [
    `# MCP Recommendation Context`,
    ``,
    `## User Task`,
    task,
    ``,
    `## Available MCPs`,
    ``
  ];

  for (const [name, entry] of Object.entries(catalog.mcpServers)) {
    lines.push(`### ${name}`);
    lines.push(`- Description: ${entry.description}`);
    lines.push(`- Category: ${entry.category}`);
    lines.push(`- Keywords: ${(entry.keywords || []).join(', ')}`);
    lines.push(`- Capabilities: ${(entry.capabilities || []).join(', ')}`);
    lines.push(`- Weight: ${entry.weight || 'unknown'}`);
    lines.push(``);
  }

  lines.push(`## Instructions`);
  lines.push(`Based on the user's task, select the MCPs that would be most helpful.`);
  lines.push(`Return the MCP names and explain why each is relevant.`);

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/matcher.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/matcher.js tests/matcher.test.js
git commit -m "feat: add matcher module with scoring and LLM context builder"
```

---

### Task 5: Profiles Module

**Files:**
- Create: `src/profiles.js`
- Create: `tests/profiles.test.js`

- [ ] **Step 1: Write failing tests for profiles**

```js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadProfiles, mergeProfiles,
  createProfile, updateProfile, deleteProfile,
  applyProfile, readMcpJson
} from '../src/profiles.js';
import { mkdtemp, writeFile, readFile, mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('profiles', () => {
  let tempDir;
  let userDataDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-director-test-'));
    userDataDir = join(tempDir, '.mcp-director');
    await mkdir(userDataDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('mergeProfiles', () => {
    it('should merge default and user profiles', () => {
      const defaults = { profiles: { minimal: { description: 'Min', mcpServers: [] } } };
      const user = { profiles: { custom: { description: 'Custom', mcpServers: ['github'] } } };
      const result = mergeProfiles(defaults, user);
      assert.ok(result.profiles.minimal);
      assert.ok(result.profiles.custom);
    });

    it('should return defaults when user is null', () => {
      const defaults = { profiles: { minimal: { description: 'Min', mcpServers: [] } } };
      const result = mergeProfiles(defaults, null);
      assert.deepStrictEqual(result, defaults);
    });
  });

  describe('createProfile', () => {
    it('should create a new profile in user data', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({ profiles: {} }));
      await createProfile(profilesPath, 'test', 'Test profile', ['github']);
      const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
      assert.equal(data.profiles.test.description, 'Test profile');
      assert.deepStrictEqual(data.profiles.test.mcpServers, ['github']);
    });

    it('should throw if profile already exists', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({
        profiles: { test: { description: 'Existing', mcpServers: [] } }
      }));
      await assert.rejects(
        () => createProfile(profilesPath, 'test', 'Duplicate', []),
        { message: /already exists/ }
      );
    });
  });

  describe('updateProfile', () => {
    it('should add and remove servers', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({
        profiles: { dev: { description: 'Dev', mcpServers: ['github', 'slack'] } }
      }));
      await updateProfile(profilesPath, 'dev', { add: ['playwright'], remove: ['slack'] });
      const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
      assert.deepStrictEqual(data.profiles.dev.mcpServers, ['github', 'playwright']);
    });

    it('should update description if provided', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({
        profiles: { dev: { description: 'Old', mcpServers: [] } }
      }));
      await updateProfile(profilesPath, 'dev', { description: 'New' });
      const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
      assert.equal(data.profiles.dev.description, 'New');
    });
  });

  describe('deleteProfile', () => {
    it('should delete a user profile', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({
        profiles: { custom: { description: 'Custom', mcpServers: [] } }
      }));
      await deleteProfile(profilesPath, 'custom', new Set());
      const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
      assert.equal(data.profiles.custom, undefined);
    });

    it('should refuse to delete a default profile', async () => {
      const profilesPath = join(userDataDir, 'profiles.json');
      await writeFile(profilesPath, JSON.stringify({ profiles: {} }));
      const defaultNames = new Set(['minimal']);
      await assert.rejects(
        () => deleteProfile(profilesPath, 'minimal', defaultNames),
        { message: /cannot delete default/ }
      );
    });
  });

  describe('applyProfile', () => {
    it('should write .mcp.json with profile servers + director', async () => {
      const mcpJsonPath = join(tempDir, '.mcp.json');
      await writeFile(mcpJsonPath, JSON.stringify({ mcpServers: {} }));

      const catalog = {
        mcpServers: {
          github: { config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } },
          playwright: { config: { command: 'npx', args: ['-y', '@playwright/mcp@latest'] } }
        }
      };
      const profile = { mcpServers: ['github'] };

      const result = await applyProfile(mcpJsonPath, profile, catalog, false);
      const written = JSON.parse(await readFile(mcpJsonPath, 'utf-8'));

      assert.ok(written.mcpServers['mcp-director'], 'director must be preserved');
      assert.ok(written.mcpServers.github);
      assert.equal(written.mcpServers.playwright, undefined);
      assert.ok(result.added.includes('github'));
    });

    it('should create .mcp.json.bak before writing', async () => {
      const mcpJsonPath = join(tempDir, '.mcp.json');
      await writeFile(mcpJsonPath, JSON.stringify({ mcpServers: { old: {} } }));

      const catalog = { mcpServers: {} };
      const profile = { mcpServers: [] };
      await applyProfile(mcpJsonPath, profile, catalog, false);

      const bak = JSON.parse(await readFile(mcpJsonPath + '.bak', 'utf-8'));
      assert.ok(bak.mcpServers.old);
    });

    it('should not write when dry_run is true', async () => {
      const mcpJsonPath = join(tempDir, '.mcp.json');
      const original = JSON.stringify({ mcpServers: { old: {} } });
      await writeFile(mcpJsonPath, original);

      const catalog = { mcpServers: {} };
      const profile = { mcpServers: [] };
      await applyProfile(mcpJsonPath, profile, catalog, true);

      const content = await readFile(mcpJsonPath, 'utf-8');
      assert.equal(content, original);
    });

    it('should expand ALL to all catalog entries', async () => {
      const mcpJsonPath = join(tempDir, '.mcp.json');
      await writeFile(mcpJsonPath, JSON.stringify({ mcpServers: {} }));

      const catalog = {
        mcpServers: {
          github: { config: { command: 'npx', args: [] } },
          slack: { config: { url: 'https://mcp.slack.com/mcp' } }
        }
      };
      const profile = { mcpServers: ['ALL'] };
      await applyProfile(mcpJsonPath, profile, catalog, false);

      const written = JSON.parse(await readFile(mcpJsonPath, 'utf-8'));
      assert.ok(written.mcpServers.github);
      assert.ok(written.mcpServers.slack);
      assert.ok(written.mcpServers['mcp-director']);
    });
  });

  describe('readMcpJson', () => {
    it('should read and parse .mcp.json', async () => {
      const mcpJsonPath = join(tempDir, '.mcp.json');
      await writeFile(mcpJsonPath, JSON.stringify({ mcpServers: { test: {} } }));
      const result = await readMcpJson(mcpJsonPath);
      assert.ok(result.mcpServers.test);
    });

    it('should return null if file does not exist', async () => {
      const result = await readMcpJson(join(tempDir, 'nonexistent.json'));
      assert.equal(result, null);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/profiles.test.js`
Expected: FAIL — `cannot find module '../src/profiles.js'`

- [ ] **Step 3: Implement profiles.js**

```js
import { readFile, writeFile, copyFile } from 'node:fs/promises';

const DIRECTOR_ENTRY = {
  command: 'npx',
  args: ['-y', 'mcp-director']
};

/**
 * Load profiles from a JSON file. Returns null if not found.
 */
export async function loadProfiles(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Merge default profiles with user profiles. User overrides defaults.
 */
export function mergeProfiles(defaults, user) {
  if (!user) return defaults;
  return {
    profiles: { ...defaults.profiles, ...user.profiles }
  };
}

/**
 * Read and parse a .mcp.json file. Returns null if not found.
 */
export async function readMcpJson(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Create a new profile in the user profiles file.
 */
export async function createProfile(profilesPath, name, description, mcpServers) {
  const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
  if (data.profiles[name]) {
    throw new Error(`Profile '${name}' already exists`);
  }
  data.profiles[name] = { description, mcpServers };
  await writeFile(profilesPath, JSON.stringify(data, null, 2));
  return data.profiles[name];
}

/**
 * Update an existing profile.
 */
export async function updateProfile(profilesPath, name, { description, add, remove } = {}) {
  const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
  const profile = data.profiles[name];
  if (!profile) {
    throw new Error(`Profile '${name}' not found`);
  }
  if (description !== undefined) {
    profile.description = description;
  }
  if (remove) {
    profile.mcpServers = profile.mcpServers.filter(s => !remove.includes(s));
  }
  if (add) {
    for (const s of add) {
      if (!profile.mcpServers.includes(s)) {
        profile.mcpServers.push(s);
      }
    }
  }
  await writeFile(profilesPath, JSON.stringify(data, null, 2));
  return profile;
}

/**
 * Delete a profile. Refuses to delete default profiles.
 */
export async function deleteProfile(profilesPath, name, defaultProfileNames) {
  if (defaultProfileNames.has(name)) {
    throw new Error(`cannot delete default profile '${name}'`);
  }
  const data = JSON.parse(await readFile(profilesPath, 'utf-8'));
  if (!data.profiles[name]) {
    throw new Error(`Profile '${name}' not found`);
  }
  delete data.profiles[name];
  await writeFile(profilesPath, JSON.stringify(data, null, 2));
}

/**
 * Apply a profile: backup .mcp.json, then write new one.
 * Returns { added, removed } arrays.
 */
export async function applyProfile(mcpJsonPath, profile, catalog, dryRun) {
  const existing = await readMcpJson(mcpJsonPath);
  const oldServers = existing ? Object.keys(existing.mcpServers || {}) : [];

  // Resolve server list
  let serverNames = profile.mcpServers || [];
  if (serverNames.includes('ALL')) {
    serverNames = Object.keys(catalog.mcpServers);
  }

  // Build new mcpServers object
  const newMcpServers = {
    'mcp-director': DIRECTOR_ENTRY
  };

  const warnings = [];
  for (const name of serverNames) {
    const entry = catalog.mcpServers[name];
    if (entry && entry.config) {
      newMcpServers[name] = entry.config;
    } else {
      warnings.push(`'${name}' not found in catalog or has no config`);
    }
  }

  const newContent = { mcpServers: newMcpServers };
  const newServerKeys = Object.keys(newMcpServers);

  const added = newServerKeys.filter(s => !oldServers.includes(s));
  const removed = oldServers.filter(s => !newServerKeys.includes(s));

  if (!dryRun) {
    // Backup
    if (existing) {
      await copyFile(mcpJsonPath, mcpJsonPath + '.bak');
    }
    await writeFile(mcpJsonPath, JSON.stringify(newContent, null, 2));
  }

  return { added, removed, warnings, newContent };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/profiles.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/profiles.js tests/profiles.test.js
git commit -m "feat: add profiles module with CRUD and .mcp.json management"
```

---

### Task 6: Init Module

**Files:**
- Create: `src/init.js`
- Create: `tests/init.test.js`

- [ ] **Step 1: Write failing tests for init**

```js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { initFromMcpJson } from '../src/init.js';
import { mkdtemp, writeFile, readFile, mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('init', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-director-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create .mcp-director/ directory', async () => {
    const mcpJson = {
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
      }
    };
    await writeFile(join(tempDir, '.mcp.json'), JSON.stringify(mcpJson));

    await initFromMcpJson(tempDir);

    await access(join(tempDir, '.mcp-director'));
  });

  it('should generate catalog entries from .mcp.json', async () => {
    const mcpJson = {
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
        'custom-mcp': { url: 'https://example.com/mcp' }
      }
    };
    await writeFile(join(tempDir, '.mcp.json'), JSON.stringify(mcpJson));

    const result = await initFromMcpJson(tempDir);

    assert.equal(result.importedCount, 2);

    const catalog = JSON.parse(
      await readFile(join(tempDir, '.mcp-director', 'catalog.json'), 'utf-8')
    );
    assert.ok(catalog.mcpServers.github);
    assert.ok(catalog.mcpServers['custom-mcp']);
    assert.deepStrictEqual(
      catalog.mcpServers.github.config,
      { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
    );
    assert.deepStrictEqual(
      catalog.mcpServers['custom-mcp'].config,
      { url: 'https://example.com/mcp' }
    );
  });

  it('should not overwrite existing catalog entries', async () => {
    const mcpJson = {
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
      }
    };
    await writeFile(join(tempDir, '.mcp.json'), JSON.stringify(mcpJson));

    // Pre-existing catalog
    await mkdir(join(tempDir, '.mcp-director'), { recursive: true });
    const existingCatalog = {
      mcpServers: {
        github: {
          description: 'My custom description',
          category: 'Custom',
          keywords: ['my-github'],
          capabilities: [],
          config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
        }
      }
    };
    await writeFile(
      join(tempDir, '.mcp-director', 'catalog.json'),
      JSON.stringify(existingCatalog)
    );

    await initFromMcpJson(tempDir);

    const catalog = JSON.parse(
      await readFile(join(tempDir, '.mcp-director', 'catalog.json'), 'utf-8')
    );
    assert.equal(catalog.mcpServers.github.description, 'My custom description');
  });

  it('should create empty profiles.json template', async () => {
    const mcpJson = { mcpServers: { test: { command: 'echo', args: [] } } };
    await writeFile(join(tempDir, '.mcp.json'), JSON.stringify(mcpJson));

    await initFromMcpJson(tempDir);

    const profiles = JSON.parse(
      await readFile(join(tempDir, '.mcp-director', 'profiles.json'), 'utf-8')
    );
    assert.deepStrictEqual(profiles, { profiles: {} });
  });

  it('should throw if .mcp.json does not exist', async () => {
    await assert.rejects(
      () => initFromMcpJson(tempDir),
      { message: /\.mcp\.json.*not found/ }
    );
  });

  it('should skip mcp-director entry from import', async () => {
    const mcpJson = {
      mcpServers: {
        'mcp-director': { command: 'npx', args: ['-y', 'mcp-director'] },
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] }
      }
    };
    await writeFile(join(tempDir, '.mcp.json'), JSON.stringify(mcpJson));

    const result = await initFromMcpJson(tempDir);

    assert.equal(result.importedCount, 1);
    const catalog = JSON.parse(
      await readFile(join(tempDir, '.mcp-director', 'catalog.json'), 'utf-8')
    );
    assert.equal(catalog.mcpServers['mcp-director'], undefined);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/init.test.js`
Expected: FAIL — `cannot find module '../src/init.js'`

- [ ] **Step 3: Implement init.js**

```js
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Extract a guessed keyword from a package name or URL.
 * e.g. "@modelcontextprotocol/server-github" → "github"
 * e.g. "https://mcp.slack.com/mcp" → "slack"
 */
function guessKeywords(name, config) {
  const keywords = [name];

  if (config.args) {
    const pkg = config.args.find(a => a.startsWith('@') || (!a.startsWith('-') && a.includes('/')));
    if (pkg) {
      const parts = pkg.replace(/@/g, '').split('/');
      const last = parts[parts.length - 1]
        .replace(/^server-/, '')
        .replace(/@.*$/, '');
      if (last && last !== name) keywords.push(last);
    }
  }

  if (config.url) {
    try {
      const host = new URL(config.url).hostname;
      const domain = host.split('.').find(p => p !== 'mcp' && p !== 'com' && p !== 'app');
      if (domain && domain !== name) keywords.push(domain);
    } catch {}
  }

  return keywords;
}

/**
 * Initialize .mcp-director/ from existing .mcp.json.
 */
export async function initFromMcpJson(projectDir) {
  const mcpJsonPath = join(projectDir, '.mcp.json');

  let mcpData;
  try {
    mcpData = JSON.parse(await readFile(mcpJsonPath, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('.mcp.json not found in ' + projectDir);
    }
    throw err;
  }

  const directorDir = join(projectDir, '.mcp-director');
  await mkdir(directorDir, { recursive: true });

  // Load existing catalog if present
  const catalogPath = join(directorDir, 'catalog.json');
  let existingCatalog = { mcpServers: {} };
  try {
    existingCatalog = JSON.parse(await readFile(catalogPath, 'utf-8'));
  } catch {}

  let importedCount = 0;

  for (const [name, config] of Object.entries(mcpData.mcpServers || {})) {
    // Skip director itself
    if (name === 'mcp-director') continue;
    // Don't overwrite existing entries
    if (existingCatalog.mcpServers[name]) continue;

    existingCatalog.mcpServers[name] = {
      description: '',
      category: '',
      keywords: guessKeywords(name, config),
      capabilities: [],
      config
    };
    importedCount++;
  }

  await writeFile(catalogPath, JSON.stringify(existingCatalog, null, 2));

  // Create empty profiles template if it doesn't exist
  const profilesPath = join(directorDir, 'profiles.json');
  try {
    await access(profilesPath);
  } catch {
    await writeFile(profilesPath, JSON.stringify({ profiles: {} }, null, 2));
  }

  return { importedCount };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/init.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/init.js tests/init.test.js
git commit -m "feat: add init module to import existing .mcp.json"
```

---

### Task 7: MCP Server (server.js)

**Files:**
- Modify: `src/server.js` (replace stub)

- [ ] **Step 1: Implement server.js with all 7 tools**

```js
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { loadCatalog, mergeCatalogs, getCatalogEntry } from './catalog.js';
import { scoreMatch, recommend, buildLlmContext } from './matcher.js';
import {
  loadProfiles, mergeProfiles, readMcpJson,
  createProfile, updateProfile, deleteProfile,
  applyProfile
} from './profiles.js';
import { initFromMcpJson } from './init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

async function main() {
  const server = new McpServer({
    name: 'mcp-director',
    version: '0.1.0'
  });

  // Resolve project directory (cwd)
  const projectDir = process.cwd();
  const userDataDir = join(projectDir, '.mcp-director');

  // Load and merge catalog
  const defaultCatalog = await loadCatalog(join(DATA_DIR, 'default-catalog.json'));
  const userCatalog = await loadCatalog(join(userDataDir, 'catalog.json'));
  let catalog = mergeCatalogs(defaultCatalog, userCatalog);

  // Load and merge profiles
  const defaultProfiles = await loadProfiles(join(DATA_DIR, 'default-profiles.json'));
  const userProfiles = await loadProfiles(join(userDataDir, 'profiles.json'));
  let profiles = mergeProfiles(defaultProfiles, userProfiles);
  const defaultProfileNames = new Set(Object.keys(defaultProfiles.profiles));

  // --- Tool: recommend ---
  server.tool(
    'recommend',
    {
      task: z.string().describe('What you want to do (natural language)'),
      smart: z.boolean().optional().default(false).describe('Use LLM-assisted mode')
    },
    async ({ task, smart }) => {
      const result = recommend(catalog, profiles, task);

      if (smart) {
        const context = buildLlmContext(catalog, task);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              scoredMatches: result.matches,
              suggestedProfiles: result.suggestedProfiles,
              catalogContext: context
            }, null, 2)
          }]
        };
      }

      if (result.matches.length === 0) {
        return {
          content: [{ type: 'text', text: 'No matching MCPs found for: ' + task }]
        };
      }

      const lines = ['## Recommended MCPs\n'];
      for (const m of result.matches) {
        lines.push(`- **${m.name}** (score: ${m.score}) — ${m.description}`);
      }
      if (result.suggestedProfiles.length > 0) {
        lines.push('\n## Suggested Profiles\n');
        for (const p of result.suggestedProfiles) {
          lines.push(`- **${p.name}** — ${p.description} (${p.mcpServers.join(', ')})`);
        }
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // --- Tool: apply_profile ---
  server.tool(
    'apply_profile',
    {
      profile_name: z.string().describe('Profile name to apply'),
      dry_run: z.boolean().optional().default(false).describe('Preview without writing')
    },
    async ({ profile_name, dry_run }) => {
      const allProfiles = profiles.profiles;
      const profile = allProfiles[profile_name];
      if (!profile) {
        const available = Object.keys(allProfiles).join(', ');
        return {
          content: [{ type: 'text', text: `Profile '${profile_name}' not found. Available: ${available}` }]
        };
      }

      const mcpJsonPath = join(projectDir, '.mcp.json');
      const existing = await readMcpJson(mcpJsonPath);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `.mcp.json not found in ${projectDir}. Create one first or run init.` }]
        };
      }

      const result = await applyProfile(mcpJsonPath, profile, catalog, dry_run);

      const lines = [dry_run ? '## Dry Run Preview' : '## Profile Applied'];
      lines.push(`\nProfile: **${profile_name}**\n`);
      if (result.added.length > 0) lines.push(`Added: ${result.added.join(', ')}`);
      if (result.removed.length > 0) lines.push(`Removed: ${result.removed.join(', ')}`);
      if (result.warnings.length > 0) lines.push(`\nWarnings:\n${result.warnings.map(w => '- ' + w).join('\n')}`);
      if (!dry_run) lines.push('\nChanges will take effect in the next session.');

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // --- Tool: list_profiles ---
  server.tool(
    'list_profiles',
    {},
    async () => {
      const lines = ['## Available Profiles\n'];

      for (const [name, profile] of Object.entries(profiles.profiles)) {
        const servers = profile.mcpServers.join(', ') || '(none)';
        lines.push(`### ${name}`);
        lines.push(`${profile.description}`);
        lines.push(`MCPs: ${servers}\n`);
      }

      // Current state
      const mcpJsonPath = join(projectDir, '.mcp.json');
      const current = await readMcpJson(mcpJsonPath);
      if (current) {
        const active = Object.keys(current.mcpServers || {}).join(', ');
        lines.push(`---\n## Current .mcp.json\nActive MCPs: ${active}`);
      } else {
        lines.push(`---\n## Current .mcp.json\nNo .mcp.json found.`);
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // --- Tool: create_profile ---
  server.tool(
    'create_profile',
    {
      name: z.string().describe('Profile name'),
      description: z.string().describe('Profile description'),
      mcp_servers: z.array(z.string()).describe('List of MCP server names')
    },
    async ({ name, description, mcp_servers }) => {
      const profilesPath = join(userDataDir, 'profiles.json');

      try {
        const created = await createProfile(profilesPath, name, description, mcp_servers);
        // Reload profiles
        const userP = await loadProfiles(profilesPath);
        profiles = mergeProfiles(defaultProfiles, userP);

        return {
          content: [{ type: 'text', text: `Profile '${name}' created with MCPs: ${mcp_servers.join(', ')}` }]
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  // --- Tool: update_profile ---
  server.tool(
    'update_profile',
    {
      name: z.string().describe('Profile name to update'),
      description: z.string().optional().describe('New description'),
      add: z.array(z.string()).optional().describe('MCP servers to add'),
      remove: z.array(z.string()).optional().describe('MCP servers to remove')
    },
    async ({ name, description, add, remove }) => {
      const profilesPath = join(userDataDir, 'profiles.json');

      try {
        const updated = await updateProfile(profilesPath, name, { description, add, remove });
        const userP = await loadProfiles(profilesPath);
        profiles = mergeProfiles(defaultProfiles, userP);

        return {
          content: [{ type: 'text', text: `Profile '${name}' updated. MCPs: ${updated.mcpServers.join(', ')}` }]
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  // --- Tool: delete_profile ---
  server.tool(
    'delete_profile',
    {
      name: z.string().describe('Profile name to delete')
    },
    async ({ name }) => {
      const profilesPath = join(userDataDir, 'profiles.json');

      try {
        await deleteProfile(profilesPath, name, defaultProfileNames);
        const userP = await loadProfiles(profilesPath);
        profiles = mergeProfiles(defaultProfiles, userP);

        return { content: [{ type: 'text', text: `Profile '${name}' deleted.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  // --- Tool: init ---
  server.tool(
    'init',
    {},
    async () => {
      try {
        const result = await initFromMcpJson(projectDir);

        // Reload catalog and profiles
        const userCat = await loadCatalog(join(userDataDir, 'catalog.json'));
        catalog = mergeCatalogs(defaultCatalog, userCat);
        const userP = await loadProfiles(join(userDataDir, 'profiles.json'));
        profiles = mergeProfiles(defaultProfiles, userP);

        return {
          content: [{
            type: 'text',
            text: `Initialized .mcp-director/\nImported ${result.importedCount} MCP(s) from .mcp.json.\n\nTip: Add .mcp-director/ and .mcp.json.bak to .gitignore.`
          }]
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('mcp-director fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify server starts without error**

Run: `echo '{}' | timeout 2 node src/server.js 2>&1 || true`
Expected: no crash. May see MCP protocol errors (expected without a proper client), but no module-not-found or syntax errors.

- [ ] **Step 3: Run all tests**

Run: `node --test tests/`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server.js
git commit -m "feat: implement MCP server with all 7 tools"
```

---

### Task 8: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# mcp-director

A lightweight MCP server that recommends and manages MCP profiles for Claude Code.

## Problem

Claude Code loads all configured MCP servers at session start. With 20+ MCPs, startup is slow — but you only use 2-3 per session.

## Solution

**mcp-director** stays as your only always-on MCP. Tell it what you want to do, and it recommends the right MCPs and switches your `.mcp.json` profile.

## Install

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "mcp-director": {
      "command": "npx",
      "args": ["-y", "mcp-director"]
    }
  }
}
```

## Quick Start

1. **Initialize** — Import your existing MCPs into the director catalog:
   > "Run the init tool"

2. **Get recommendations** — Ask what MCPs you need:
   > "I want to create meeting notes" → recommends whisper, notebooklm-mcp

3. **Switch profiles** — Apply a profile to slim down your `.mcp.json`:
   > "Apply the development profile" → keeps only github, context7, playwright

4. **Restart session** — Changes take effect on next session start.

## Tools

| Tool | Description |
|------|-------------|
| `recommend` | Suggest MCPs for a task (supports `smart` mode for LLM-assisted matching) |
| `apply_profile` | Switch `.mcp.json` to a profile (with backup and dry-run) |
| `list_profiles` | Show available profiles and current state |
| `create_profile` | Create a custom profile |
| `update_profile` | Add/remove MCPs from a profile |
| `delete_profile` | Remove a custom profile |
| `init` | Import existing `.mcp.json` into director catalog |

## Profiles

Built-in profiles:

- **minimal** — Director only
- **development** — GitHub + Context7 + Playwright
- **research** — Context7 + Sequential Thinking
- **communication** — Slack + Linear
- **design** — Figma + Playwright
- **full** — All MCPs enabled

Create your own with `create_profile`.

## How It Works

- Bundled catalog of popular MCPs with keywords, categories, and capabilities
- `init` imports your existing MCPs into a local `.mcp-director/catalog.json`
- `recommend` scores MCPs against your task description
- `apply_profile` rewrites `.mcp.json` (with `.mcp.json.bak` backup)
- Director always preserves itself in `.mcp.json`

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `node --test tests/`
Expected: all tests PASS (catalog, matcher, profiles, init).

- [ ] **Step 2: Verify npx-style execution**

Run: `echo '{}' | timeout 2 node src/server.js 2>&1 || true`
Expected: server starts, no module errors.

- [ ] **Step 3: Check file structure matches spec**

Run: `find . -not -path './node_modules/*' -not -path './.git/*' -not -name '.DS_Store' | sort`
Expected output should match the planned file structure.

- [ ] **Step 4: Final commit (if any remaining changes)**

```bash
git status
# If clean, no commit needed
```
