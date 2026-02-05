import { nanoid } from 'nanoid';
import type { OSTCard, OSTTree, CardType, CardStatus } from '../types/ost.js';
import { DEFAULT_OST_TEMPLATE } from './ostExamples.js';
import { encodeStringToUrlFragment, decodeStringFromUrlFragment } from './urlEncoding.js';

/**
 * Markdown OST Format:
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

const LEVEL_TYPES: Record<number, CardType> = {
  2: 'outcome',
  3: 'opportunity',
  4: 'solution',
  5: 'experiment',
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
  level: number,
): Omit<ParsedCard, 'level' | 'description' | 'metrics'> | null {
  // Match: [Type] Title @status or [Type] Title (legacy {#id} is ignored)
  const typeMatch = content.match(/^\[(Outcome|Opportunity|Solution|Experiment)\]\s+/i);
  let type: CardType | null = null;
  let remaining = content;

  if (typeMatch) {
    type = typeMatch[1].toLowerCase() as CardType;
    remaining = content.slice(typeMatch[0].length);
  } else if (LEVEL_TYPES[level]) {
    type = LEVEL_TYPES[level];
  } else {
    return null;
  }

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
    name: 'My Opportunity Solution Tree',
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
      // H2-H5 are card headings
      const cardInfo = parseCardHeading(heading.content, heading.level);
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

export function serializeTreeToMarkdown(tree: OSTTree, name?: string): string {
  const lines: string[] = [];
  if (name) {
    lines.push(`# ${name}`);
    lines.push('');
  }

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
  return DEFAULT_OST_TEMPLATE;
}

/**
 * Share-link helpers
 *
 * Encodes markdown into a URL-safe fragment string.
 * We use base64url over UTF-8. (No compression; keeps deps at zero.)
 *
 * Typical use: `${location.pathname}#${encodeMarkdownToUrlFragment(markdown, name)}`
 */
export type ShareSettings = {
  layoutDirection?: 'vertical' | 'horizontal';
  experimentLayout?: 'horizontal' | 'vertical';
  viewDensity?: 'full' | 'compact';
};

type EncodedSettings = string;

const encodeCollapsedIds = (ids?: string[]): string | undefined => {
  if (!ids || ids.length === 0) return undefined;
  return ids.join('.');
};

const decodeCollapsedIds = (value?: string): string[] | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const ids = value
    .split('.')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length ? ids : undefined;
};

const encodeSettings = (settings?: ShareSettings): EncodedSettings | undefined => {
  if (!settings) return undefined;
  const layout =
    settings.layoutDirection === 'horizontal'
      ? 'h'
      : settings.layoutDirection === 'vertical'
        ? 'v'
        : '';
  const experiment =
    settings.experimentLayout === 'horizontal'
      ? 'h'
      : settings.experimentLayout === 'vertical'
        ? 'v'
        : '';
  const density =
    settings.viewDensity === 'compact' ? 'c' : settings.viewDensity === 'full' ? 'f' : '';
  const encoded = `${layout}${experiment}${density}`;
  return encoded.length ? encoded : undefined;
};

const decodeSettings = (value?: EncodedSettings): ShareSettings | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const [layoutChar, experimentChar, densityChar] = value.split('');
  const settings: ShareSettings = {};

  if (layoutChar === 'h') settings.layoutDirection = 'horizontal';
  if (layoutChar === 'v') settings.layoutDirection = 'vertical';

  if (experimentChar === 'h') settings.experimentLayout = 'horizontal';
  if (experimentChar === 'v') settings.experimentLayout = 'vertical';

  if (densityChar === 'c') settings.viewDensity = 'compact';
  if (densityChar === 'f') settings.viewDensity = 'full';

  return Object.keys(settings).length ? settings : undefined;
};

export function encodeMarkdownToUrlFragment(
  markdown: string,
  name?: string,
  settings?: ShareSettings,
  collapsedIds?: string[],
): string {
  const payload = JSON.stringify({
    v: 2,
    m: markdown,
    n: name || '',
    s: encodeSettings(settings),
    c: encodeCollapsedIds(collapsedIds),
  });
  return encodeStringToUrlFragment(payload);
}

/**
 * Decodes a URL fragment produced by `encodeMarkdownToUrlFragment`.
 * Returns `null` when decoding fails.
 */
export function decodeMarkdownFromUrlFragment(
  fragment: string,
): { markdown: string; name?: string; settings?: ShareSettings; collapsedIds?: string[] } | null {
  try {
    if (!fragment) return null;

    const decoded = decodeStringFromUrlFragment(fragment);
    if (!decoded) return null;

    try {
      const parsed = JSON.parse(decoded) as {
        v?: number;
        m?: string;
        n?: string;
        s?: ShareSettings | EncodedSettings;
        c?: string;
      };
      if (typeof parsed?.m === 'string') {
        const settings =
          parsed && typeof parsed.s === 'string'
            ? decodeSettings(parsed.s)
            : parsed && typeof parsed.s === 'object'
              ? parsed.s
              : undefined;
        const collapsedIds = decodeCollapsedIds(parsed.c);
        return { markdown: parsed.m, name: parsed.n || undefined, settings, collapsedIds };
      }
    } catch {
      // Fall through to legacy format.
    }

    return { markdown: decoded };
  } catch {
    return null;
  }
}
