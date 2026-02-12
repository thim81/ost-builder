import { useEffect, useMemo, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { createStoredShare, getAuthMe } from '@/lib/storedShareApi';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CLOUD_SHARE_UI_TOGGLE_KEY = 'ost:feature:cloud-share';

function isCloudShareUiEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = (window.localStorage.getItem(CLOUD_SHARE_UI_TOGGLE_KEY) || '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'enabled' || raw === 'on';
}

export function CloudShareAction() {
  const { getSharePayload } = useOSTStore();
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [ttlDays, setTtlDays] = useState<1 | 7 | 30 | 90>(30);

  const show = useMemo(
    () => isCloudShareUiEnabled() && featureEnabled && loggedIn,
    [featureEnabled, loggedIn],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const auth = await getAuthMe();
        if (!active) return;
        setFeatureEnabled(auth.featureEnabled);
        setLoggedIn(!!auth.user);
      } catch {
        if (!active) return;
        setFeatureEnabled(false);
        setLoggedIn(false);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const handleCloudShare = async () => {
    const payload = getSharePayload();
    setSubmitting(true);
    try {
      const result = await createStoredShare({
        markdown: payload.markdown,
        name: payload.name,
        visibility,
        ttlDays,
        settings: payload.settings,
        collapsedIds: payload.collapsedIds,
      });
      await navigator.clipboard.writeText(result.link);
      toast({
        title: 'Copied',
        description: 'Cloud share link created and copied.',
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Cloud share failed',
        description: error instanceof Error ? error.message : 'Could not create cloud share link.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !show) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <CloudUpload className="w-4 h-4" />
          <span className="hidden sm:inline">Cloud share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share to cloud</DialogTitle>
          <DialogDescription>Choose who can open this link and when it expires.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Who can open link</label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as 'public' | 'private')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Only me</SelectItem>
                <SelectItem value="public">Anyone with link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Expires in</label>
            <Select value={String(ttlDays)} onValueChange={(value) => setTtlDays(Number(value) as 1 | 7 | 30 | 90)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleCloudShare()} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
