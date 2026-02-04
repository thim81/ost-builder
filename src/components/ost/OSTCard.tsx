import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Check, Clock, Target, AlertCircle, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OSTCard as OSTCardType, CardType, CardStatus } from '@/types/ost';
import { useOSTStore } from '@/store/ostStore';
import { useState, useRef, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OSTCardProps {
  card: OSTCardType;
  isDragging?: boolean;
}

const cardTypeConfig: Record<
  CardType,
  { label: string; badgeClass: string; numberBg: string }
> = {
  outcome: {
    label: 'Outcome',
    badgeClass: 'bg-outcome/15 text-outcome border border-outcome/30',
    numberBg: 'bg-outcome text-white',
  },
  opportunity: {
    label: 'Opportunity',
    badgeClass: 'bg-opportunity/15 text-opportunity border border-opportunity/30',
    numberBg: 'bg-opportunity text-white',
  },
  solution: {
    label: 'Solution',
    badgeClass: 'bg-solution/15 text-solution border border-solution/30',
    numberBg: 'bg-solution text-white',
  },
  experiment: {
    label: 'Experiment',
    badgeClass: 'bg-experiment/15 text-experiment border border-experiment/30',
    numberBg: 'bg-experiment text-white',
  },
};

const statusConfig: Record<CardStatus, { label: string; icon: React.ReactNode; className: string }> = {
  'on-track': {
    label: 'On Track',
    icon: <Check className="w-3 h-3" />,
    className: 'text-status-success',
  },
  'at-risk': {
    label: 'At Risk',
    icon: <AlertCircle className="w-3 h-3" />,
    className: 'text-status-warning',
  },
  next: {
    label: 'Next',
    icon: <Clock className="w-3 h-3" />,
    className: 'text-status-next',
  },
  done: {
    label: 'Done',
    icon: <Check className="w-3 h-3" />,
    className: 'text-status-success',
  },
  none: {
    label: '',
    icon: null,
    className: '',
  },
};

export function OSTCard({ card, isDragging }: OSTCardProps) {
  const {
    selectedCardId,
    selectCard,
    editingCardId,
    setEditingCard,
    updateCard,
    deleteCard,
    copyCard,
    copyCardWithChildren,
    viewDensity,
  } = useOSTStore();
  const [editTitle, setEditTitle] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
    data: { card },
  });

  const isSelected = selectedCardId === card.id;
  const isEditing = editingCardId === card.id;
  const config = cardTypeConfig[card.type];
  const status = card.status ? statusConfig[card.status] : statusConfig.none;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditTitle(card.title);
  }, [card.title]);

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateCard(card.id, { title: editTitle.trim() });
    } else {
      setEditTitle(card.title);
    }
    setEditingCard(null);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 1000,
      }
    : undefined;

  // Get card number based on siblings (1-indexed position)
  const tree = useOSTStore.getState().tree;
  const siblings = card.parentId
    ? tree.cards[card.parentId]?.children || []
    : tree.rootIds;
  const cardNumber = siblings.indexOf(card.id) + 1;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'w-80 bg-card rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing',
        isSelected ? 'ring-2 ring-primary/50 border-primary/30' : 'border-border',
        isDragging ? 'card-shadow-drag opacity-90' : 'card-shadow hover:card-shadow-hover'
      )}
      onClick={(e) => {
        e.stopPropagation();
        selectCard(card.id);
      }}
      {...attributes}
      {...listeners}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold',
              config.numberBg
            )}
          >
            {cardNumber}
          </span>
          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', config.badgeClass)}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status.icon && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', status.className)}>
              {status.icon}
              <span>{status.label}</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-md hover:bg-muted transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditingCard(card.id)}>
                Edit title
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => updateCard(card.id, { status: 'on-track' })}
              >
                Set On Track
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateCard(card.id, { status: 'next' })}
              >
                Set Next
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateCard(card.id, { status: 'at-risk' })}
              >
                Set At Risk
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => copyCard(card.id)}>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <Copy className="h-3 w-3" />
                </span>
                Duplicate
              </DropdownMenuItem>
              {card.children.length > 0 && (
                <DropdownMenuItem onClick={() => copyCardWithChildren(card.id)}>
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                    <Copy className="h-3 w-3" />
                  </span>
                  Duplicate all
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteCard(card.id)}
              >
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <Trash2 className="h-3 w-3" />
                </span>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setEditTitle(card.title);
                setEditingCard(null);
              }
            }}
            className="w-full text-sm font-medium bg-transparent border-b-2 border-primary outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className="text-sm font-medium text-card-foreground leading-relaxed"
            onDoubleClick={() => setEditingCard(card.id)}
          >
            {card.title}
          </p>
        )}

        {viewDensity === 'full' && card.description && !isEditing && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Metrics for outcome cards */}
        {viewDensity === 'full' && card.type === 'outcome' && card.metrics && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Start: <span className="font-medium text-foreground">{card.metrics.start}</span>
              </span>
              <span className="text-muted-foreground">
                Target: <span className="font-medium text-foreground">{card.metrics.target}</span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-status-success rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (card.metrics.current / card.metrics.target) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Current:{' '}
                <span className="font-semibold text-foreground">{card.metrics.current}</span>
              </span>
              <span className="text-status-success font-medium">
                {Math.round((card.metrics.current / card.metrics.target) * 100)}% to target
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
