import { describe, it, expect } from 'vitest';
import {
  parseMarkdownToTree,
  serializeTreeToMarkdown,
  encodeMarkdownToUrlFragment,
  decodeMarkdownFromUrlFragment,
} from '@ost-builder/shared';
import { encodeStringToUrlFragment } from '@ost-builder/shared';
import { DEFAULT_OST_TEMPLATE, OST_EXAMPLES } from '@ost-builder/shared';
import type { OSTTree, CardType, CardStatus } from '@ost-builder/shared';
import * as samples from './fixtures/ostMarkdownSamples';

// Helper functions for tests
const getFirstCard = (tree: OSTTree) => {
  return tree.cards[tree.rootIds[0]];
};

const countCardsByType = (tree: OSTTree, type: CardType): number => {
  return Object.values(tree.cards).filter((c) => c.type === type).length;
};

const getCardsByType = (tree: OSTTree, type: CardType) => {
  return Object.values(tree.cards).filter((c) => c.type === type);
};

const getAllCards = (tree: OSTTree) => {
  return Object.values(tree.cards);
};

describe('parseMarkdownToTree', () => {
  describe('basic card parsing', () => {
    it('should parse a single outcome card', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      expect(tree.rootIds).toHaveLength(1);
      const card = getFirstCard(tree);
      expect(card.type).toBe('outcome');
      expect(card.title).toBe('Test Outcome');
      expect(card.status).toBe('on-track');
      expect(card.description).toBe('Description text');
    });

    it('should parse a single opportunity card', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.opportunity);
      expect(tree.rootIds).toHaveLength(1);
      const card = getFirstCard(tree);
      expect(card.type).toBe('opportunity');
      expect(card.title).toBe('Test Opportunity');
      expect(card.status).toBe('next');
      expect(card.description).toBe('Description text');
    });

    it('should parse a single solution card', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.solution);
      expect(tree.rootIds).toHaveLength(1);
      const card = getFirstCard(tree);
      expect(card.type).toBe('solution');
      expect(card.title).toBe('Test Solution');
      expect(card.status).toBe('done');
      expect(card.description).toBe('Description text');
    });

    it('should parse a single experiment card', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.experiment);
      expect(tree.rootIds).toHaveLength(1);
      const card = getFirstCard(tree);
      expect(card.type).toBe('experiment');
      expect(card.title).toBe('Test Experiment');
      expect(card.status).toBe('at-risk');
      expect(card.description).toBe('Description text');
    });

    it('should generate valid card IDs', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      const card = getFirstCard(tree);
      expect(card.id).toBeTruthy();
      expect(typeof card.id).toBe('string');
      expect(card.id.length).toBeGreaterThan(0);
    });

    it('should set timestamps on cards', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      const card = getFirstCard(tree);
      expect(card.createdAt).toBeInstanceOf(Date);
      expect(card.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('status parsing', () => {
    it('should parse @on-track status', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.onTrack);
      const card = getFirstCard(tree);
      expect(card.status).toBe('on-track');
    });

    it('should parse @at-risk status', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.atRisk);
      const card = getFirstCard(tree);
      expect(card.status).toBe('at-risk');
    });

    it('should parse @next status', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.next);
      const card = getFirstCard(tree);
      expect(card.status).toBe('next');
    });

    it('should parse @done status', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.done);
      const card = getFirstCard(tree);
      expect(card.status).toBe('done');
    });

    it('should default to "none" status when not specified', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.none);
      const card = getFirstCard(tree);
      expect(card.status).toBe('none');
    });

    it('should handle case-insensitive status', () => {
      const markdown = '## [Outcome] Test @ON-TRACK\n';
      const tree = parseMarkdownToTree(markdown);
      const card = getFirstCard(tree);
      expect(card.status).toBe('on-track');
    });

    it('should ignore invalid status values', () => {
      const markdown = '## [Outcome] Test @invalid-status\n';
      const tree = parseMarkdownToTree(markdown);
      const card = getFirstCard(tree);
      expect(card.status).toBe('none');
    });

    it('should parse status at end of title', () => {
      const markdown = '## [Outcome] Title with spaces @next\n';
      const tree = parseMarkdownToTree(markdown);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Title with spaces');
      expect(card.status).toBe('next');
    });
  });

  describe('metrics parsing', () => {
    it('should parse complete metrics', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.complete);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(50);
      expect(card.metrics?.target).toBe(100);
    });

    it('should parse partial metrics (only start)', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.onlyStart);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(5);
      expect(card.metrics?.current).toBe(0);
      expect(card.metrics?.target).toBe(0);
    });

    it('should parse partial metrics (only current)', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.onlyCurrent);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(5);
      expect(card.metrics?.target).toBe(0);
    });

    it('should parse partial metrics (only target)', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.onlyTarget);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(0);
      expect(card.metrics?.target).toBe(5);
    });

    it('should parse decimal values', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.decimal);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0.5);
      expect(card.metrics?.current).toBe(12.75);
      expect(card.metrics?.target).toBe(25.0);
    });

    it('should handle zero values', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.zeroValues);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(0);
      expect(card.metrics?.target).toBe(0);
    });

    it('should ignore invalid metrics', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.invalid);
      const card = getFirstCard(tree);
      // Invalid values should not be parsed
      expect(card.metrics).toBeUndefined();
    });

    it('should handle case-insensitive metric names', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.mixedCase);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(50);
      expect(card.metrics?.target).toBe(100);
    });

    it('should only parse metrics for outcome cards', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.metricsOnNonOutcome);
      const card = getFirstCard(tree);
      expect(card.type).toBe('opportunity');
      expect(card.metrics).toBeUndefined();
    });

    it('should parse metrics with text around them', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.metricsWithExtraText);
      const card = getFirstCard(tree);
      expect(card.metrics).toBeDefined();
      expect(card.metrics?.start).toBe(0);
      expect(card.metrics?.current).toBe(50);
      expect(card.metrics?.target).toBe(100);
      // Text should be in description
      expect(card.description).toContain('Some text');
      expect(card.description).toContain('More text');
    });

    it('should not include metric lines in description', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.complete);
      const card = getFirstCard(tree);
      expect(card.description).toBe('Description');
      expect(card.description).not.toContain('start:');
      expect(card.description).not.toContain('current:');
      expect(card.description).not.toContain('target:');
    });
  });

  describe('hierarchy and nesting', () => {
    it('should parse two-level hierarchy', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.twoLevel);
      expect(tree.rootIds).toHaveLength(1);
      const parent = getFirstCard(tree);
      expect(parent.type).toBe('outcome');
      expect(parent.children).toHaveLength(1);
      const childId = parent.children[0];
      const child = tree.cards[childId];
      expect(child.type).toBe('opportunity');
      expect(child.parentId).toBe(parent.id);
    });

    it('should parse four-level hierarchy', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.fourLevel);
      expect(tree.rootIds).toHaveLength(1);
      const l1 = getFirstCard(tree);
      expect(l1.type).toBe('outcome');
      expect(l1.children).toHaveLength(1);

      const l2 = tree.cards[l1.children[0]];
      expect(l2.type).toBe('opportunity');
      expect(l2.parentId).toBe(l1.id);
      expect(l2.children).toHaveLength(1);

      const l3 = tree.cards[l2.children[0]];
      expect(l3.type).toBe('solution');
      expect(l3.parentId).toBe(l2.id);
      expect(l3.children).toHaveLength(1);

      const l4 = tree.cards[l3.children[0]];
      expect(l4.type).toBe('experiment');
      expect(l4.parentId).toBe(l3.id);
      expect(l4.children).toHaveLength(0);
    });

    it('should parse multiple siblings', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.multipleSiblings);
      expect(tree.rootIds).toHaveLength(1);
      const parent = getFirstCard(tree);
      expect(parent.children).toHaveLength(2);

      const child1 = tree.cards[parent.children[0]];
      const child2 = tree.cards[parent.children[1]];
      expect(child1.type).toBe('opportunity');
      expect(child2.type).toBe('opportunity');
      expect(child1.parentId).toBe(parent.id);
      expect(child2.parentId).toBe(parent.id);
    });

    it('should parse complex nested structure', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.complexNesting);
      expect(tree.rootIds).toHaveLength(1);
      const root = getFirstCard(tree);
      expect(root.children).toHaveLength(2);

      const opp1 = tree.cards[root.children[0]];
      expect(opp1.children).toHaveLength(2); // Two solutions

      const sol1 = tree.cards[opp1.children[0]];
      expect(sol1.children).toHaveLength(2); // Two experiments

      const opp2 = tree.cards[root.children[1]];
      expect(opp2.children).toHaveLength(1); // One solution
    });

    it('should handle multiple root cards', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.multipleRoots);
      expect(tree.rootIds).toHaveLength(2);
      const root1 = tree.cards[tree.rootIds[0]];
      const root2 = tree.cards[tree.rootIds[1]];
      expect(root1.parentId).toBeNull();
      expect(root2.parentId).toBeNull();
    });

    it('should handle skipped heading levels', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.skippedLevel);
      // Should still create the structure, even if unusual
      expect(tree.rootIds).toHaveLength(1);
      const root = getFirstCard(tree);
      expect(root.type).toBe('outcome');
      // The solution should be a child even though it skipped opportunity level
      expect(root.children).toHaveLength(1);
      const solution = tree.cards[root.children[0]];
      expect(solution.type).toBe('solution');
    });

    it('should generate consistent IDs based on position', () => {
      const tree1 = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.twoLevel);
      const tree2 = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.twoLevel);
      expect(tree1.rootIds[0]).toBe(tree2.rootIds[0]);
      const card1 = tree1.cards[tree1.rootIds[0]];
      const card2 = tree2.cards[tree2.rootIds[0]];
      expect(card1.id).toBe(card2.id);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.empty);
      expect(tree.rootIds).toHaveLength(0);
      expect(Object.keys(tree.cards)).toHaveLength(0);
    });

    it('should handle whitespace-only input', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.whitespaceOnly);
      expect(tree.rootIds).toHaveLength(0);
      expect(Object.keys(tree.cards)).toHaveLength(0);
    });

    it('should handle input with no valid cards', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.noValidCards);
      expect(tree.rootIds).toHaveLength(0);
      expect(Object.keys(tree.cards)).toHaveLength(0);
    });

    it('should handle Unicode in titles', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.unicodeTitle);
      const card = getFirstCard(tree);
      expect(card.title).toBe('测试标题 🎯');
      expect(card.description).toContain('Unicode content with 中文 and emoji ✅');
    });

    it('should handle special characters in titles', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.specialChars);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Test\'s "quotes" & <html>');
      expect(card.description).toContain('Special characters');
    });

    it('should strip legacy ID tokens', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.legacyId);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Test');
      expect(card.title).not.toContain('{#');
      expect(card.title).not.toContain('old-id');
    });

    it('should handle extra whitespace in titles', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.extraWhitespace);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Test');
      expect(card.status).toBe('on-track');
    });

    it('should handle missing title (use default)', () => {
      const tree = parseMarkdownToTree(samples.TITLE_SAMPLES.noTitle);
      const card = getFirstCard(tree);
      expect(card.title).toBe('New Outcome');
    });

    it('should handle very long titles', () => {
      const tree = parseMarkdownToTree(samples.TITLE_SAMPLES.longTitle);
      const card = getFirstCard(tree);
      expect(card.title).toContain('very long title');
      expect(card.title.length).toBeGreaterThan(50);
    });

    it('should handle titles with numbers', () => {
      const tree = parseMarkdownToTree(samples.TITLE_SAMPLES.titleWithNumbers);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Q1 2026 Test #123');
    });

    it('should handle titles with symbols', () => {
      const tree = parseMarkdownToTree(samples.TITLE_SAMPLES.titleWithSymbols);
      const card = getFirstCard(tree);
      expect(card.title).toBe('Test @ Work: Part 1 (v2.0)');
    });

    it('should handle titles with emoji', () => {
      const tree = parseMarkdownToTree(samples.TITLE_SAMPLES.titleWithEmoji);
      const card = getFirstCard(tree);
      expect(card.title).toBe('🎯 Goal for Q1 🚀');
    });

    it('should handle no description', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.noDescription);
      const card = getFirstCard(tree);
      expect(card.description).toBeUndefined();
    });

    it('should handle multiline descriptions', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.multilineDescription);
      const card = getFirstCard(tree);
      expect(card.description).toContain('First line');
      expect(card.description).toContain('Second line');
      expect(card.description).toContain('Third line');
    });

    it('should handle descriptions with bullets', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.descriptionWithBullets);
      const card = getFirstCard(tree);
      expect(card.description).toContain('- Not a metric');
      expect(card.description).toContain('- Just text');
    });

    it('should handle descriptions with code', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.descriptionWithCode);
      const card = getFirstCard(tree);
      expect(card.description).toContain('```javascript');
      expect(card.description).toContain('const x = 1;');
    });

    it('should handle descriptions with markdown', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.descriptionWithMarkdown);
      const card = getFirstCard(tree);
      expect(card.description).toContain('**Bold text**');
      expect(card.description).toContain('[Link](https://example.com)');
    });
  });

  describe('ID generation stability', () => {
    it('should generate same IDs for same input', () => {
      const markdown = samples.FULL_EXAMPLES.simpleTree;
      const tree1 = parseMarkdownToTree(markdown);
      const tree2 = parseMarkdownToTree(markdown);

      expect(tree1.rootIds).toEqual(tree2.rootIds);
      expect(Object.keys(tree1.cards).sort()).toEqual(Object.keys(tree2.cards).sort());
    });

    it('should generate different IDs for different content', () => {
      const md1 = '## [Outcome] Title A\n';
      const md2 = '## [Outcome] Title B\n';
      const tree1 = parseMarkdownToTree(md1);
      const tree2 = parseMarkdownToTree(md2);

      expect(tree1.rootIds[0]).not.toBe(tree2.rootIds[0]);
    });

    it('should generate different IDs for different positions', () => {
      const md = `## [Outcome] Same Title
### [Opportunity] Same Title
`;
      const tree = parseMarkdownToTree(md);
      const cards = getAllCards(tree);
      const ids = cards.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length); // All unique
    });
  });
});

