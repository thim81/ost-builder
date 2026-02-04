import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  OSTCard,
  OSTTree,
  CardType,
  CardStatus,
  CanvasState,
  LayoutDirection,
} from '@/types/ost';
import {
  parseMarkdownToTree,
  serializeTreeToMarkdown,
  createDefaultMarkdown,
  encodeMarkdownToUrlFragment,
  decodeMarkdownFromUrlFragment,
} from '@/lib/markdownOST';

interface OSTStore {
  // Markdown is the source of truth
  markdown: string;
  // Derived tree (computed from markdown)
  tree: OSTTree;
  projectName: string;
  canvasState: CanvasState;
  layoutDirection: LayoutDirection;
  selectedCardId: string | null;
  editingCardId: string | null;

  // Card actions
  addCard: (type: CardType, parentId: string | null, title?: string) => string;
  updateCard: (id: string, updates: Partial<OSTCard>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, newParentId: string | null) => void;
  copyCard: (cardId: string) => string | null;
  copyCardWithChildren: (cardId: string) => string | null;

  // Selection
  selectCard: (id: string | null) => void;
  setEditingCard: (id: string | null) => void;

  // Canvas
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  setLayoutDirection: (direction: LayoutDirection) => void;
  toggleLayoutDirection: () => void;

  // Tree management
  resetTree: () => void;

  // Project name
  setProjectName: (name: string) => void;

  // Markdown operations
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  getShareLink: () => string;
  loadFromShareLink: (urlOrFragment: string) => boolean;
}

const defaultMarkdown = createDefaultMarkdown();
const defaultProjectName = 'My Opportunity Solution Tree';

const applyProjectNameToMarkdown = (markdown: string, name: string) => {
  const safeName = name.trim() || defaultProjectName;
  const lines = markdown.split('\n');
  const hasHeading = lines[0]?.startsWith('# ');
  if (hasHeading) {
    lines[0] = `# ${safeName}`;
    return lines.join('\n');
  }

  return [`# ${safeName}`, '', markdown].join('\n').trimStart();
};

const extractProjectNameFromMarkdown = (markdown: string) => {
  const firstLine = markdown.split('\n')[0]?.trim() || '';
  if (firstLine.startsWith('# ')) {
    const name = firstLine.slice(2).trim();
    return name || defaultProjectName;
  }
  return defaultProjectName;
};

