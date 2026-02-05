import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { useOSTStore } from '@/store/ostStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function UploadAction() {
  const { setMarkdown } = useOSTStore();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFileName(null);
    setFileContent('');
    setLoading(false);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetState();
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setFileContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.');
      setFileContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpload = () => {
    if (!fileContent) return;
    setMarkdown(fileContent);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Markdown</DialogTitle>
          <DialogDescription>
            Select a Markdown file to replace the current tree. This will overwrite the existing
            content.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
          />
          {fileName ? (
            <div className="text-xs text-muted-foreground">Selected: {fileName}</div>
          ) : null}
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyUpload} disabled={loading || !fileContent}>
            {loading ? 'Loading...' : 'Use File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
