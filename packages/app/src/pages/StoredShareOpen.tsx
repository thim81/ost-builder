import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getStoredShare } from '@/lib/storedShareApi';
import { useOSTStore } from '@/store/ostStore';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'auth-required' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; message: string };

export default function StoredShareOpen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { loadFromStoredShare } = useOSTStore();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    const run = async () => {
      setState({ kind: 'loading' });
      try {
        const payload = await getStoredShare(id);
        if (!active) return;
        loadFromStoredShare({
          markdown: payload.markdown,
          name: payload.name || undefined,
          settings: payload.settings,
          collapsedIds: payload.collapsedIds,
        });
        navigate('/', { replace: true });
      } catch (error) {
        if (!active) return;
        const err = error as Error & {
          status?: number;
          payload?: { reason?: string; login?: { github?: string; google?: string } };
        };
        if (err.status === 401) {
          setState({ kind: 'auth-required' });
          return;
        }
        if (err.status === 404) {
          setState({ kind: 'unavailable', reason: err.payload?.reason || 'not_found' });
          return;
        }
        setState({ kind: 'error', message: err.message || 'Failed to load share.' });
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [id, loadFromStoredShare, navigate]);

  const title = useMemo(() => {
    if (state.kind === 'auth-required') return 'Private Share';
    if (state.kind === 'unavailable') return 'Link Unavailable';
    if (state.kind === 'error') return 'Could Not Load Share';
    return 'Loading Share';
  }, [state.kind]);

  return (
    <div className="h-screen w-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 space-y-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {state.kind === 'loading' && (
          <p className="text-sm text-muted-foreground">Fetching shared opportunity tree...</p>
        )}
        {state.kind === 'auth-required' && (
          <>
            <p className="text-sm text-muted-foreground">
              This share is private. Sign in as the owner to view it.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href =
                    `/api/auth/login?provider=github&returnTo=${encodeURIComponent(`/s/${id}`)}`)
                }
              >
                Continue with GitHub
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href =
                    `/api/auth/login?provider=google&returnTo=${encodeURIComponent(`/s/${id}`)}`)
                }
              >
                Continue with Google
              </Button>
            </div>
          </>
        )}
        {state.kind === 'unavailable' && (
          <>
            <p className="text-sm text-muted-foreground">
              This link is unavailable ({state.reason}). It may be expired or deleted.
            </p>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
              Go to builder
            </Button>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
              Go to builder
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
