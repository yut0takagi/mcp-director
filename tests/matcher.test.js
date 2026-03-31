import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMatch, recommend, buildLlmContext } from '../src/matcher.js';

const testCatalog = {
  mcpServers: {
    whisper: {
      description: '音声ファイルの文字起こし',
      category: '音声・メディア',
      keywords: ['文字起こし', '音声', 'transcribe', 'whisper', '録音'],
      capabilities: ['音声文字起こし', 'モデル管理']
    },
    github: {
      description: 'GitHub API integration',
      category: 'Development',
      keywords: ['github', 'PR', 'issue', 'code'],
      capabilities: ['PR creation', 'Issue management']
    },
    playwright: {
      description: 'Browser automation and testing',
      category: 'Web & Browser',
      keywords: ['browser', 'test', 'screenshot', 'ブラウザ'],
      capabilities: ['Page navigation', 'Screenshot']
    }
  }
};

const testProfiles = {
  profiles: {
    development: {
      description: 'Development',
      mcpServers: ['github', 'playwright']
    }
  }
};

describe('matcher', () => {
  describe('scoreMatch', () => {
    it('should score keyword exact match at 3 points', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['whisper']);
      assert.ok(score >= 3);
    });

    it('should score keyword partial match at 2 points', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['文字']);
      assert.ok(score >= 2);
    });

    it('should score description partial match at 1 point', () => {
      const entry = testCatalog.mcpServers.github;
      const score = scoreMatch(entry, ['API']);
      assert.ok(score >= 1);
    });

    it('should return 0 for no match', () => {
      const entry = testCatalog.mcpServers.github;
      const score = scoreMatch(entry, ['カレンダー']);
      assert.equal(score, 0);
    });

    it('should handle Japanese input', () => {
      const entry = testCatalog.mcpServers.whisper;
      const score = scoreMatch(entry, ['音声']);
      assert.ok(score >= 3);
    });
  });

  describe('recommend', () => {
    it('should return matched MCPs sorted by score descending', () => {
      const results = recommend(testCatalog, testProfiles, 'github PR');
      assert.ok(results.matches.length > 0);
      assert.equal(results.matches[0].name, 'github');
    });

    it('should include matching profiles', () => {
      const results = recommend(testCatalog, testProfiles, 'github browser test');
      const profileNames = results.suggestedProfiles.map(p => p.name);
      assert.ok(profileNames.includes('development'));
    });

    it('should return empty for no match', () => {
      const results = recommend(testCatalog, testProfiles, 'xyz123nonsense');
      assert.equal(results.matches.length, 0);
    });
  });

  describe('buildLlmContext', () => {
    it('should return structured context string with catalog summary', () => {
      const context = buildLlmContext(testCatalog, '議事録を作りたい');
      assert.ok(context.includes('whisper'));
      assert.ok(context.includes('github'));
      assert.ok(context.includes('議事録を作りたい'));
    });
  });
});