describe('serializeTreeToMarkdown', () => {
  describe('basic serialization', () => {
    it('should serialize a single card', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('## [Outcome] Test Outcome @on-track');
      expect(markdown).toContain('Description text');
      expect(markdown).toContain('- start: 0');
      expect(markdown).toContain('- current: 5');
      expect(markdown).toContain('- target: 10');
    });

    it('should use correct heading levels', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.fourLevel);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('## [Outcome]');
      expect(markdown).toContain('### [Opportunity]');
      expect(markdown).toContain('#### [Solution]');
      expect(markdown).toContain('##### [Experiment]');
    });

    it('should preserve hierarchy', () => {
      const tree = parseMarkdownToTree(samples.HIERARCHY_SAMPLES.complexNesting);
      const markdown = serializeTreeToMarkdown(tree);
      const reparsed = parseMarkdownToTree(markdown);
      expect(reparsed.rootIds).toHaveLength(tree.rootIds.length);
      expect(Object.keys(reparsed.cards)).toHaveLength(Object.keys(tree.cards).length);
    });

    it('should include status markers', () => {
      const markdown = `## [Outcome] Test @on-track
### [Opportunity] Test @next
#### [Solution] Test @done
##### [Experiment] Test @at-risk
`;
      const tree = parseMarkdownToTree(markdown);
      const serialized = serializeTreeToMarkdown(tree);
      expect(serialized).toContain('@on-track');
      expect(serialized).toContain('@next');
      expect(serialized).toContain('@done');
      expect(serialized).toContain('@at-risk');
    });

    it('should omit status when "none"', () => {
      const tree = parseMarkdownToTree(samples.STATUS_SAMPLES.none);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).not.toContain('@none');
    });

    it('should include metrics for outcome cards', () => {
      const tree = parseMarkdownToTree(samples.METRICS_SAMPLES.complete);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('- start: 0');
      expect(markdown).toContain('- current: 50');
      expect(markdown).toContain('- target: 100');
    });

    it('should not include metrics for non-outcome cards', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.opportunity);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).not.toContain('- start:');
      expect(markdown).not.toContain('- current:');
      expect(markdown).not.toContain('- target:');
    });

    it('should handle empty tree', () => {
      const tree: OSTTree = {
        id: 'test',
        name: 'Test',
        cards: {},
        rootIds: [],
      };
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toBe('');
    });
  });

  describe('with optional name parameter', () => {
    it('should include H1 title when name provided', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      const markdown = serializeTreeToMarkdown(tree, 'My Custom Name');
      expect(markdown).toContain('# My Custom Name');
      expect(markdown.indexOf('# My Custom Name')).toBe(0);
    });

    it('should not include H1 when name not provided', () => {
      const tree = parseMarkdownToTree(samples.MINIMAL_SAMPLES.outcome);
      const markdown = serializeTreeToMarkdown(tree);
      // Should start with ## (not just #), meaning no H1
      expect(markdown.trimStart().startsWith('##')).toBe(true);
      expect(markdown.trimStart().startsWith('# ')).toBe(false);
    });
  });

  describe('special characters', () => {
    it('should preserve Unicode characters', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.unicodeTitle);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('测试标题 🎯');
      expect(markdown).toContain('中文');
    });

    it('should preserve special characters in titles', () => {
      const tree = parseMarkdownToTree(samples.EDGE_CASE_SAMPLES.specialChars);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('Test\'s "quotes" & <html>');
    });

    it('should preserve markdown in descriptions', () => {
      const tree = parseMarkdownToTree(samples.DESCRIPTION_SAMPLES.descriptionWithMarkdown);
      const markdown = serializeTreeToMarkdown(tree);
      expect(markdown).toContain('**Bold text**');
      expect(markdown).toContain('[Link](https://example.com)');
    });
  });
});

