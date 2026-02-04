import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Lightbulb, Beaker, TrendingUp, Trash2, Info } from 'lucide-react';
import { useOSTStore } from '@/store/ostStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CardType, CardStatus } from '@/types/ost';
import { cn } from '@/lib/utils';
import { OST_GUIDANCE } from '@/lib/ostGuidance';

const typeIcons: Record<CardType, React.ReactNode> = {
  outcome: <Target className="w-4 h-4" />,
  opportunity: <Lightbulb className="w-4 h-4" />,
  solution: <TrendingUp className="w-4 h-4" />,
  experiment: <Beaker className="w-4 h-4" />,
};

const typeColors: Record<CardType, string> = {
  outcome: 'text-outcome',
  opportunity: 'text-opportunity',
  solution: 'text-solution',
  experiment: 'text-experiment',
};

export function Sidebar() {
  const { tree, selectedCardId, selectCard, updateCard, deleteCard } = useOSTStore();
  const card = selectedCardId ? tree.cards[selectedCardId] : null;

  if (!card) return null;

  const guidance = OST_GUIDANCE[card.type];

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute right-0 top-0 bottom-0 w-[420px] bg-card border-l border-border shadow-xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={cn(typeColors[card.type])}>{typeIcons[card.type]}</span>
            <span className="font-medium text-sm capitalize">{card.type}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectCard(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title">Title</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{guidance.title.title}</div>
                    <div className="text-xs text-muted-foreground">{guidance.title.description}</div>
                    {/*{guidance.title.source && (*/}
                    {/*  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">*/}
                    {/*    Source: {guidance.title.source}*/}
                    {/*  </div>*/}
                    {/*)}*/}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="title"
              value={card.title}
              onChange={(e) => updateCard(card.id, { title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Description</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{guidance.description.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {guidance.description.description}
                    </div>
                    {/*{guidance.description.source && (*/}
                    {/*  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">*/}
                    {/*    Source: {guidance.description.source}*/}
                    {/*  </div>*/}
                    {/*)}*/}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              id="description"
              value={card.description || ''}
              onChange={(e) => updateCard(card.id, { description: e.target.value })}
              placeholder="Add a description..."
              rows={10}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="status">Status</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{guidance.status.title}</div>
                    <div className="text-xs text-muted-foreground">{guidance.status.description}</div>
                    {/*{guidance.status.source && (*/}
                    {/*  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">*/}
                    {/*    Source: {guidance.status.source}*/}
                    {/*  </div>*/}
                    {/*)}*/}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={card.status || 'none'}
              onValueChange={(value) => updateCard(card.id, { status: value as CardStatus })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No status</SelectItem>
                <SelectItem value="on-track">On Track</SelectItem>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics for outcome cards */}
          {card.type === 'outcome' && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Metrics</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{guidance.metrics.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {guidance.metrics.description}
                      </div>
                      {/*{guidance.metrics.source && (*/}
                      {/*  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">*/}
                      {/*    Source: {guidance.metrics.source}*/}
                      {/*  </div>*/}
                      {/*)}*/}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="start" className="text-xs">
                    Start
                  </Label>
                  <Input
                    id="start"
                    type="number"
                    value={card.metrics?.start || 0}
                    onChange={(e) =>
                      updateCard(card.id, {
                        metrics: {
                          ...card.metrics!,
                          start: Number(e.target.value),
                        },
                      })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="current" className="text-xs">
                    Current
                  </Label>
                  <Input
                    id="current"
                    type="number"
                    value={card.metrics?.current || 0}
                    onChange={(e) =>
                      updateCard(card.id, {
                        metrics: {
                          ...card.metrics!,
                          current: Number(e.target.value),
                        },
                      })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="target" className="text-xs">
                    Target
                  </Label>
                  <Input
                    id="target"
                    type="number"
                    value={card.metrics?.target || 0}
                    onChange={(e) =>
                      updateCard(card.id, {
                        metrics: {
                          ...card.metrics!,
                          target: Number(e.target.value),
                        },
                      })
                    }
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Card info */}
          <div className="pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(card.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => {
              deleteCard(card.id);
              selectCard(null);
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Card
          </Button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
