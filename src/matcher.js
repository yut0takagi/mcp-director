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
