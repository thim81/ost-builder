import { nanoid } from 'nanoid';
import type { OSTCard, OSTTree, CardType, CardStatus } from '@/types/ost';

/**
 * Markdown OST Format:
 *
 * # Tree Name
 *
 * ## [Outcome] Title @status
 * Description text here
 * - start: 0
 * - current: 28
 * - target: 40
 *
 * ### [Opportunity] Title @status
 * Description text here
 *
 * #### [Solution] Title @status
 * Description text here
 *
 * ##### [Experiment] Title @status
 * Description text here
 */

const TYPE_PREFIXES: Record<CardType, string> = {
  outcome: '[Outcome]',
  opportunity: '[Opportunity]',
  solution: '[Solution]',
  experiment: '[Experiment]',
};

const HEADING_LEVELS: Record<CardType, number> = {
  outcome: 2,
  opportunity: 3,
  solution: 4,
  experiment: 5,
};

const STATUS_MAP: Record<string, CardStatus> = {
  'on-track': 'on-track',
  'at-risk': 'at-risk',
  next: 'next',
  done: 'done',
  none: 'none',
};

interface ParsedCard {
  id: string;
  type: CardType;
  title: string;
  description?: string;
  status: CardStatus;
  metrics?: {
    start: number;
    current: number;
    target: number;
  };
  level: number;
}

function parseHeadingLine(line: string): { level: number; content: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  return { level: match[1].length, content: match[2] };
}

