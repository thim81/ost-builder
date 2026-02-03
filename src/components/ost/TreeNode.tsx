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
  const { tree, addCard, layoutDirection } = useOSTStore();
  const card = tree.cards[cardId];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isHorizontal = layoutDirection === 'horizontal';

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
    <div className={cn('flex items-center', isHorizontal ? 'flex-row' : 'flex-col')}>
      {/* Card */}
      <div className="relative">
        <OSTCardComponent card={card} />

        {/* Collapse button */}
        {children.length > 0 && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'absolute w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-10',
              isHorizontal
                ? '-right-4 top-1/2 -translate-y-1/2'
                : '-bottom-4 left-1/2 -translate-x-1/2'
            )}
          >
            {isCollapsed ? (
              <span className="text-xs font-semibold text-muted-foreground">
                {children.length}
              </span>
            ) : (
              <>
                {isHorizontal ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </>
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
            className={cn('flex items-center', isHorizontal ? 'flex-row' : 'flex-col')}
          >
            {isHorizontal ? (
              <>
                {/* Horizontal connector */}
                <div className="h-0.5 w-8 bg-connector" />

                {/* Add buttons column */}
                {canAddChildren && (
                  <div
                    ref={setNodeRef}
                    className={cn(
                      'flex flex-col items-center gap-2 p-2 rounded-lg transition-colors',
                      isOver && 'bg-primary/10 ring-2 ring-primary/30'
                    )}
                  >
                    <AddCardButton type={childType} onClick={handleAddChild} size="sm" />
                  </div>
                )}

                {/* Children container */}
                {children.length > 0 && (
                  <div className="relative flex flex-col gap-8 pl-4">
                    {children.length > 1 && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-connector" />
                    )}
                    {children.map((child) => (
                      <div key={child.id} className="flex items-center">
                        <div className="h-0.5 w-4 bg-connector -ml-4" />
                        <TreeNode cardId={child.id} depth={depth + 1} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
