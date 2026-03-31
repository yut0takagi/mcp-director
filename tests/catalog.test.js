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
