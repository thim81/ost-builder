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

const SYNTAX_EXAMPLE = `# My OST Project

## [Outcome] Improve activation rate @on-track
Track first-week activation for new users.
- start: 18
- current: 24
- target: 35

### [Opportunity] Users drop off during onboarding @next
Many users stop before completing setup.

#### [Solution] Add a 3-step onboarding checklist @at-risk
Show required tasks directly in the dashboard.

##### [Experiment] A/B test checklist visibility @done
Run for 2 weeks and compare activation lift.`;

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
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Markdown Source</DialogTitle>
          <DialogDescription>
            Edit the raw Markdown structure of your Opportunity Solution Tree. Changes will update
            the tree when saved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-h-0">
            <Textarea
              ref={markdownRef}
              value={editedMarkdown}
              onChange={(e) => setEditedMarkdown(e.target.value)}
              className="h-full font-mono text-sm resize-none"
              placeholder="Enter your OST markdown..."
            />
          </div>
          <aside className="min-h-0 rounded-md border bg-muted/30 p-3 text-sm overflow-auto">
            <h3 className="font-semibold mb-2">Markdown Syntax Guide</h3>
            <p className="text-muted-foreground mb-3">
              Use heading levels to define card type and tree depth.
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>
                <code>##</code> Outcome
              </li>
              <li>
                <code>###</code> Opportunity
              </li>
              <li>
                <code>####</code> Solution
              </li>
              <li>
                <code>#####</code> Experiment
              </li>
            </ul>
            <p className="mb-2">
              Optional status tag at end of heading:
              <code className="ml-1">@on-track</code>, <code>@at-risk</code>, <code>@next</code>,{' '}
              <code>@done</code>
            </p>
            <p className="mb-3">
              Outcome cards can include metrics:
              <code className="ml-1">- start:</code>, <code>- current:</code>,{' '}
              <code>- target:</code>
            </p>
            <pre className="rounded-md border bg-background p-3 text-xs whitespace-pre-wrap">
              <code>{SYNTAX_EXAMPLE}</code>
            </pre>
          </aside>
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