function parseCardHeading(
  content: string,
): Omit<ParsedCard, 'level' | 'description' | 'metrics'> | null {
  // Match: [Type] Title @status or [Type] Title (legacy {#id} is ignored)
  const typeMatch = content.match(/^\[(Outcome|Opportunity|Solution|Experiment)\]\s+/i);
  if (!typeMatch) return null;

  const type = typeMatch[1].toLowerCase() as CardType;
  let remaining = content.slice(typeMatch[0].length);

  // Strip legacy ID tokens if present
  const idMatch = remaining.match(/\{#([^}]+)\}/);
  if (idMatch) {
    remaining = remaining.replace(idMatch[0], '').trim();
  }

  // Extract status if present
  let status: CardStatus = 'none';
  const statusMatch = remaining.match(/@(on-track|at-risk|next|done|none)$/i);
  if (statusMatch) {
    status = STATUS_MAP[statusMatch[1].toLowerCase()] || 'none';
    remaining = remaining.replace(statusMatch[0], '').trim();
  }

  const title = remaining.trim() || `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  return {
    id: '',
    type,
    title,
    status,
  };
}

function parseMetrics(
  lines: string[],
): { start: number; current: number; target: number } | undefined {
  const metrics: { start?: number; current?: number; target?: number } = {};

  for (const line of lines) {
    const startMatch = line.match(/^-\s*start:\s*(\d+(?:\.\d+)?)/i);
    const currentMatch = line.match(/^-\s*current:\s*(\d+(?:\.\d+)?)/i);
    const targetMatch = line.match(/^-\s*target:\s*(\d+(?:\.\d+)?)/i);

    if (startMatch) metrics.start = parseFloat(startMatch[1]);
    if (currentMatch) metrics.current = parseFloat(currentMatch[1]);
    if (targetMatch) metrics.target = parseFloat(targetMatch[1]);
  }

  if (
    metrics.start !== undefined ||
    metrics.current !== undefined ||
    metrics.target !== undefined
  ) {
    return {
      start: metrics.start ?? 0,
      current: metrics.current ?? 0,
      target: metrics.target ?? 0,
    };
  }

  return undefined;
}

export function parseMarkdownToTree(markdown: string): OSTTree {
  const lines = markdown.split('\n');
  const tree: OSTTree = {
    id: nanoid(),
    name: 'Untitled Tree',
    cards: {},
    rootIds: [],
  };

  const parentStack: { id: string; level: number; path: string; childCount: number }[] = [];
  let rootCount = 0;
  let currentCard: ParsedCard | null = null;
  let contentLines: string[] = [];

  const hashString = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 33) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  };

  const finalizeCard = () => {
    if (!currentCard) return;

    const descriptionLines = contentLines.filter(
      (line) => !line.match(/^-\s*(start|current|target):/i),
    );
    const metricsLines = contentLines.filter((line) => line.match(/^-\s*(start|current|target):/i));

    const description = descriptionLines.join('\n').trim() || undefined;
    const metrics = currentCard.type === 'outcome' ? parseMetrics(metricsLines) : undefined;

    // Find parent based on heading level
    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= currentCard.level
    ) {
      parentStack.pop();
    }
    const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
    const parentId = parentEntry ? parentEntry.id : null;
    const index = parentEntry ? parentEntry.childCount : rootCount;
    const path = parentEntry
      ? `${parentEntry.path}/${currentCard.type}.${index}`
      : `root.${index}/${currentCard.type}`;
    const id = `n_${hashString(`${path}|${currentCard.type}|${currentCard.title}`)}`;

    const card: OSTCard = {
      id,
      type: currentCard.type,
      title: currentCard.title,
      description,
      status: currentCard.status,
      parentId,
      children: [],
      metrics,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tree.cards[card.id] = card;

    if (parentId && tree.cards[parentId]) {
      tree.cards[parentId].children.push(card.id);
    } else {
      tree.rootIds.push(card.id);
    }

    if (parentEntry) {
      parentEntry.childCount += 1;
    } else {
      rootCount += 1;
    }

    parentStack.push({
      id: card.id,
      level: currentCard.level,
      path,
      childCount: 0,
    });
    currentCard = null;
    contentLines = [];
  };

  for (const line of lines) {
    const heading = parseHeadingLine(line);

    if (heading) {
      // H1 is the tree name
      if (heading.level === 1) {
        finalizeCard();
        tree.name = heading.content.trim();
        continue;
      }

      // H2-H5 are card headings
      const cardInfo = parseCardHeading(heading.content);
      if (cardInfo) {
        finalizeCard();
        currentCard = { ...cardInfo, level: heading.level };
      }
    } else if (currentCard) {
      // Non-heading lines are content for the current card
      contentLines.push(line);
    }
  }

  // Finalize the last card
  finalizeCard();

  return tree;
}

export function serializeTreeToMarkdown(tree: OSTTree): string {
  const lines: string[] = [];
  lines.push(`# ${tree.name}`);
  lines.push('');

  const serializeCard = (cardId: string) => {
    const card = tree.cards[cardId];
    if (!card) return;

    const level = HEADING_LEVELS[card.type];
    const prefix = TYPE_PREFIXES[card.type];
    const statusSuffix = card.status && card.status !== 'none' ? ` @${card.status}` : '';
    const heading = `${'#'.repeat(level)} ${prefix} ${card.title}${statusSuffix}`;

    lines.push(heading);

    if (card.description) {
      lines.push(card.description);
    }

    if (card.type === 'outcome' && card.metrics) {
      lines.push(`- start: ${card.metrics.start}`);
      lines.push(`- current: ${card.metrics.current}`);
      lines.push(`- target: ${card.metrics.target}`);
    }

    lines.push('');

    // Serialize children
    for (const childId of card.children) {
      serializeCard(childId);
    }
  };

  for (const rootId of tree.rootIds) {
    serializeCard(rootId);
  }

  return lines.join('\n');
}

export function createDefaultMarkdown(): string {
  return `# My Opportunity Solution Tree

## [Outcome] Increase user engagement by 40% @on-track
Our primary goal for Q1 2026
- start: 0
- current: 28
- target: 40

### [Opportunity] Users struggle to find relevant content quickly @next
Discovered through user interviews

#### [Solution] Add personalized content recommendations @on-track
ML-based recommendation engine

##### [Experiment] A/B test recommendation widget placement @next
Test sidebar vs. inline placement

### [Opportunity] Onboarding flow is too complex
High drop-off rate at step 3
`;
}

/**
 * Share-link helpers
 *
 * Encodes markdown into a URL-safe fragment string.
 * We use base64url over UTF-8. (No compression; keeps deps at zero.)
 *
 * Typical use: `${location.pathname}#${encodeMarkdownToUrlFragment(markdown)}`
 */
export function encodeMarkdownToUrlFragment(markdown: string): string {
  // Convert UTF-8 bytes -> base64
  const bytes = new TextEncoder().encode(markdown);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // base64url (RFC 4648)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Decodes a URL fragment produced by `encodeMarkdownToUrlFragment`.
 * Returns `null` when decoding fails.
 */
export function decodeMarkdownFromUrlFragment(fragment: string): string | null {
  try {
    if (!fragment) return null;

    // base64url -> base64
    let base64 = fragment.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to multiple of 4
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
