import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsAction() {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Settings className="w-4 h-4" />
    </Button>
  );
}
