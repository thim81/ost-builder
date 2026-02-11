import { useEffect, useMemo, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOSTStore } from '@/store/ostStore';
import { createStoredShare, getAuthMe } from '@/lib/storedShareApi';
import { toast } from '@/components/ui/use-toast';

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
        visibility: 'private',
        ttlDays: 30,
        settings: payload.settings,
        collapsedIds: payload.collapsedIds,
      });
      await navigator.clipboard.writeText(result.link);
      toast({
        title: 'Copied',
        description: 'Cloud share link created and copied.',
      });
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
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={() => void handleCloudShare()}
      disabled={submitting}
    >
      <CloudUpload className="w-4 h-4" />
      <span className="hidden sm:inline">Cloud share</span>
    </Button>
  );
}
