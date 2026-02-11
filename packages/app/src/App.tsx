import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useOSTStore } from '@/store/ostStore';
import { decodeMarkdownFromUrlFragment } from '@ost-builder/shared';
import {
  buildFragmentSourceKey,
  findLocalSnapshotBySource,
  getActiveLocalSnapshotSourceKey,
  setActiveLocalSnapshotSourceKey,
  upsertLocalSnapshotBySource,
  upsertDraftSnapshot,
  upsertShareSnapshot,
} from '@/lib/localSnapshots';
import CdnStats from '@/components/analytics/CdnStats';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import StoredShareOpen from './pages/StoredShareOpen';
import Library from './pages/Library.tsx';

const queryClient = new QueryClient();

function LibraryAutoSave() {
  const markdown = useOSTStore((state) => state.markdown);
  const projectName = useOSTStore((state) => state.projectName);
  const layoutDirection = useOSTStore((state) => state.layoutDirection);
  const experimentLayout = useOSTStore((state) => state.experimentLayout);
  const viewDensity = useOSTStore((state) => state.viewDensity);
  const collapsedCardIds = useOSTStore((state) => state.collapsedCardIds);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      const payload = {
        name: projectName,
        markdown,
        settings: {
          layoutDirection,
          experimentLayout,
          viewDensity,
        },
        collapsedIds: collapsedCardIds,
      };

      const activeSourceKey = getActiveLocalSnapshotSourceKey();
      if (activeSourceKey) {
        const existing = findLocalSnapshotBySource(activeSourceKey);
        if (existing?.sourceType) {
          upsertLocalSnapshotBySource(activeSourceKey, existing.sourceType, payload);
          return;
        }
      }

      upsertDraftSnapshot(payload);
    }, 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [markdown, projectName, layoutDirection, experimentLayout, viewDensity, collapsedCardIds]);

  return null;
}

function ShareLinkLoader() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;

    // Accept links like: /#<fragment>
    // `loadFromShareLink` also accepts full URLs and raw fragments.
    const loaded = useOSTStore.getState().loadFromShareLink(hash);
    if (loaded) {
      const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
      const decoded = decodeMarkdownFromUrlFragment(fragment);
      if (decoded) {
        const sourceKey = buildFragmentSourceKey(fragment);
        upsertShareSnapshot(sourceKey, 'share-fragment', {
          name: decoded.name || useOSTStore.getState().projectName,
          markdown: decoded.markdown,
          settings: decoded.settings,
          collapsedIds: decoded.collapsedIds || [],
        });
        setActiveLocalSnapshotSourceKey(sourceKey);
      }
    }

    // If decoding succeeded, clear the hash so we don't re-apply on refresh
    if (loaded && typeof window !== 'undefined') {
      window.history.replaceState(null, '', location.pathname + location.search);
    }
  }, [location.hash]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CdnStats />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LibraryAutoSave />
        <ShareLinkLoader />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/s/:id" element={<StoredShareOpen />} />
          <Route path="/library" element={<Library />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
