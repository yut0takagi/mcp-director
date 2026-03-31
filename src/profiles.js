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
 * Returns { added, removed, warnings, newContent } arrays.
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
