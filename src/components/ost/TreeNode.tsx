import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OSTCard, CardType } from '@/types/ost';
import { useOSTStore } from '@/store/ostStore';
import { OSTCard as OSTCardComponent } from './OSTCard';
import { AddCardButton } from './AddCardButton';
import { useState } from 'react';

interface TreeNodeProps {
  cardId: string;
  depth?: number;
}

const childTypeMap: Record<CardType, CardType> = {
  outcome: 'opportunity',
  opportunity: 'solution',
  solution: 'experiment',
  experiment: 'experiment', // Can't add children to experiments
};

export function TreeNode({ cardId, depth = 0 }: TreeNodeProps) {
  const { tree, addCard } = useOSTStore();
  const card = tree.cards[cardId];
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${cardId}`,
    data: { cardId, type: card?.type },
  });

  const children = useMemo(() => {
    if (!card) return [];
    return card.children
      .map((id) => tree.cards[id])
      .filter(Boolean) as OSTCard[];
  }, [card, tree.cards]);

  if (!card) return null;

  const canAddChildren = card.type !== 'experiment';
  const childType = childTypeMap[card.type];

  const handleAddChild = () => {
    addCard(childType, card.id);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className="relative">
        <OSTCardComponent card={card} />

        {/* Collapse button */}
        {children.length > 0 && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-10"
          >
            {isCollapsed ? (
              <span className="text-xs font-semibold text-muted-foreground">
                {children.length}
              </span>
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Connector line and children */}
      <AnimatePresence>
        {!isCollapsed && (children.length > 0 || canAddChildren) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center"
          >
            {/* Vertical connector */}
            <div className="w-0.5 h-8 bg-connector" />

            {/* Add buttons row */}
            {canAddChildren && (
              <div
                ref={setNodeRef}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg transition-colors',
                  isOver && 'bg-primary/10 ring-2 ring-primary/30'
                )}
              >
                <AddCardButton type={childType} onClick={handleAddChild} size="sm" />
              </div>
            )}

            {/* Children container */}
            {children.length > 0 && (
              <>
                {/* Horizontal connector for multiple children */}
                {children.length > 1 && (
                  <div className="relative w-full flex justify-center">
                    <div
                      className="absolute top-0 h-0.5 bg-connector"
                      style={{
                        left: `calc(50% - ${(children.length - 1) * 176}px)`,
                        width: `${(children.length - 1) * 352}px`,
                      }}
                    />
                  </div>
                )}

                <div className="flex gap-8 pt-4">
                  {children.map((child) => (
                    <div key={child.id} className="flex flex-col items-center">
                      {/* Vertical connector from horizontal line */}
                      {children.length > 1 && (
                        <div className="w-0.5 h-4 bg-connector -mt-4" />
                      )}
                      <TreeNode cardId={child.id} depth={depth + 1} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
