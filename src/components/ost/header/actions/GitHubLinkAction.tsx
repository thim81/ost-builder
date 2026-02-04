import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const GITHUB_URL = 'https://github.com/thim81/ost-builder';

export function GitHubLinkAction() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Github className="w-4 h-4" />
            {/*<span className="hidden sm:inline">GitHub</span>*/}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>View on GitHub</TooltipContent>
    </Tooltip>
  );
}
