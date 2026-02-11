import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Share2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { createStoredShare, getAuthMe } from '@/lib/storedShareApi';

type ShareMode = 'local' | 'cloud';
type Visibility = 'public' | 'private';
type TtlDays = 1 | 7 | 30 | 90;

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
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [user, setUser] = useState<{ name?: string; provider: 'github' | 'google' } | null>(null);
  const [created, setCreated] = useState<{ link: string; expiresAt: number; visibility: Visibility } | null>(
    null,
  );

  const expiresLabel = useMemo(() => {
    if (!created?.expiresAt) return '';
    return new Date(created.expiresAt).toLocaleString();
  }, [created?.expiresAt]);

  const loadAuth = async () => {
    setLoadingAuth(true);
    try {
      const data = await getAuthMe();
      setFeatureEnabled(data.featureEnabled);
      if (data.user) {
        setUser({
          name: data.user.name,
          provider: data.user.provider,
        });
      } else {
        setUser(null);
      }
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
      setCreated(null);
      setCopied(false);
      return;
    }
    void loadAuth();
  };

  const handleLocalShare = async () => {
    const url = getShareLink();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Share link copied',
      description: 'Data stays in the URL fragment and browser.',
    });
  };

  const login = (provider: 'github' | 'google') => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const url = `/api/auth/login?provider=${provider}&returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = url;
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
      setCreated({
        link: result.link,
        expiresAt: result.expiresAt,
        visibility: result.visibility,
      });
      await navigator.clipboard.writeText(result.link);
      toast({
        title: 'Stored share created',
        description: 'Short link copied to clipboard.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create stored share.';
      toast({
        title: 'Share failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCreatedLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.link);
    toast({ title: 'Copied', description: 'Stored share link copied.' });
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
          <DialogDescription>
            Choose local sharing (browser-only) or optional OST-Builder storage with expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('local')}
            className={`rounded-md border p-3 text-left transition ${
              mode === 'local' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
            }`}
          >
            <div className="text-sm font-medium">Share locally</div>
            <div className="text-xs text-muted-foreground mt-1">Data stays in URL/browser.</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('cloud')}
            className={`rounded-md border p-3 text-left transition ${
              mode === 'cloud' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
            }`}
          >
            <div className="text-sm font-medium">Save in your Account</div>
            <div className="text-xs text-muted-foreground mt-1">Short link, TTL, access controls.</div>
          </button>
        </div>

        {mode === 'local' && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <div className="text-sm">Generate a fragment-based link without server storage.</div>
            <Button onClick={handleLocalShare} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy local share link'}
            </Button>
          </div>
        )}

        {mode === 'cloud' && !featureEnabled && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            Stored shares are currently disabled in this environment.
          </div>
        )}

        {mode === 'cloud' && featureEnabled && (
          <div className="space-y-3">
            {loadingAuth ? (
              <div className="rounded-md border border-border p-4 flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking account session...
              </div>
            ) : !user ? (
              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
                <div className="text-sm">Sign in to create managed, expiring short links.</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => login('github')}>
                    Continue with GitHub
                  </Button>
                  <Button variant="outline" onClick={() => login('google')}>
                    Continue with Google
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-border bg-muted/20 p-3 text-sm flex items-center justify-between">
                  <span>Signed in as {user.name || 'account user'}</span>
                  <Badge variant="secondary" className="capitalize">
                    {user.provider}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Share name (optional)</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Use current project name if empty"
                    />
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
                          <SelectItem value="private">Private (only me)</SelectItem>
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

                  {!created ? (
                    <Button onClick={handleCreateCloudShare} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create short link'}
                    </Button>
                  ) : (
                    <div className="rounded-md border border-border p-3 space-y-3">
                      <div className="text-xs text-muted-foreground">Stored link</div>
                      <div className="text-sm break-all">{created.link}</div>
                      <div className="text-xs text-muted-foreground">
                        Visibility: {created.visibility} | Expires: {expiresLabel}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCopyCreatedLink}>
                          Copy
                        </Button>
                        <Button variant="outline" onClick={() => window.open(created.link, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />Open
                        </Button>
                        <Button variant="outline" onClick={() => (window.location.href = '/shares')}>
                          Manage shares
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
