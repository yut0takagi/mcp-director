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
