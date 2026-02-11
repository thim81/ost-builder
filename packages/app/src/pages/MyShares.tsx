import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  deleteStoredShare,
  extendStoredShare,
  getAuthMe,
  getStoredShare,
  listStoredShares,
  type ShareVisibility,
  type StoredShareListItem,
  updateStoredShare,
} from '@/lib/storedShareApi';
import { toast } from '@/components/ui/use-toast';

const TTL_OPTIONS = [1, 7, 30, 90] as const;

export default function MyShares() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [items, setItems] = useState<StoredShareListItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const auth = await getAuthMe();
      if (!auth.user) {
        setAuthRequired(true);
        setItems([]);
        return;
      }
      setAuthRequired(false);
      const data = await listStoredShares(1, 50);
      setItems(data.items);
    } catch {
      setAuthRequired(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleVisibility = async (item: StoredShareListItem) => {
    const next: ShareVisibility = item.visibility === 'public' ? 'private' : 'public';
    try {
      await updateStoredShare(item.id, { visibility: next });
      toast({ title: 'Updated', description: `Visibility set to ${next}.` });
      await load();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update visibility.',
        variant: 'destructive',
      });
    }
  };

  const extend = async (item: StoredShareListItem, ttlDays: (typeof TTL_OPTIONS)[number]) => {
    try {
      await extendStoredShare(item.id, ttlDays);
      toast({ title: 'Extended', description: `Link extended by ${ttlDays} day(s).` });
      await load();
    } catch (error) {
      toast({
        title: 'Extend failed',
        description: error instanceof Error ? error.message : 'Could not extend share.',
        variant: 'destructive',
      });
    }
  };

  const remove = async (id: string) => {
    const confirmed = window.confirm('Delete this share permanently?');
    if (!confirmed) return;
    try {
      await deleteStoredShare(id);
      toast({ title: 'Deleted', description: 'Share deleted permanently.' });
      await load();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete share.',
        variant: 'destructive',
      });
    }
  };

  const beginRename = (item: StoredShareListItem) => {
    setEditingId(item.id);
    setNameDraft(item.name || '');
  };

  const beginEditContent = async (item: StoredShareListItem) => {
    try {
      const payload = await getStoredShare(item.id);
      setEditingContentId(item.id);
      setContentDraft(payload.markdown);
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Could not load share markdown.',
        variant: 'destructive',
      });
    }
  };

  const saveRename = async (id: string) => {
    try {
      await updateStoredShare(id, { name: nameDraft.trim() });
      setEditingId(null);
      setNameDraft('');
      toast({ title: 'Saved', description: 'Share name updated.' });
      await load();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update name.',
        variant: 'destructive',
      });
    }
  };

  const saveContent = async (id: string) => {
    try {
      await updateStoredShare(id, { markdown: contentDraft });
      setEditingContentId(null);
      setContentDraft('');
      toast({ title: 'Saved', description: 'Share content updated.' });
      await load();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update share content.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto text-sm text-muted-foreground">Loading shares...</div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto rounded-md border border-border bg-card p-6 space-y-3">
          <h1 className="text-xl font-semibold">My Shares</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your stored shares.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/api/auth/login?provider=github&returnTo=/shares')}
            >
              Continue with GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/api/auth/login?provider=google&returnTo=/shares')}
            >
              Continue with Google
            </Button>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>Back to builder</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Shares</h1>
          <Button variant="outline" onClick={() => navigate('/')}>Back to builder</Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No stored shares yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{item.name || `Share ${item.id}`}</div>
                  <Badge variant="secondary" className="capitalize">{item.visibility}</Badge>
                  <Badge variant="outline" className="capitalize">{item.status}</Badge>
                </div>

                <div className="text-xs text-muted-foreground break-all">{item.link}</div>
                <div className="text-xs text-muted-foreground">
                  Expires: {new Date(item.expiresAt).toLocaleString()}
                </div>

                {editingId === item.id ? (
                  <div className="flex gap-2">
                    <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                    <Button size="sm" onClick={() => saveRename(item.id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : editingContentId === item.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={contentDraft}
                      onChange={(e) => setContentDraft(e.target.value)}
                      className="font-mono min-h-48"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveContent(item.id)}>Save content</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingContentId(null);
                          setContentDraft('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(item.link)}>
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(item.link, '_blank')}>
                      Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => beginRename(item)}>
                      Rename
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void beginEditContent(item)}>
                      Edit content
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleVisibility(item)}>
                      Make {item.visibility === 'public' ? 'private' : 'public'}
                    </Button>
                    {TTL_OPTIONS.map((ttl) => (
                      <Button
                        key={`${item.id}-${ttl}`}
                        size="sm"
                        variant="outline"
                        onClick={() => extend(item, ttl)}
                      >
                        +{ttl}d
                      </Button>
                    ))}
                    <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
