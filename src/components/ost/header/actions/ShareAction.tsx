import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { toast } from '@/components/ui/use-toast';

export function ShareAction() {
  const { getShareLink } = useOSTStore();

  const handleShare = async () => {
    const url = getShareLink();
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Share link copied',
      description: 'Anyone with this link can open the OST in their browser.',
    });
  };

  return (
    <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