describe('encodeMarkdownToUrlFragment', () => {
  describe('basic encoding', () => {
    it('should encode markdown without name', () => {
      const markdown = samples.MINIMAL_SAMPLES.outcome;
      const fragment = encodeMarkdownToUrlFragment(markdown);
      expect(fragment).toBeTruthy();
      expect(typeof fragment).toBe('string');
      expect(fragment).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should encode markdown with name', () => {
      const markdown = samples.MINIMAL_SAMPLES.outcome;
      const fragment = encodeMarkdownToUrlFragment(markdown, 'My Tree');
      expect(fragment).toBeTruthy();
      expect(typeof fragment).toBe('string');
    });

    it('should encode empty markdown', () => {
      const fragment = encodeMarkdownToUrlFragment('');
      expect(fragment).toBeTruthy();
    });

    it('should produce URL-safe output', () => {
      const markdown = samples.FULL_EXAMPLES.simpleTree;
      const fragment = encodeMarkdownToUrlFragment(markdown, 'Test Name 测试');
      expect(fragment).not.toContain('+');
      expect(fragment).not.toContain('/');
      expect(fragment).not.toContain('=');
      expect(fragment).not.toContain(' ');
    });
  });

  describe('large content', () => {
    it('should encode large markdown', () => {
      const largeMarkdown = samples.MINIMAL_SAMPLES.outcome.repeat(100);
      const fragment = encodeMarkdownToUrlFragment(largeMarkdown);
      expect(fragment).toBeTruthy();
      expect(fragment.length).toBeGreaterThan(1000);
    });
  });
});

