import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Extract a guessed keyword from a package name or URL.
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
