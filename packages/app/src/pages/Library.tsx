import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeMarkdownToUrlFragment } from '@ost-builder/shared';
import {
  ArrowLeft,
  Cloud,
  Copy,
  Edit3,
  FileDown,
  Library as LibraryIcon,
  Loader2,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';
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
  clearActiveLocalSnapshotSourceKey,
  deleteLocalSnapshot,
  getActiveLocalSnapshotSourceKey,
  listLocalSnapshots,
  setActiveLocalSnapshotSourceKey,
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

function EditInBuilderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 4.75a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM2.5 19.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 6.5Z"></path>
      <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z"></path>
      <path d="M17.5 8.75v-1H19v1a3.75 3.75 0 0 1-3.75 3.75h-7a1.75 1.75 0 0 0-1.75 1.75H5A3.25 3.25 0 0 1 8.25 11h7a2.25 2.25 0 0 0 2.25-2.25Z"></path>
    </svg>
  );
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
  const [pendingDeleteItem, setPendingDeleteItem] = useState<LocalSnapshot | null>(null);

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
    const sourceKey = item.sourceKey || `item:${item.id}`;
    if (!item.sourceKey) {
      updateLocalSnapshot(item.id, { sourceKey, sourceType: item.sourceType || 'manual' });
      setItems(listLocalSnapshots());
    }
    setActiveLocalSnapshotSourceKey(sourceKey);
    loadFromStoredShare({
      markdown: item.markdown,
      name: item.name,
      settings: item.settings,
      collapsedIds: item.collapsedIds || [],
    });
    navigate('/');
  };

  const removeLocal = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (item?.sourceKey) {
      const active = getActiveLocalSnapshotSourceKey();
      if (active === item.sourceKey) {
        clearActiveLocalSnapshotSourceKey();
      }
    }
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
      const returnTo = '/library';
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
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <LibraryIcon className="w-6 h-6" />
              Saved Library
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Your OSTs are auto-saved locally. Active entry updates automatically while editing.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to builder
          </Button>
        </div>

        {syncAvailable ? (
          <div className="rounded-md border border-border bg-card p-4 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Cloud Sync
              </div>
              <div className="text-xs text-muted-foreground">
                {cloudUser ? `Signed in as ${cloudUser.name || 'user'} · ${syncCountLabel}` : 'Sign in to sync your local Library to cloud.'}
              </div>
            </div>
            <Button onClick={() => void syncNow()} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : cloudUser ? (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Sync now
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Sign in to sync
                </>
              )}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{item.name}</div>
                    <Badge variant="outline" className={sourceBadgeClass(item.sourceType)}>
                      {localSourceLabel(item.sourceType)}
                    </Badge>
                    {item.syncedAt ? (
                      <Badge variant="secondary">synced</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => beginRenameLocal(item)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      variant="destructive"
                      title="Delete"
                      onClick={() => setPendingDeleteItem(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
                      onClick={() => {
                        if (item.sourceType === 'draft') {
                          openLocalSnapshot(item);
                          return;
                        }
                        setPendingLoadItem(item);
                      }}
                    >
                      <EditInBuilderIcon className="w-4 h-4 mr-2" />
                      {item.sourceType === 'draft' ? 'Edit in builder' : 'Load in builder'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => beginEditContent(item)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Markdown
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopy(item.markdown, 'Markdown copied.')}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy markdown
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadAsMarkdown(item)}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Markdown
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void copyLocalShareLink(item)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
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
            <AlertDialogTitle>Load in builder?</AlertDialogTitle>
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
      <AlertDialog open={!!pendingDeleteItem} onOpenChange={(open) => !open && setPendingDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete library item?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDeleteItem?.name || 'This item'}" will be removed from your local library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteItem) {
                  removeLocal(pendingDeleteItem.id);
                }
                setPendingDeleteItem(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