describe('decodeMarkdownFromUrlFragment', () => {
  describe('current format', () => {
    it('should decode markdown without name', () => {
      const original = samples.MINIMAL_SAMPLES.outcome;
      const fragment = encodeMarkdownToUrlFragment(original);
      const decoded = decodeMarkdownFromUrlFragment(fragment);
      expect(decoded).not.toBeNull();
      expect(decoded?.markdown).toBe(original);
      expect(decoded?.name).toBeUndefined();
    });

    it('should decode markdown with name', () => {
      const original = samples.MINIMAL_SAMPLES.outcome;
      const name = 'My Tree Name';
      const fragment = encodeMarkdownToUrlFragment(original, name);
      const decoded = decodeMarkdownFromUrlFragment(fragment);
      expect(decoded).not.toBeNull();
      expect(decoded?.markdown).toBe(original);
      expect(decoded?.name).toBe(name);
    });

    it('should decode markdown with empty name', () => {
      const original = samples.MINIMAL_SAMPLES.outcome;
      const fragment = encodeMarkdownToUrlFragment(original, '');
      const decoded = decodeMarkdownFromUrlFragment(fragment);
      expect(decoded).not.toBeNull();
      expect(decoded?.markdown).toBe(original);
    });
  });

  describe('legacy format', () => {
    it('should decode legacy format (plain markdown)', () => {
      const original = samples.MINIMAL_SAMPLES.outcome;
      // Encode as plain string (legacy format - no JSON wrapper)
      const fragment = encodeStringToUrlFragment(original);
      const decoded = decodeMarkdownFromUrlFragment(fragment);
      expect(decoded).not.toBeNull();
      expect(decoded?.markdown).toBe(original);
      expect(decoded?.name).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should return null for empty fragment', () => {
      const decoded = decodeMarkdownFromUrlFragment('');
      expect(decoded).toBeNull();
    });

    it('should return null for invalid fragment', () => {
      const decoded = decodeMarkdownFromUrlFragment('!!!invalid!!!');
      expect(decoded).toBeNull();
    });

    it('should return null for corrupted fragment', () => {
      const decoded = decodeMarkdownFromUrlFragment('abc123!@#$%^');
      expect(decoded).toBeNull();
    });
  });
});

