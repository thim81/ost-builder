import { useRef, useState } from 'react';
import { Check, Code, Copy } from 'lucide-react';
import { useOSTStore } from '@/store/ostStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function MarkdownEditorAction() {
  const { getMarkdown, setMarkdown } = useOSTStore();
  const [markdownEditorOpen, setMarkdownEditorOpen] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const markdownRef = useRef<HTMLTextAreaElement>(null);

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

  return (
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
            Edit the raw Markdown structure of your Opportunity Solution Tree. Changes will update
            the tree when saved.
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
  );
}
