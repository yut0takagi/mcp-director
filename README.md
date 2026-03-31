# mcp-director

A lightweight MCP server that recommends and manages MCP profiles for Claude Code.

## Problem

Claude Code loads all configured MCP servers at session start. With 20+ MCPs, startup is slow — but you only use 2-3 per session.

## Solution

**mcp-director** stays as your only always-on MCP. Tell it what you want to do, and it recommends the right MCPs and switches your `.mcp.json` profile.

## Install

Add `mcp-director` to your project's `.mcp.json` (create the file in your project root if it doesn't exist):

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

Then start (or restart) your Claude Code session. `mcp-director` will be available as an MCP tool.

> **Note:** No global install needed. `npx` downloads and runs it automatically.

## Usage

Once Claude Code starts with `mcp-director` configured, just talk to Claude naturally:

### 1. Initialize — Import your existing MCPs

> "Run the init tool"

This reads your current `.mcp.json` and imports all MCPs into `.mcp-director/catalog.json` so the director knows about them.

### 2. Get recommendations

> "I want to create meeting notes"

Claude will call `recommend` and suggest relevant MCPs (e.g. whisper, notebooklm-mcp) along with matching profiles.

> "I need to do some web research"

Use `smart` mode for LLM-assisted matching:
> "Recommend MCPs for building a dashboard, use smart mode"

### 3. Switch profiles

> "Apply the development profile"

This rewrites your `.mcp.json` to only include github, context7, and playwright. A backup is saved as `.mcp.json.bak`.

> "Show me what the design profile would look like" (dry-run)

### 4. Restart session

Changes to `.mcp.json` take effect on the **next** Claude Code session start.

### 5. Create custom profiles

> "Create a profile called 'data-work' with filesystem and sequential-thinking"

> "Add exa to the research profile"

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

| Profile | MCPs |
|---------|------|
| **minimal** | Director only |
| **development** | GitHub + Context7 + Playwright |
| **research** | Exa + Context7 + Sequential Thinking |
| **meeting-notes** | Whisper + NotebookLM + Filesystem |
| **communication** | Slack + Google Calendar + Linear |
| **design** | Figma + Playwright |
| **automation** | n8n + Filesystem |
| **full** | All MCPs enabled |

Create your own with `create_profile`.

## Bundled Catalog

16 popular MCPs are included out of the box:

`github` `playwright` `context7` `memory` `filesystem` `sequential-thinking` `slack` `figma` `linear` `whisper` `notebooklm-mcp` `exa` `google-calendar` `screenpipe` `n8n-mcp`

Add your own MCPs by running `init` or editing `.mcp-director/catalog.json`.

## How It Works

- Bundled catalog of popular MCPs with keywords, categories, and capabilities
- `init` imports your existing MCPs into a local `.mcp-director/catalog.json`
- `recommend` scores MCPs against your task description
- `apply_profile` rewrites `.mcp.json` (with `.mcp.json.bak` backup)
- Director always preserves itself in `.mcp.json`

## License

MIT
