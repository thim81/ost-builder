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
  const [url, setUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const resetState = () => {
    setFileName(null);
    setFileContent('');
    setLoading(false);
    setError(null);
    setUrl('');
    setStatusMessage(null);
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
    setStatusMessage(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setFileContent(text);
      setStatusMessage('File loaded. Ready to apply.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file.';
      setError(message);
      setStatusMessage(message);
      setFileContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setFileName(null);

    try {
      const response = await fetch(url.trim());
      if (!response.ok) {
        throw new Error(`Failed to fetch (${response.status}).`);
      }
      const text = await response.text();
      setFileContent(text);
      setStatusMessage('URL fetched. Ready to apply.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch URL.';
      setError(message);
      setStatusMessage(message);
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
        <div className="grid gap-4">
          <div className="grid gap-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="text-sm font-medium">Upload a file</div>
              <div className="text-xs text-muted-foreground">
                Choose a local Markdown file to overwrite the current tree.
              </div>
              <div className="mt-3">
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-sm file:mr-4 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
                />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="text-sm font-medium">Upload from URL</div>
              <div className="text-xs text-muted-foreground">
                Fetch a remote Markdown file and replace the current tree.
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/tree.md"
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                <Button onClick={handleUrlUpload} disabled={loading || !url.trim()}>
                  {loading ? 'Fetching...' : 'Fetch URL'}
                </Button>
              </div>
            </div>
          </div>
          {fileName ? (
            <div className="text-xs text-muted-foreground">Selected: {fileName}</div>
          ) : null}
          {statusMessage ? (
            <div
              className={`text-xs ${
                error ? 'text-destructive' : 'text-emerald-600'
              }`}
            >
              {statusMessage}
            </div>
          ) : null}
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
