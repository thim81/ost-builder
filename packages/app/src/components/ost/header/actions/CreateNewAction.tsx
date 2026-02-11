import { useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { OST_EXAMPLES } from '@ost-builder/shared';
import { setActiveLocalSnapshotSourceKey, upsertLocalSnapshotBySource } from '@/lib/localSnapshots';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CreateNewAction() {
  const { createNewTree } = useOSTStore();
  const [createOpen, setCreateOpen] = useState(false);

  const createAndSave = (markdown: string, name: string) => {
    createNewTree(markdown, name);
    const sourceKey = `create-new:${nanoid(10)}`;
    upsertLocalSnapshotBySource(sourceKey, 'create-new', {
      name,
      markdown,
      collapsedIds: [],
    });
    setActiveLocalSnapshotSourceKey(sourceKey);
    setCreateOpen(false);
  };

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CirclePlus className="w-4 h-4" />
          Create new
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Opportunity Solution Tree</DialogTitle>
          <DialogDescription>
            Start from a blank tree, a minimal template or one of the examples.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Start fresh</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  createAndSave('# My Opportunity Solution Tree\n\n', 'My Opportunity Solution Tree');
                }}
                className="rounded-lg border border-border bg-background p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground">Blank</div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    empty
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Start from a completely empty tree.
                </div>
                <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  • No nodes
                  <br />• Clean slate
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const minimal = `# My Opportunity Solution Tree

## [Outcome] Improve a core metric @next
Describe the measurable outcome
- start: 0
- current: 0
- target: 10

### [Opportunity] A key customer problem
Add the opportunity statement

#### [Solution] A simple first solution @next
Add a small experimentable solution
`;
                  createAndSave(minimal, 'My Opportunity Solution Tree');
                }}
                className="rounded-lg border border-border bg-background p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground">Minimal</div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    starter
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  One outcome and one opportunity to get started.
                </div>
                <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  • Outcome + metric
                  <br />• One opportunity
                </div>
              </button>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Examples</div>
            <div className="grid gap-2">
              {OST_EXAMPLES.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => {
                    createAndSave(example.markdown, example.name);
                  }}
                  className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{example.name}</div>
                  <div className="text-xs text-muted-foreground">{example.description}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Examples inspired by{' '}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href="https://www.producttalk.org/opportunity-solution-trees/"
                target="_blank"
                rel="noreferrer"
              >
                Teresa Torres
              </a>{' '}
              and{' '}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href="https://www.hustlebadger.com/what-do-product-teams-do/how-to-build-an-opportunity-solution-tree/"
                target="_blank"
                rel="noreferrer"
              >
                Hustle Badger
              </a>
              .
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
