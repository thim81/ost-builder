import { TreeDeciduous } from 'lucide-react';
import { ProjectName } from './header/ProjectName';
import { MarkdownEditorAction } from './header/actions/MarkdownEditorAction';
import { UploadAction } from './header/actions/UploadAction';
import { LibraryAction } from './header/actions/LibraryAction';
import { CreateNewAction } from './header/actions/CreateNewAction';
import { ResetAction } from './header/actions/ResetAction';
import { ExportAction } from './header/actions/ExportAction';
import { ShareAction } from './header/actions/ShareAction';
import { GitHubLinkAction } from './header/actions/GitHubLinkAction';
import { AccountMenuAction } from './header/actions/AccountMenuAction';

export function Header() {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <TreeDeciduous className="w-5 h-5 text-primary-foreground" />
        </div>
        <ProjectName />
      </div>

      <div className="flex items-center gap-2">
        <MarkdownEditorAction />
        <LibraryAction />
        <CreateNewAction />
        <UploadAction />
        <ResetAction />
        <ExportAction />
        <ShareAction />
        <GitHubLinkAction />
        <AccountMenuAction />
      </div>
    </header>
  );
}
