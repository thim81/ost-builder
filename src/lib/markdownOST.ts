import { nanoid } from 'nanoid';
import type { OSTCard, OSTTree, CardType, CardStatus } from '@/types/ost';

/**
 * Markdown OST Format:
 * 
 * # Tree Name
 * 
 * ## [Outcome] Title {#id} @status
 * Description text here
 * - start: 0
 * - current: 28  
 * - target: 40
 * 
 * ### [Opportunity] Title {#id} @status
 * Description text here
 * 
 * #### [Solution] Title {#id} @status
 * Description text here
 * 
 * ##### [Experiment] Title {#id} @status
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
  'next': 'next',
  'done': 'done',
  'none': 'none',
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

function parseCardHeading(content: string): Omit<ParsedCard, 'level' | 'description' | 'metrics'> | null {
  // Match: [Type] Title {#id} @status or [Type] Title @status or [Type] Title {#id} or [Type] Title
  const typeMatch = content.match(/^\[(Outcome|Opportunity|Solution|Experiment)\]\s+/i);
  if (!typeMatch) return null;

  const type = typeMatch[1].toLowerCase() as CardType;
  let remaining = content.slice(typeMatch[0].length);

  // Extract ID if present
  let id: string | null = null;
  const idMatch = remaining.match(/\{#([^}]+)\}/);
  if (idMatch) {
    id = idMatch[1];
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
    id: id || nanoid(),
    type,
    title,
    status,
  };
}

function parseMetrics(lines: string[]): { start: number; current: number; target: number } | undefined {
  const metrics: { start?: number; current?: number; target?: number } = {};
  
  for (const line of lines) {
    const startMatch = line.match(/^-\s*start:\s*(\d+(?:\.\d+)?)/i);
    const currentMatch = line.match(/^-\s*current:\s*(\d+(?:\.\d+)?)/i);
    const targetMatch = line.match(/^-\s*target:\s*(\d+(?:\.\d+)?)/i);

    if (startMatch) metrics.start = parseFloat(startMatch[1]);
    if (currentMatch) metrics.current = parseFloat(currentMatch[1]);
    if (targetMatch) metrics.target = parseFloat(targetMatch[1]);
  }

  if (metrics.start !== undefined || metrics.current !== undefined || metrics.target !== undefined) {
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

  const parentStack: { id: string; level: number }[] = [];
  let currentCard: ParsedCard | null = null;
  let contentLines: string[] = [];

  const finalizeCard = () => {
    if (!currentCard) return;

    const descriptionLines = contentLines.filter(
      (line) => !line.match(/^-\s*(start|current|target):/i)
    );
    const metricsLines = contentLines.filter((line) =>
      line.match(/^-\s*(start|current|target):/i)
    );

    const description = descriptionLines.join('\n').trim() || undefined;
    const metrics = currentCard.type === 'outcome' ? parseMetrics(metricsLines) : undefined;

    // Find parent based on heading level
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= currentCard.level) {
      parentStack.pop();
    }
    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

    const card: OSTCard = {
      id: currentCard.id,
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

    parentStack.push({ id: card.id, level: currentCard.level });
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
    const heading = `${'#'.repeat(level)} ${prefix} ${card.title} {#${card.id}}${statusSuffix}`;
    
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
