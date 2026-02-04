import { useRef, useState } from 'react';
import { PenLine } from 'lucide-react';
import { useOSTStore } from '@/store/ostStore';
import { Input } from '@/components/ui/input';

export function ProjectName() {
  const { projectName, setProjectName } = useOSTStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  return (
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
  );
}
