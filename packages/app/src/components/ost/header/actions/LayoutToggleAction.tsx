import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';

export function LayoutToggleAction() {
  const { layoutDirection, toggleLayoutDirection } = useOSTStore();

  return (
    <Button variant="ghost" size="sm" className="gap-2" onClick={toggleLayoutDirection}>
      <ArrowRightLeft
        className={`w-4 h-4 ${
          layoutDirection === 'vertical' ? 'rotate-90' : 'rotate-0'
        } transition-transform`}
      />
      <span className="hidden sm:inline">
        {layoutDirection === 'vertical' ? 'Vertical' : 'Horizontal'}
      </span>
    </Button>
  );
}
