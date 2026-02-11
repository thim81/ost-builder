import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeMarkdownToUrlFragment } from '@ost-builder/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createStoredShare,
  getAuthMe,
  type AuthUser,
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

const CLOUD_SHARE_UI_TOGGLE_KEY = 'ost:feature:cloud-share';

function localSourceLabel(sourceType?: LocalSnapshot['sourceType']): string {
  if (sourceType === 'draft') return 'active';
  if (sourceType === 'share-cloud') return 'from cloud share';
  if (sourceType === 'share-fragment') return 'from local share';
  if (sourceType === 'create-new') return 'from create new';
  return 'local';
}

function sourceBadgeClass(sourceType?: LocalSnapshot['sourceType']): string | undefined {
  if (sourceType === 'draft') {
    return 'bg-emerald-500/15 text-emerald-700 border-emerald-400/50 motion-safe:animate-pulse';
  }
  return undefined;
}

function isCloudFeatureToggleEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = (window.localStorage.getItem(CLOUD_SHARE_UI_TOGGLE_KEY) || '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'enabled' || raw === 'on';
}

export default function Library() {
  const navigate = useNavigate();
  const { loadFromStoredShare } = useOSTStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LocalSnapshot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [pendingLoadItem, setPendingLoadItem] = useState<LocalSnapshot | null>(null);

  const [cloudToggleEnabled, setCloudToggleEnabled] = useState(false);
  const [cloudFeatureEnabled, setCloudFeatureEnabled] = useState(false);
  const [cloudUser, setCloudUser] = useState<AuthUser | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncAvailable = cloudToggleEnabled && cloudFeatureEnabled;

  const load = async () => {
    setLoading(true);
    setItems(listLocalSnapshots());

    const toggleEnabled = isCloudFeatureToggleEnabled();
    setCloudToggleEnabled(toggleEnabled);

    if (!toggleEnabled) {
      setCloudFeatureEnabled(false);
      setCloudUser(null);
      setLoading(false);
      return;
    }

    try {
      const auth = await getAuthMe();
      setCloudFeatureEnabled(auth.featureEnabled);
      setCloudUser(auth.user);
    } catch {
      setCloudFeatureEnabled(false);
      setCloudUser(null);
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
    await handleCopy(link, 'Share link copied.');
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
    const confirmed = window.confirm('Delete this Library item?');
    if (!confirmed) return;
    deleteLocalSnapshot(id);
    setItems(listLocalSnapshots());
    toast({ title: 'Deleted', description: 'Library item removed.' });
  };

  const beginRenameLocal = (item: LocalSnapshot) => {
    setEditingId(item.id);
    setNameDraft(item.name || '');
  };

  const saveLocalRename = (id: string) => {
    updateLocalSnapshot(id, { name: nameDraft });
    setEditingId(null);
    setNameDraft('');
    setItems(listLocalSnapshots());
    toast({ title: 'Saved', description: 'Library item renamed.' });
  };

  const beginEditContent = (item: LocalSnapshot) => {
    setEditingContentId(item.id);
    setContentDraft(item.markdown);
  };

  const saveContent = (id: string) => {
    updateLocalSnapshot(id, { markdown: contentDraft });
    setEditingContentId(null);
    setContentDraft('');
    setItems(listLocalSnapshots());
    toast({ title: 'Saved', description: 'Library content updated.' });
  };

  const downloadAsMarkdown = (item: LocalSnapshot) => {
    const safeName = (item.name || 'ost')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = `${safeName || 'ost'}.md`;
    const blob = new Blob([item.markdown], { type: 'text/markdown;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
    toast({ title: 'Downloaded', description: `${filename} downloaded.` });
  };

  const syncCountLabel = useMemo(() => {
    const synced = items.filter((item) => !!item.syncedAt).length;
    return `${synced}/${items.length} synced`;
  }, [items]);

  const syncNow = async () => {
    if (!syncAvailable) return;

    if (!cloudUser) {
      const returnTo = '/shares';
      window.location.href = `/api/auth/login?provider=github&returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    setSyncing(true);
    try {
      let syncedItems = 0;
      for (const item of items) {
        const payload = {
          markdown: item.markdown,
          name: item.name,
          settings: item.settings,
          collapsedIds: item.collapsedIds || [],
        };

        let cloudId = item.cloudShareId;
        if (!cloudId && item.sourceType === 'share-cloud' && item.sourceKey?.startsWith('cloud:')) {
          cloudId = item.sourceKey.slice('cloud:'.length);
        }

        if (cloudId) {
          try {
            await updateStoredShare(cloudId, payload);
            updateLocalSnapshot(item.id, { cloudShareId: cloudId, syncedAt: Date.now() });
            syncedItems += 1;
            continue;
          } catch (error) {
            const err = error as Error & { status?: number };
            if (err.status !== 403 && err.status !== 404) {
              throw error;
            }
          }
        }

        const created = await createStoredShare({
          ...payload,
          visibility: 'private',
          ttlDays: 90,
        });
        updateLocalSnapshot(item.id, { cloudShareId: created.id, syncedAt: Date.now() });
        syncedItems += 1;
      }

      setItems(listLocalSnapshots());
      toast({ title: 'Sync complete', description: `${syncedItems} item(s) synced to cloud.` });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Could not sync Library items.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto text-sm text-muted-foreground">Loading Library...</div>
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
              Your OSTs are auto-saved locally. Active entry updates automatically while editing.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to builder
          </Button>
        </div>

        {syncAvailable ? (
          <div className="rounded-md border border-border bg-card p-4 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="text-sm font-medium">Cloud Sync</div>
              <div className="text-xs text-muted-foreground">
                {cloudUser ? `Signed in as ${cloudUser.name || 'user'} · ${syncCountLabel}` : 'Sign in to sync your local Library to cloud.'}
              </div>
            </div>
            <Button onClick={() => void syncNow()} disabled={syncing}>
              {syncing ? 'Syncing...' : cloudUser ? 'Sync now' : 'Sign in to sync'}
            </Button>
          </div>
        ) : cloudToggleEnabled ? (
          <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Cloud sync is disabled in this environment.
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No Library items yet. Start editing and your OST will be auto-saved here.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{item.name}</div>
                  <Badge variant="outline" className={sourceBadgeClass(item.sourceType)}>
                    {localSourceLabel(item.sourceType)}
                  </Badge>
                  {item.syncedAt ? (
                    <Badge variant="secondary">synced</Badge>
                  ) : null}
                </div>

                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(item.updatedAt).toLocaleString()}
                </div>
                {item.lastOpenedAt ? (
                  <div className="text-xs text-muted-foreground">
                    Last opened from share: {new Date(item.lastOpenedAt).toLocaleString()}
                  </div>
                ) : null}

                {editingId === item.id ? (
                  <div className="flex gap-2">
                    <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                    <Button size="sm" onClick={() => saveLocalRename(item.id)}>
                      Save
                    </Button>
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
                      <Button size="sm" onClick={() => saveContent(item.id)}>
                        Save content
                      </Button>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingLoadItem(item)}
                    >
                      {item.sourceType === 'draft' ? 'Edit in builder' : 'Load in builder'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => beginEditContent(item)}>
                      Edit Markdown
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void copyLocalShareLink(item)}>
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopy(item.markdown, 'Markdown copied.')}
                    >
                      Copy markdown
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadAsMarkdown(item)}>
                      Download Markdown
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
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!pendingLoadItem} onOpenChange={(open) => !open && setPendingLoadItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLoadItem?.sourceType === 'draft' ? 'Edit in builder?' : 'Load in builder?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current builder view with "{pendingLoadItem?.name || 'this item'}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLoadItem) {
                  openLocalSnapshot(pendingLoadItem);
                }
                setPendingLoadItem(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
