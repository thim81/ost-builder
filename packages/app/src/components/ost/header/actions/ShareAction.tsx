import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createStoredShare, getAuthMe } from '@/lib/storedShareApi';

type ShareMode = 'local' | 'cloud';
type Visibility = 'public' | 'private';
type TtlDays = 1 | 7 | 30 | 90;
const CLOUD_SHARE_UI_TOGGLE_KEY = 'ost:feature:cloud-share';

export function ShareAction() {
  const { getShareLink, getSharePayload } = useOSTStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ShareMode>('local');
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [ttlDays, setTtlDays] = useState<TtlDays>(30);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cloudShareUiEnabled, setCloudShareUiEnabled] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  const cloudAvailable = cloudShareUiEnabled && featureEnabled;

  const description = useMemo(() => {
    if (!cloudAvailable) return 'Copy a local browser-only share link.';
    return mode === 'local'
      ? 'Copy a local browser-only share link.'
      : 'Create a short share link stored in your account.';
  }, [cloudAvailable, mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = (window.localStorage.getItem(CLOUD_SHARE_UI_TOGGLE_KEY) || '').toLowerCase();
    const enabled = raw === '1' || raw === 'true' || raw === 'enabled' || raw === 'on';
    setCloudShareUiEnabled(enabled);
  }, []);

  const loadAuth = async () => {
    setLoadingAuth(true);
    try {
      const data = await getAuthMe();
      setFeatureEnabled(data.featureEnabled);
      setUser(data.user ? { name: data.user.name } : null);
    } catch {
      setFeatureEnabled(false);
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCopied(false);
      return;
    }
    const payload = getSharePayload();
    setName(payload.name);
    if (cloudShareUiEnabled) {
      void loadAuth();
    }
  };

  const handleLocalShare = async () => {
    const url = getShareLink();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Copied', description: 'Local share link copied.' });
  };

  const handleCreateCloudShare = async () => {
    const payload = getSharePayload();
    setSubmitting(true);
    try {
      const result = await createStoredShare({
        markdown: payload.markdown,
        name: name.trim() || payload.name,
        visibility,
        ttlDays,
        settings: payload.settings,
        collapsedIds: payload.collapsedIds,
      });
      await navigator.clipboard.writeText(result.link);
      toast({
        title: 'Copied',
        description: 'Short share link created and copied.',
      });
    } catch (error) {
      toast({
        title: 'Share failed',
        description: error instanceof Error ? error.message : 'Could not create short link.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Opportunity Tree</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {cloudAvailable && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('local')}
              className={`rounded-md border p-3 text-left transition ${
                mode === 'local' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <div className="text-sm font-medium">Local link</div>
              <div className="text-xs text-muted-foreground mt-1">Browser-only fragment link.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('cloud')}
              className={`rounded-md border p-3 text-left transition ${
                mode === 'cloud' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <div className="text-sm font-medium">Short link</div>
              <div className="text-xs text-muted-foreground mt-1">Stored link with TTL controls.</div>
            </button>
          </div>
        )}

        {(!cloudAvailable || mode === 'local') && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <div className="text-sm">Create and copy a share link for the current tree.</div>
            <Button onClick={handleLocalShare} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy share link'}
            </Button>
          </div>
        )}

        {cloudAvailable && mode === 'cloud' && (
          <div className="space-y-3">
            {loadingAuth ? (
              <div className="rounded-md border border-border p-4 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking account session...
              </div>
            ) : !user ? (
              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
                <div className="text-sm">Sign in to create short links.</div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const returnTo = `${window.location.pathname}${window.location.search}`;
                    window.location.href = `/api/auth/login?provider=github&returnTo=${encodeURIComponent(returnTo)}`;
                  }}
                >
                  Continue with GitHub
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Share name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Visibility</label>
                    <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">TTL</label>
                    <Select value={String(ttlDays)} onValueChange={(value) => setTtlDays(Number(value) as TtlDays)}>
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
                <Button onClick={handleCreateCloudShare} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create and copy short link'}
                </Button>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
