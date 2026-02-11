import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeMarkdownToUrlFragment } from '@ost-builder/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  deleteLocalSnapshot,
  listLocalSnapshots,
  updateLocalSnapshot,
  type LocalSnapshot,
} from '@/lib/localSnapshots';
import { toast } from '@/components/ui/use-toast';
import { useOSTStore } from '@/store/ostStore';

const TTL_OPTIONS = [1, 7, 30, 90] as const;

function statusLabel(status: StoredShareListItem['status']): string {
  if (status === 'active') return 'available';
  return status;
}

function localSourceLabel(sourceType?: LocalSnapshot['sourceType']): string {
  if (sourceType === 'draft') return 'draft';
  if (sourceType === 'share-cloud') return 'share-cloud';
  if (sourceType === 'share-fragment') return 'share-fragment';
  if (sourceType === 'create-new') return 'create-new';
  return 'local';
}

export default function MyShares() {
  const navigate = useNavigate();
  const { loadFromStoredShare } = useOSTStore();
  const [loading, setLoading] = useState(true);
  const [cloudUser, setCloudUser] = useState<{ name?: string } | null>(null);
  const [cloudItems, setCloudItems] = useState<StoredShareListItem[]>([]);
  const [localItems, setLocalItems] = useState<LocalSnapshot[]>([]);
  const [editingCloudId, setEditingCloudId] = useState<string | null>(null);
  const [editingCloudContentId, setEditingCloudContentId] = useState<string | null>(null);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');

  const load = async () => {
    setLoading(true);
    setLocalItems(listLocalSnapshots());

    try {
      const auth = await getAuthMe();
      if (!auth.user) {
        setCloudUser(null);
        setCloudItems([]);
      } else {
        setCloudUser({ name: auth.user.name });
        const data = await listStoredShares(1, 50);
        setCloudItems(data.items);
      }
    } catch {
      setCloudUser(null);
      setCloudItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCopy = async (text: string, description: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description });
  };

  const copyLocalShareLink = async (item: LocalSnapshot) => {
    const fragment = encodeMarkdownToUrlFragment(
      item.markdown,
      item.name,
      item.settings,
      item.collapsedIds || [],
    );
    const link = `${window.location.origin}/#${fragment}`;
    await handleCopy(link, 'Local share link copied.');
  };

  const openLocalSnapshot = (item: LocalSnapshot) => {
    loadFromStoredShare({
      markdown: item.markdown,
      name: item.name,
      settings: item.settings,
      collapsedIds: item.collapsedIds || [],
    });
    navigate('/');
  };

  const removeLocal = (id: string) => {
    const confirmed = window.confirm('Delete this local snapshot?');
    if (!confirmed) return;
    deleteLocalSnapshot(id);
    setLocalItems(listLocalSnapshots());
    toast({ title: 'Deleted', description: 'Local snapshot removed.' });
  };

  const saveLocalRename = (id: string) => {
    updateLocalSnapshot(id, { name: nameDraft });
    setEditingLocalId(null);
    setNameDraft('');
    setLocalItems(listLocalSnapshots());
    toast({ title: 'Saved', description: 'Local snapshot renamed.' });
  };

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

  const removeCloud = async (id: string) => {
    const confirmed = window.confirm('Delete this cloud share permanently?');
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

  const beginRenameCloud = (item: StoredShareListItem) => {
    setEditingCloudId(item.id);
    setNameDraft(item.name || '');
  };

  const beginRenameLocal = (item: LocalSnapshot) => {
    setEditingLocalId(item.id);
    setNameDraft(item.name || '');
  };

  const beginEditCloudContent = async (item: StoredShareListItem) => {
    try {
      const payload = await getStoredShare(item.id);
      setEditingCloudContentId(item.id);
      setContentDraft(payload.markdown);
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Could not load share markdown.',
        variant: 'destructive',
      });
    }
  };

  const saveCloudRename = async (id: string) => {
    try {
      await updateStoredShare(id, { name: nameDraft.trim() });
      setEditingCloudId(null);
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

  const saveCloudContent = async (id: string) => {
    try {
      await updateStoredShare(id, { markdown: contentDraft });
      setEditingCloudContentId(null);
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Saved Library</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Status “available” means the cloud link is currently usable (not expired/deleted).
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to builder
          </Button>
        </div>

        <Tabs defaultValue="cloud" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cloud">Cloud</TabsTrigger>
            <TabsTrigger value="local">Local</TabsTrigger>
          </TabsList>

          <TabsContent value="cloud" className="space-y-3">
            {!cloudUser ? (
              <div className="rounded-md border border-border bg-card p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Sign in to manage cloud shares.</p>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/api/auth/login?provider=github&returnTo=/shares')}
                >
                  Continue with GitHub
                </Button>
              </div>
            ) : cloudItems.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
                No cloud shares yet.
              </div>
            ) : (
              cloudItems.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{item.name || `Share ${item.id}`}</div>
                    <Badge variant="secondary" className="capitalize">
                      {item.visibility}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {statusLabel(item.status)}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground break-all">{item.link}</div>
                  <div className="text-xs text-muted-foreground">
                    Expires: {new Date(item.expiresAt).toLocaleString()}
                  </div>

                  {editingCloudId === item.id ? (
                    <div className="flex gap-2">
                      <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                      <Button size="sm" onClick={() => void saveCloudRename(item.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCloudId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : editingCloudContentId === item.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={contentDraft}
                        onChange={(e) => setContentDraft(e.target.value)}
                        className="font-mono min-h-48"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void saveCloudContent(item.id)}>
                          Save content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCloudContentId(null);
                            setContentDraft('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCopy(item.link, 'Cloud share link copied.')}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(item.link, '_blank')}
                      >
                        Open
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => beginRenameCloud(item)}>
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void beginEditCloudContent(item)}
                      >
                        Edit content
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void toggleVisibility(item)}>
                        Make {item.visibility === 'public' ? 'private' : 'public'}
                      </Button>
                      {TTL_OPTIONS.map((ttl) => (
                        <Button
                          key={`${item.id}-${ttl}`}
                          size="sm"
                          variant="outline"
                          onClick={() => void extend(item, ttl)}
                        >
                          +{ttl}d
                        </Button>
                      ))}
                      <Button size="sm" variant="destructive" onClick={() => void removeCloud(item.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="local" className="space-y-3">
            {localItems.length === 0 ? (
              <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
                No local snapshots yet. Use Share -&gt; Local -&gt; Save snapshot locally.
              </div>
            ) : (
              localItems.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{item.name}</div>
                    <Badge variant="outline">{localSourceLabel(item.sourceType)}</Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(item.updatedAt).toLocaleString()}
                  </div>
                  {item.lastOpenedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Last opened from share: {new Date(item.lastOpenedAt).toLocaleString()}
                    </div>
                  ) : null}

                  {editingLocalId === item.id ? (
                    <div className="flex gap-2">
                      <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                      <Button size="sm" onClick={() => saveLocalRename(item.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingLocalId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openLocalSnapshot(item)}>
                        Open in builder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void copyLocalShareLink(item)}
                      >
                        Copy local link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCopy(item.markdown, 'Markdown copied.')}
                      >
                        Copy markdown
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => beginRenameLocal(item)}>
                        Rename
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeLocal(item.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
