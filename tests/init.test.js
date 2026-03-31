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
