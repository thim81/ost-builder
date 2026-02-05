import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CardType } from '@ost-builder/shared';

interface AddCardButtonProps {
  type: CardType;
  onClick: () => void;
  size?: 'sm' | 'md';
}

const typeColors: Record<CardType, string> = {
  outcome: 'bg-outcome hover:bg-outcome/90',
  opportunity: 'bg-opportunity hover:bg-opportunity/90',
  solution: 'bg-solution hover:bg-solution/90',
  experiment: 'bg-experiment hover:bg-experiment/90',
};

export function AddCardButton({ type, onClick, size = 'md' }: AddCardButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-full text-white shadow-lg transition-colors',
        typeColors[type],
        size === 'sm' ? 'w-7 h-7' : 'w-9 h-9',
      )}
    >
      <Plus className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </motion.button>
  );
}
