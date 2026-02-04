import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { exportOSTToPng } from '@/lib/exportOST';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export function ExportAction() {
  const { canvasState, projectName } = useOSTStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBackground, setExportBackground] = useState<'grid' | 'transparent'>('grid');
  const [exportMode, setExportMode] = useState<'current' | 'fit'>('fit');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportOSTToPng({
        background: exportBackground,
        mode: exportMode,
        currentZoom: canvasState.zoom,
        currentOffsetX: canvasState.offset.x,
        currentOffsetY: canvasState.offset.y,
        watermarkText: projectName ? `OST Builder — ${projectName}` : 'OST Builder',
      });
      toast({
        title: 'Export started',
        description: 'Your PNG download should begin shortly.',
      });
      setExportOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast({
        title: 'Export failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={exportOpen} onOpenChange={setExportOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export PNG</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export PNG</DialogTitle>
          <DialogDescription>
            Export the tree view as a PNG image.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Background</span>
          <Select
            value={exportBackground}
            onValueChange={(value) => setExportBackground(value as 'grid' | 'transparent')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Export mode</span>
          <Select
            value={exportMode}
            onValueChange={(value) => setExportMode(value as 'current' | 'fit')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select export mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit all content</SelectItem>
              <SelectItem value="current">Current view</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setExportOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