describe('markdown roundtrip', () => {
  it('should roundtrip single card', () => {
    const original = samples.MINIMAL_SAMPLES.outcome;
    const tree = parseMarkdownToTree(original);
    const reserialized = serializeTreeToMarkdown(tree);
    const tree2 = parseMarkdownToTree(reserialized);

    expect(tree2.rootIds.length).toBe(tree.rootIds.length);
    expect(Object.keys(tree2.cards).length).toBe(Object.keys(tree.cards).length);
  });

  it('should roundtrip simple tree', () => {
    const original = samples.FULL_EXAMPLES.simpleTree;
    const tree = parseMarkdownToTree(original);
    const reserialized = serializeTreeToMarkdown(tree);
    const tree2 = parseMarkdownToTree(reserialized);

    expect(tree2.rootIds.length).toBe(tree.rootIds.length);
    expect(countCardsByType(tree2, 'outcome')).toBe(countCardsByType(tree, 'outcome'));
    expect(countCardsByType(tree2, 'opportunity')).toBe(countCardsByType(tree, 'opportunity'));
    expect(countCardsByType(tree2, 'solution')).toBe(countCardsByType(tree, 'solution'));
    expect(countCardsByType(tree2, 'experiment')).toBe(countCardsByType(tree, 'experiment'));
  });

  it('should roundtrip complex nesting', () => {
    const original = samples.HIERARCHY_SAMPLES.complexNesting;
    const tree = parseMarkdownToTree(original);
    const reserialized = serializeTreeToMarkdown(tree);
    const tree2 = parseMarkdownToTree(reserialized);

    const root1 = tree.cards[tree.rootIds[0]];
    const root2 = tree2.cards[tree2.rootIds[0]];
    expect(root2.children.length).toBe(root1.children.length);
  });

  it('should roundtrip with name parameter', () => {
    const original = samples.FULL_EXAMPLES.simpleTree;
    const tree = parseMarkdownToTree(original);
    const reserialized = serializeTreeToMarkdown(tree, 'Test Name');
    const tree2 = parseMarkdownToTree(reserialized);

    expect(tree2.rootIds.length).toBe(tree.rootIds.length);
  });

  it('should preserve Unicode and emoji', () => {
    const original = samples.EDGE_CASE_SAMPLES.unicodeTitle;
    const tree = parseMarkdownToTree(original);
    const reserialized = serializeTreeToMarkdown(tree);
    expect(reserialized).toContain('测试标题 🎯');
    expect(reserialized).toContain('✅');
  });
});

