import { useRef, useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { useOSTStore } from '@/store/ostStore';
import { TreeNode } from './TreeNode';
import { OSTCard } from './OSTCard';
import { AddCardButton } from './AddCardButton';
import { cn } from '@/lib/utils';
import type { OSTCard as OSTCardType } from '@/types/ost';
import { Button } from '@/components/ui/button';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    tree,
    canvasState,
    setZoom,
    setOffset,
    addCard,
    moveCard,
    selectCard,
    layoutDirection,
  } = useOSTStore();
  const isHorizontal = layoutDirection === 'horizontal';
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [activeCard, setActiveCard] = useState<OSTCardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(canvasState.zoom + delta);
      } else {
        setOffset(
          canvasState.offset.x - e.deltaX,
          canvasState.offset.y - e.deltaY
        );
      }
    },
    [canvasState, setZoom, setOffset]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvasState.offset.x, y: e.clientY - canvasState.offset.y });
      }
    },
    [canvasState.offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setOffset(e.clientX - panStart.x, e.clientY - panStart.y);
      }
    },
    [isPanning, panStart, setOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = tree.cards[active.id as string];
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (over) {
      const droppableId = over.id as string;
      if (droppableId.startsWith('droppable-')) {
        const newParentId = droppableId.replace('droppable-', '');
        if (newParentId !== active.id) {
          moveCard(active.id as string, newParentId);
        }
      }
    }
  };

  const handleCanvasClick = () => {
    selectCard(null);
  };

  const handleResetView = () => {
    setZoom(1);
    setOffset(0, 0);
  };

  const handleFitToScreen = () => {
    // Center the tree in the viewport
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOffset(rect.width / 4, 100);
      setZoom(0.8);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden canvas-grid',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg z-50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(canvasState.zoom - 0.1)}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium w-12 text-center">
          {Math.round(canvasState.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(canvasState.zoom + 0.1)}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleResetView}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitToScreen}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas content */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          className="absolute inset-0 flex justify-center pt-16"
          style={{
            transform: `translate(${canvasState.offset.x}px, ${canvasState.offset.y}px) scale(${canvasState.zoom})`,
            transformOrigin: '50% 0',
          }}
        >
          <div className="flex flex-col items-center gap-6">
            {/* Root nodes */}
            {tree.rootIds.length === 0 ? (
              <div className="flex flex-col items-center gap-4 mt-32">
                <p className="text-muted-foreground text-lg">Start by adding an Outcome</p>
                <AddCardButton
                  type="outcome"
                  onClick={() => addCard('outcome', null)}
                  size="md"
                />
              </div>
            ) : (
                <div className={cn('flex gap-16', isHorizontal && 'flex-col')}>
                  {tree.rootIds.map((rootId) => (
                    <TreeNode key={rootId} cardId={rootId} />
                  ))}
                </div>
            )}

            {/* Add new root outcome button */}
            {tree.rootIds.length > 0 && (
              <div className="mt-8">
                <AddCardButton
                  type="outcome"
                  onClick={() => addCard('outcome', null)}
                  size="md"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeCard && <OSTCard card={activeCard} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
