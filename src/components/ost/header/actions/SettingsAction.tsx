import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SettingsAction() {
  const { experimentLayout, setExperimentLayout, viewDensity, setViewDensity } = useOSTStore();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Tune the layout and behavior of your OST view.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Settings affect how the tree is displayed on this device. They won’t change the
            underlying data.
          </div>
          <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Experiment layout</span>
          <Select
            value={experimentLayout}
            onValueChange={(value) =>
              setExperimentLayout(value as 'horizontal' | 'vertical')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Controls how experiments are arranged under solutions.
          </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Tree Branch density</span>
            <Select
              value={viewDensity}
              onValueChange={(value) => setViewDensity(value as 'full' | 'compact')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select density" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Compact hides descriptions and progress to fit more cards on screen.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
