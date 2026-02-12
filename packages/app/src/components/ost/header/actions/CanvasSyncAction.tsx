import { useEffect, useMemo, useState } from 'react';
import { Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createStoredShare, getAuthMe, getStoredShare, updateStoredShare } from '@/lib/storedShareApi';
import {
  buildSnapshotPayloadHash,
  findLocalSnapshotBySource,
  getActiveLocalSnapshotSourceKey,
  type LocalSnapshot,
  updateLocalSnapshot,
} from '@/lib/localSnapshots';
import { useOSTStore } from '@/store/ostStore';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const CLOUD_SHARE_UI_TOGGLE_KEY = 'ost:feature:cloud-share';

function isCloudShareUiEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = (window.localStorage.getItem(CLOUD_SHARE_UI_TOGGLE_KEY) || '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'enabled' || raw === 'on';
}

function resolveCloudId(sourceKey: string | null, linkedCloudId?: string): string | null {
  if (linkedCloudId) return linkedCloudId;
  if (sourceKey?.startsWith('cloud:')) {
    return sourceKey.slice('cloud:'.length);
  }
  return null;
}

type SyncVisualState = 'not-linked' | 'local-ahead' | 'in-sync' | 'cloud-ahead';

function getSyncVisualState(
  snapshot: LocalSnapshot | null,
  localPayloadHash: string,
  remotePayloadHash: string | null,
  remoteUpdatedAt: number | null,
): SyncVisualState {
  if (!snapshot) return 'not-linked';
  const cloudId = resolveCloudId(snapshot.sourceKey || null, snapshot.cloudShareId);
  if (!cloudId) return 'not-linked';

  if (remotePayloadHash && remotePayloadHash === localPayloadHash) {
    return 'in-sync';
  }
  if (remoteUpdatedAt && remoteUpdatedAt > (snapshot.updatedAt || 0)) {
    return 'cloud-ahead';
  }
  return 'local-ahead';
}

export function CanvasSyncAction() {
  const { getSharePayload } = useOSTStore();
  const markdown = useOSTStore((state) => state.markdown);
  const projectName = useOSTStore((state) => state.projectName);
  const collapsedCount = useOSTStore((state) => state.collapsedCardIds.length);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<number | null>(null);
  const [remotePayloadHash, setRemotePayloadHash] = useState<string | null>(null);

  const show = useMemo(
    () => isCloudShareUiEnabled() && featureEnabled && loggedIn,
    [featureEnabled, loggedIn],
  );
  const activeSourceKey = useMemo(
    () => getActiveLocalSnapshotSourceKey(),
    [markdown, projectName, collapsedCount, syncing],
  );
  const activeSnapshot = useMemo(
    () => (activeSourceKey ? findLocalSnapshotBySource(activeSourceKey) : null),
    [activeSourceKey, markdown, projectName, collapsedCount, syncing],
  );
  const activeCloudId = useMemo(
    () => resolveCloudId(activeSourceKey, activeSnapshot?.cloudShareId),
    [activeSourceKey, activeSnapshot?.cloudShareId],
  );
  const localPayloadHash = useMemo(() => {
    const payload = getSharePayload();
    return buildSnapshotPayloadHash({
      name: payload.name,
      markdown: payload.markdown,
      settings: payload.settings,
      collapsedIds: payload.collapsedIds,
    });
  }, [getSharePayload, markdown, projectName, collapsedCount, syncing]);
  const visualState = useMemo(
    () => getSyncVisualState(activeSnapshot, localPayloadHash, remotePayloadHash, remoteUpdatedAt),
    [activeSnapshot, localPayloadHash, remotePayloadHash, remoteUpdatedAt],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!activeCloudId) {
        setRemoteUpdatedAt(null);
        setRemotePayloadHash(null);
        return;
      }
      try {
        const share = await getStoredShare(activeCloudId);
        if (!active) return;
        setRemoteUpdatedAt(share.updatedAt || null);
        setRemotePayloadHash(
          buildSnapshotPayloadHash({
            name: share.name || '',
            markdown: share.markdown,
            settings: share.settings,
            collapsedIds: share.collapsedIds || [],
          }),
        );
      } catch {
        if (!active) return;
        setRemoteUpdatedAt(null);
        setRemotePayloadHash(null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [activeCloudId, syncing]);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const payload = getSharePayload();
      const snapshot = activeSnapshot;
      const cloudId = resolveCloudId(activeSourceKey, snapshot?.cloudShareId);

      if (cloudId) {
        await updateStoredShare(cloudId, payload);
        if (snapshot) {
          updateLocalSnapshot(snapshot.id, { cloudShareId: cloudId, syncedAt: Date.now() });
        }
        toast({ title: 'Synced', description: 'Cloud copy updated.' });
        return;
      }

      const created = await createStoredShare({
        ...payload,
        visibility: 'public',
        ttlDays: 30,
      });

      if (snapshot) {
        updateLocalSnapshot(snapshot.id, { cloudShareId: created.id, syncedAt: Date.now() });
      }

      toast({ title: 'Synced', description: 'Cloud copy created.' });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Could not sync to cloud.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !show) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8',
        visualState === 'in-sync' && 'text-emerald-600',
        visualState === 'local-ahead' && 'text-amber-600',
        visualState === 'cloud-ahead' && 'text-sky-600',
        visualState === 'not-linked' && 'text-muted-foreground',
      )}
      onClick={() => void handleSync()}
      title={
        visualState === 'in-sync'
          ? 'In sync with cloud'
          : visualState === 'local-ahead'
            ? 'Local changes not synced'
            : visualState === 'cloud-ahead'
              ? 'Cloud version is newer'
              : 'Not linked to cloud'
      }
      aria-label="Sync to cloud"
      disabled={syncing}
    >
      <Cloud className="w-4 h-4" />
    </Button>
  );
}