describe('URL encoding roundtrip', () => {
  it('should roundtrip via URL encoding', () => {
    const original = samples.MINIMAL_SAMPLES.outcome;
    const fragment = encodeMarkdownToUrlFragment(original);
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded?.markdown).toBe(original);
  });

  it('should roundtrip with name', () => {
    const original = samples.MINIMAL_SAMPLES.outcome;
    const name = 'My Tree';
    const fragment = encodeMarkdownToUrlFragment(original, name);
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded?.markdown).toBe(original);
    expect(decoded?.name).toBe(name);
  });

  it('should roundtrip complex tree', () => {
    const original = samples.FULL_EXAMPLES.simpleTree;
    const fragment = encodeMarkdownToUrlFragment(original, 'Complex Test');
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded?.markdown).toBe(original);
    expect(decoded?.name).toBe('Complex Test');
  });

  it('should roundtrip Unicode content', () => {
    const original = samples.EDGE_CASE_SAMPLES.unicodeTitle;
    const fragment = encodeMarkdownToUrlFragment(original, '测试名称');
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded?.markdown).toBe(original);
    expect(decoded?.name).toBe('测试名称');
  });
});

describe('full workflow integration', () => {
  it('should handle full parse-serialize-encode-decode cycle', () => {
    const original = samples.FULL_EXAMPLES.simpleTree;
    const tree = parseMarkdownToTree(original);
    const serialized = serializeTreeToMarkdown(tree, 'Test Tree');
    const fragment = encodeMarkdownToUrlFragment(serialized, 'Test Tree');
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded).not.toBeNull();
    const tree2 = parseMarkdownToTree(decoded!.markdown);

    expect(tree2.rootIds.length).toBe(tree.rootIds.length);
    expect(Object.keys(tree2.cards).length).toBe(Object.keys(tree.cards).length);
  });

  it.each(OST_EXAMPLES)('should handle OST example: $name', ({ markdown, name }) => {
    const tree = parseMarkdownToTree(markdown);
    const serialized = serializeTreeToMarkdown(tree, name);
    const fragment = encodeMarkdownToUrlFragment(serialized, name);
    const decoded = decodeMarkdownFromUrlFragment(fragment);

    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(name);
    const tree2 = parseMarkdownToTree(decoded!.markdown);
    expect(tree2.rootIds.length).toBe(tree.rootIds.length);
  });

  it('should handle DEFAULT_OST_TEMPLATE', () => {
    const tree = parseMarkdownToTree(DEFAULT_OST_TEMPLATE);
    expect(tree.rootIds.length).toBeGreaterThan(0);
    expect(Object.keys(tree.cards).length).toBeGreaterThan(0);

    const serialized = serializeTreeToMarkdown(tree);
    const fragment = encodeMarkdownToUrlFragment(serialized);
    const decoded = decodeMarkdownFromUrlFragment(fragment);
    expect(decoded).not.toBeNull();
  });

  it('should preserve card counts through full cycle', () => {
    const original = samples.HIERARCHY_SAMPLES.complexNesting;
    const tree1 = parseMarkdownToTree(original);
    const serialized = serializeTreeToMarkdown(tree1);
    const tree2 = parseMarkdownToTree(serialized);

    expect(countCardsByType(tree2, 'outcome')).toBe(countCardsByType(tree1, 'outcome'));
    expect(countCardsByType(tree2, 'opportunity')).toBe(countCardsByType(tree1, 'opportunity'));
    expect(countCardsByType(tree2, 'solution')).toBe(countCardsByType(tree1, 'solution'));
    expect(countCardsByType(tree2, 'experiment')).toBe(countCardsByType(tree1, 'experiment'));
  });

  it('should preserve hierarchy through full cycle', () => {
    const original = samples.HIERARCHY_SAMPLES.fourLevel;
    const tree1 = parseMarkdownToTree(original);
    const serialized = serializeTreeToMarkdown(tree1);
    const tree2 = parseMarkdownToTree(serialized);

    const root1 = tree1.cards[tree1.rootIds[0]];
    const root2 = tree2.cards[tree2.rootIds[0]];

    expect(root2.children.length).toBe(root1.children.length);

    if (root1.children.length > 0) {
      const child1 = tree1.cards[root1.children[0]];
      const child2 = tree2.cards[root2.children[0]];
      expect(child2.children.length).toBe(child1.children.length);
    }
  });
});
