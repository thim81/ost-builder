import { useRef, useState } from 'react';
import {
  TreeDeciduous,
  Settings,
  Share2,
  RotateCcw,
  Code,
  Copy,
  Check,
  ArrowRightLeft,
  Download,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { exportOSTToPng } from '@/lib/exportOST';

export function Header() {
  const {
    resetTree,
    getMarkdown,
    setMarkdown,
    getShareLink,
    layoutDirection,
    toggleLayoutDirection,
    canvasState,
    projectName,
    setProjectName,
  } = useOSTStore();
  const [markdownEditorOpen, setMarkdownEditorOpen] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBackground, setExportBackground] = useState<'grid' | 'transparent'>('grid');
  const [exportMode, setExportMode] = useState<'current' | 'fit'>('fit');
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleOpenMarkdownEditor = () => {
    setEditedMarkdown(getMarkdown());
    setMarkdownEditorOpen(true);
  };

  const handleSaveMarkdown = () => {
    setMarkdown(editedMarkdown);
    setMarkdownEditorOpen(false);
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(editedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = getShareLink();
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Share link copied',
      description: 'Anyone with this link can open the OST in their browser.',
    });
  };

  const applyMarkdown = (formatter: (text: string) => string, cursorOffset = 0) => {
    const textarea = markdownRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const before = editedMarkdown.slice(0, start);
    const selected = editedMarkdown.slice(start, end);
    const after = editedMarkdown.slice(end);
    const next = `${before}${formatter(selected)}${after}`;
    setEditedMarkdown(next);
    requestAnimationFrame(() => {
      const cursor = start + cursorOffset + formatter(selected).length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const wrapSelection = (prefix: string, suffix = prefix) => {
    applyMarkdown((text) => `${prefix}${text || 'text'}${suffix}`, prefix.length);
  };

  const insertLinePrefix = (prefix: string) => {
    applyMarkdown((text) => {
      if (text) {
        return text
          .split('\n')
          .map((line) => (line.trim().length ? `${prefix}${line}` : line))
          .join('\n');
      }
      return `${prefix}`;
    });
  };

  const handleStartNameEdit = () => {
    setNameDraft(projectName);
    setIsEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  };

  const handleSaveName = () => {
    setProjectName(nameDraft);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveName();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditingName(false);
      setNameDraft(projectName);
    }
  };

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
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <TreeDeciduous className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">OST Builder</h1>
          {isEditingName ? (
            <div className="relative">
              <Input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleNameKeyDown}
                className="flex h-6 w-64 rounded-md border border-input bg-background px-3 py-1 pr-6 text-xs ring-offset-background placeholder:text-muted-foreground md:text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Project name"
              />
              <PenLine className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartNameEdit}
              className="group relative text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit project name"
            >
              <span className="block truncate pr-4">{projectName}</span>
              <PenLine className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Dialog open={markdownEditorOpen} onOpenChange={setMarkdownEditorOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleOpenMarkdownEditor}>
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">Markdown</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Markdown Source</DialogTitle>
              <DialogDescription>
                Edit the raw Markdown structure of your Opportunity Solution Tree. Changes will update the tree when saved.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <Textarea
                ref={markdownRef}
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                className="h-full font-mono text-sm resize-none"
                placeholder="Enter your OST markdown..."
              />
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMarkdownEditorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMarkdown}>Save Changes</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Tree</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset your Opportunity Solution Tree to the default example.
                All your changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetTree}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                onValueChange={(value) =>
                  setExportBackground(value as 'grid' | 'transparent')
                }
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

        <Button variant="ghost" size="sm" className="gap-2" onClick={toggleLayoutDirection}>
          <ArrowRightLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {layoutDirection === 'vertical' ? 'Horizontal' : 'Vertical'}
          </span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
