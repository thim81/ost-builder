import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';

type LayoutToggleActionProps = {
  compact?: boolean;
};

export function LayoutToggleAction({ compact = false }: LayoutToggleActionProps) {
  const { layoutDirection, toggleLayoutDirection } = useOSTStore();

  return (
    <Button
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      className={compact ? 'h-8 w-8' : 'gap-2'}
      onClick={toggleLayoutDirection}
      title={`Layout: ${layoutDirection === 'vertical' ? 'Vertical' : 'Horizontal'}`}
    >
      <ArrowRightLeft
        className={`w-4 h-4 ${
          layoutDirection === 'vertical' ? 'rotate-90' : 'rotate-0'
        } transition-transform`}
      />
      {!compact && (
        <span className="hidden sm:inline">
          {layoutDirection === 'vertical' ? 'Vertical' : 'Horizontal'}
        </span>
      )}
    </Button>
  );
}
