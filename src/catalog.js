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