export const useOSTStore = create<OSTStore>()(
  persist(
    (set, get) => ({
      markdown: defaultMarkdown,
      tree: parseMarkdownToTree(defaultMarkdown),
      projectName: defaultProjectName,
      canvasState: {
        zoom: 1,
        offset: { x: 0, y: 0 },
      },
      layoutDirection: 'vertical',
      selectedCardId: null,
      editingCardId: null,

      addCard: (type, parentId, title) => {
        const id = nanoid();
        const defaultTitles: Record<CardType, string> = {
          outcome: 'New Outcome',
          opportunity: 'New Opportunity',
          solution: 'New Solution',
          experiment: 'New Experiment',
        };

        set((state) => {
          const newCard: OSTCard = {
            id,
            type,
            title: title || defaultTitles[type],
            status: 'none',
            parentId,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const cards = { ...state.tree.cards, [id]: newCard };

          // Add to parent's children or root
          if (parentId && state.tree.cards[parentId]) {
            cards[parentId] = {
              ...state.tree.cards[parentId],
              children: [...state.tree.cards[parentId].children, id],
            };
          }

          const rootIds = parentId ? state.tree.rootIds : [...state.tree.rootIds, id];

          const newTree = { ...state.tree, cards, rootIds };
          const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

          return {
            tree: newTree,
            markdown: newMarkdown,
            editingCardId: id,
          };
        });

        return id;
      },

      updateCard: (id, updates) => {
        set((state) => {
          const newTree = {
            ...state.tree,
            cards: {
              ...state.tree.cards,
              [id]: {
                ...state.tree.cards[id],
                ...updates,
                updatedAt: new Date(),
              },
            },
          };
          const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

          return {
            tree: newTree,
            markdown: newMarkdown,
          };
        });
      },

      deleteCard: (id) => {
        set((state) => {
          const card = state.tree.cards[id];
          if (!card) return state;

          // Recursively collect all descendant IDs
          const getDescendants = (cardId: string): string[] => {
            const c = state.tree.cards[cardId];
            if (!c) return [];
            return [cardId, ...c.children.flatMap(getDescendants)];
          };

          const toDelete = new Set(getDescendants(id));
          const cards = { ...state.tree.cards };

          // Remove from parent's children
          if (card.parentId && cards[card.parentId]) {
            cards[card.parentId] = {
              ...cards[card.parentId],
              children: cards[card.parentId].children.filter((cid) => cid !== id),
            };
          }

          // Delete all cards
          toDelete.forEach((cid) => delete cards[cid]);

          // Remove from roots if applicable
          const rootIds = state.tree.rootIds.filter((rid) => !toDelete.has(rid));

          const newTree = { ...state.tree, cards, rootIds };
          const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

          return {
            tree: newTree,
            markdown: newMarkdown,
            selectedCardId:
              state.selectedCardId && toDelete.has(state.selectedCardId)
                ? null
                : state.selectedCardId,
          };
        });
      },

      moveCard: (cardId, newParentId) => {
        set((state) => {
          const card = state.tree.cards[cardId];
          if (!card) return state;

          // Prevent moving to itself or its descendants
          const isDescendant = (parentId: string, childId: string): boolean => {
            const parent = state.tree.cards[parentId];
            if (!parent) return false;
            if (parent.children.includes(childId)) return true;
            return parent.children.some((cid) => isDescendant(cid, childId));
          };

          if (newParentId && (newParentId === cardId || isDescendant(cardId, newParentId))) {
            return state;
          }

          const cards = { ...state.tree.cards };

          // Remove from old parent
          if (card.parentId && cards[card.parentId]) {
            cards[card.parentId] = {
              ...cards[card.parentId],
              children: cards[card.parentId].children.filter((cid) => cid !== cardId),
            };
          }

          // Add to new parent
          if (newParentId && cards[newParentId]) {
            cards[newParentId] = {
              ...cards[newParentId],
              children: [...cards[newParentId].children, cardId],
            };
          }

          // Update card's parentId
          cards[cardId] = {
            ...cards[cardId],
            parentId: newParentId,
            updatedAt: new Date(),
          };

          // Update root IDs
          let rootIds = state.tree.rootIds.filter((rid) => rid !== cardId);
          if (!newParentId) {
            rootIds = [...rootIds, cardId];
          }

          const newTree = { ...state.tree, cards, rootIds };
          const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

          return {
            tree: newTree,
            markdown: newMarkdown,
          };
        });
      },

      copyCard: (cardId) => {
        const state = get();
        const original = state.tree.cards[cardId];
        if (!original) return null;

        const id = nanoid();
        const copied: OSTCard = {
          ...original,
          id,
          children: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const cards = { ...state.tree.cards, [id]: copied };
        let rootIds = [...state.tree.rootIds];

        if (original.parentId && cards[original.parentId]) {
          const siblings = cards[original.parentId].children;
          const insertIndex = Math.max(0, siblings.indexOf(original.id) + 1);
          const nextChildren = [...siblings];
          nextChildren.splice(insertIndex, 0, id);
          cards[original.parentId] = {
            ...cards[original.parentId],
            children: nextChildren,
          };
        } else {
          const insertIndex = Math.max(0, rootIds.indexOf(original.id) + 1);
          rootIds.splice(insertIndex, 0, id);
        }

        const newTree = { ...state.tree, cards, rootIds };
        const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

        set({
          tree: newTree,
          markdown: newMarkdown,
        });

        return id;
      },

      copyCardWithChildren: (cardId) => {
        const state = get();
        const original = state.tree.cards[cardId];
        if (!original) return null;

        const cards = { ...state.tree.cards };

        const cloneSubtree = (sourceId: string, parentId: string | null): string => {
          const source = state.tree.cards[sourceId];
          const id = nanoid();
          const cloned: OSTCard = {
            ...source,
            id,
            parentId,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          cards[id] = cloned;

          const childIds = source.children.map((childId) => cloneSubtree(childId, id));
          cloned.children = childIds;

          return id;
        };

        const newRootId = cloneSubtree(original.id, original.parentId);
        let rootIds = [...state.tree.rootIds];

        if (original.parentId && cards[original.parentId]) {
          const siblings = cards[original.parentId].children;
          const insertIndex = Math.max(0, siblings.indexOf(original.id) + 1);
          const nextChildren = [...siblings];
          nextChildren.splice(insertIndex, 0, newRootId);
          cards[original.parentId] = {
            ...cards[original.parentId],
            children: nextChildren,
          };
        } else {
          const insertIndex = Math.max(0, rootIds.indexOf(original.id) + 1);
          rootIds.splice(insertIndex, 0, newRootId);
        }

        const newTree = { ...state.tree, cards, rootIds };
        const newMarkdown = serializeTreeToMarkdown(newTree, state.projectName);

        set({
          tree: newTree,
          markdown: newMarkdown,
        });

        return newRootId;
      },

      selectCard: (id) => set({ selectedCardId: id }),
      setEditingCard: (id) => set({ editingCardId: id }),

      setZoom: (zoom) =>
        set((state) => ({
          canvasState: { ...state.canvasState, zoom: Math.max(0.25, Math.min(2, zoom)) },
        })),

      setOffset: (x, y) =>
        set((state) => ({
          canvasState: { ...state.canvasState, offset: { x, y } },
        })),

      setLayoutDirection: (direction) => set({ layoutDirection: direction }),
      toggleLayoutDirection: () =>
        set((state) => ({
          layoutDirection: state.layoutDirection === 'vertical' ? 'horizontal' : 'vertical',
        })),

      setProjectName: (name) =>
        set((state) => {
          const nextName = name.trim() || defaultProjectName;
          const nextMarkdown = applyProjectNameToMarkdown(state.markdown, nextName);
          return {
            projectName: nextName,
            markdown: nextMarkdown,
            tree: parseMarkdownToTree(nextMarkdown),
          };
        }),

      resetTree: () => {
        const newMarkdown = createDefaultMarkdown();
        set({
          markdown: newMarkdown,
          tree: parseMarkdownToTree(newMarkdown),
          selectedCardId: null,
          editingCardId: null,
          canvasState: { zoom: 1, offset: { x: 0, y: 0 } },
          projectName: defaultProjectName,
        });
      },

      getMarkdown: () => get().markdown,
      getShareLink: () => {
        // URL fragment is client-side only and doesn't hit the server.
        // NOTE: long trees can still exceed browser URL limits.
        const fragment = encodeMarkdownToUrlFragment(get().markdown, get().projectName);

        // Use current location if available (browser), otherwise return fragment-only.
        if (typeof window !== 'undefined') {
          const base = `${window.location.origin}${window.location.pathname}`;
          return `${base}#${fragment}`;
        }

        return `#${fragment}`;
      },

      loadFromShareLink: (urlOrFragment: string) => {
        const fragment = (() => {
          // Accept full URL, '#fragment', or raw fragment.
          const trimmed = (urlOrFragment || '').trim();
          if (!trimmed) return '';
          const hashIdx = trimmed.indexOf('#');
          if (hashIdx >= 0) return trimmed.slice(hashIdx + 1);
          return trimmed;
        })();

        const decoded = decodeMarkdownFromUrlFragment(fragment);
        if (!decoded) return false;

        const rawMarkdown = decoded.markdown;
        const nextName = decoded.name || defaultProjectName;
        const nextMarkdown = applyProjectNameToMarkdown(rawMarkdown, nextName);
        const nextTree = parseMarkdownToTree(nextMarkdown);

        set({
          markdown: nextMarkdown,
          tree: nextTree,
          projectName: nextName,
          selectedCardId: null,
          editingCardId: null,
        });

        return true;
      },

      setMarkdown: (markdown: string) => {
        set({
          markdown,
          tree: parseMarkdownToTree(markdown),
          projectName: extractProjectNameFromMarkdown(markdown),
          selectedCardId: null,
          editingCardId: null,
        });
      },
    }),
    {
      name: 'ost-storage',
      partialize: (state) => ({
        markdown: state.markdown,
        projectName: state.projectName,
        layoutDirection: state.layoutDirection,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-parse tree from markdown on rehydration
        if (state && state.markdown) {
          state.tree = parseMarkdownToTree(state.markdown);
        }
        if (state && !state.projectName) {
          state.projectName = defaultProjectName;
        }
      },
    },
  ),
);
