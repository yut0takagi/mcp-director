#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadCatalog, mergeCatalogs } from './catalog.js';
import { recommend, buildLlmContext } from './matcher.js';
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
        await createProfile(profilesPath, name, description, mcp_servers);
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('mcp-director fatal:', err);
  process.exit(1);
});
