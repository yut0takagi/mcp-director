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
