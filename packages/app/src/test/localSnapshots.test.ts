import {
  buildFragmentSourceKey,
  listLocalSnapshots,
  upsertDraftSnapshot,
  upsertShareSnapshot,
  findLocalSnapshotBySource,
} from '@/lib/localSnapshots';

describe('localSnapshots', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('upserts a rolling draft at a stable source key', () => {
    const first = upsertDraftSnapshot({
      name: 'A',
      markdown: '# A',
      collapsedIds: [],
    });
    const second = upsertDraftSnapshot({
      name: 'A2',
      markdown: '# A2',
      collapsedIds: [],
    });

    const all = listLocalSnapshots();
    expect(all).toHaveLength(1);
    expect(first.id).toBe(second.id);
    expect(all[0].sourceKey).toBe('draft:current');
    expect(all[0].name).toBe('A2');
  });

  it('dedupes share-fragment entries by source key', () => {
    const key = buildFragmentSourceKey('abc123');
    upsertShareSnapshot(key, 'share-fragment', {
      name: 'Shared',
      markdown: '# Shared',
      collapsedIds: [],
    });
    upsertShareSnapshot(key, 'share-fragment', {
      name: 'Shared Updated',
      markdown: '# Shared Updated',
      collapsedIds: [],
    });

    const all = listLocalSnapshots();
    expect(all).toHaveLength(1);
    expect(all[0].sourceType).toBe('share-fragment');
    expect(all[0].name).toBe('Shared Updated');
  });

  it('stores separate source entries for cloud and fragment shares', () => {
    upsertShareSnapshot('cloud:xyz', 'share-cloud', {
      name: 'Cloud',
      markdown: '# Cloud',
      collapsedIds: [],
    });
    upsertShareSnapshot(buildFragmentSourceKey('hash'), 'share-fragment', {
      name: 'Hash',
      markdown: '# Hash',
      collapsedIds: [],
    });

    const cloud = findLocalSnapshotBySource('cloud:xyz');
    const fragment = findLocalSnapshotBySource(buildFragmentSourceKey('hash'));

    expect(cloud).toBeTruthy();
    expect(fragment).toBeTruthy();
    expect(listLocalSnapshots()).toHaveLength(2);
  });
});
