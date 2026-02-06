import { createShareLink, jsonResponse, withCors } from '../../_share';
import { serializeTreeToMarkdown } from '../../../src/lib/markdownOST';
import type { OSTTree, OSTCard } from '../../../src/types/ost';

type JsonBody = {
  tree?: OSTTree;
  name?: string;
  baseUrl?: string;
};

function normalizeTree(tree: OSTTree): OSTTree {
  const cards: Record<string, OSTCard> = { ...tree.cards };
  const rootIds = Array.isArray(tree.rootIds) ? [...tree.rootIds] : [];

  for (const card of Object.values(cards)) {
    card.children = Array.isArray(card.children) ? [...card.children] : [];
  }

  for (const card of Object.values(cards)) {
    if (card.parentId && cards[card.parentId]) {
      if (!cards[card.parentId].children.includes(card.id)) {
        cards[card.parentId].children.push(card.id);
      }
    } else if (card.parentId === null) {
      if (!rootIds.includes(card.id)) rootIds.push(card.id);
    }
  }

  if (rootIds.length === 0) {
    for (const card of Object.values(cards)) {
      if (!card.parentId) rootIds.push(card.id);
    }
  }

  return {
    ...tree,
    cards,
    rootIds,
  };
}

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: withCors() });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = (await request.json().catch(() => null)) as JsonBody | null;
  const tree = body?.tree;
  if (!tree || !tree.cards) {
    return jsonResponse({ error: 'Missing OST tree data' }, 400);
  }

  const normalized = normalizeTree(tree);
  const markdown = serializeTreeToMarkdown(normalized, body?.name || tree.name);

  const { link, fragment } = createShareLink({
    markdown,
    name: body?.name || tree.name,
    baseUrl: body?.baseUrl,
    requestUrl: request.url,
  });

  return jsonResponse({ link, fragment, name: body?.name || tree.name || null });
}
