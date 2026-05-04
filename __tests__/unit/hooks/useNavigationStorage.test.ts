import { renderHook, act } from '@testing-library/react';
import {
  buildInitialCollapsedSections,
  clearNavigationStorage,
  useNavigationStorage,
} from '@/hooks/useNavigationStorage';
import type { NavSection } from '@/hooks/useNavigation';

// ─── helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  SIDEBAR_OPEN: 'orangecat_sidebar_open',
  SIDEBAR_COLLAPSED: 'orangecat_sidebar_collapsed',
  COLLAPSED_SECTIONS: 'orangecat_collapsed_sections',
};

const basicSections: NavSection[] = [
  {
    id: 'main',
    title: 'Main',
    items: [],
    collapsible: true,
    defaultExpanded: true,
    priority: 1,
  },
  {
    id: 'discover',
    title: 'Discover',
    items: [],
    collapsible: true,
    defaultExpanded: false,
    priority: 2,
  },
  {
    id: 'settings',
    title: 'Settings',
    items: [],
    collapsible: false,
    defaultExpanded: false,
    priority: 5,
  },
];

// The global localStorage mock in jest.setup.ts has no implementations.
// We provide a real in-memory backing store per test.
function setupLocalStorageMock() {
  const store: Record<string, string> = {};
  jest
    .spyOn(window.localStorage, 'getItem')
    .mockImplementation(key => (key in store ? store[key] : null));
  jest.spyOn(window.localStorage, 'setItem').mockImplementation((key, val) => {
    store[key] = val;
  });
  jest.spyOn(window.localStorage, 'removeItem').mockImplementation(key => {
    delete store[key];
  });
  jest.spyOn(window.localStorage, 'clear').mockImplementation(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });
  return store;
}

// ─── buildInitialCollapsedSections ──────────────────────────────────────────

describe('buildInitialCollapsedSections', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
  });

  it('collapses collapsible sections that are not defaultExpanded (desktop)', () => {
    const collapsed = buildInitialCollapsedSections(basicSections);
    expect(collapsed.has('discover')).toBe(true);
  });

  it('does not collapse sections that are defaultExpanded (desktop)', () => {
    const collapsed = buildInitialCollapsedSections(basicSections);
    expect(collapsed.has('main')).toBe(false);
  });

  it('does not collapse non-collapsible sections (desktop)', () => {
    const collapsed = buildInitialCollapsedSections(basicSections);
    expect(collapsed.has('settings')).toBe(false);
  });

  it('on mobile collapses collapsible sections with priority > 3', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    const mobileSections: NavSection[] = [
      { id: 'low', title: 'Low', items: [], collapsible: true, defaultExpanded: true, priority: 2 },
      {
        id: 'high',
        title: 'High',
        items: [],
        collapsible: true,
        defaultExpanded: true,
        priority: 4,
      },
    ];
    const collapsed = buildInitialCollapsedSections(mobileSections);
    expect(collapsed.has('low')).toBe(false);
    expect(collapsed.has('high')).toBe(true);
  });

  it('returns empty set when no collapsible sections', () => {
    const sections: NavSection[] = [
      { id: 'a', title: 'A', items: [], collapsible: false, priority: 1 },
    ];
    expect(buildInitialCollapsedSections(sections).size).toBe(0);
  });

  it('returns empty set for empty sections array', () => {
    expect(buildInitialCollapsedSections([]).size).toBe(0);
  });
});

// ─── clearNavigationStorage ─────────────────────────────────────────────────

describe('clearNavigationStorage', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes all three storage keys', () => {
    window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, 'true');
    window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');
    window.localStorage.setItem(STORAGE_KEYS.COLLAPSED_SECTIONS, '["a"]');

    clearNavigationStorage();

    expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.COLLAPSED_SECTIONS)).toBeNull();
  });

  it('does not throw when storage is empty', () => {
    expect(() => clearNavigationStorage()).not.toThrow();
  });
});

// ─── useNavigationStorage ───────────────────────────────────────────────────

describe('useNavigationStorage', () => {
  let onStateLoaded: jest.Mock;
  let onLoadFailed: jest.Mock;

  beforeEach(() => {
    onStateLoaded = jest.fn();
    onLoadFailed = jest.fn();
    setupLocalStorageMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not call onStateLoaded when hydrated is false', () => {
    renderHook(() => useNavigationStorage(false, basicSections, { onStateLoaded, onLoadFailed }));
    expect(onStateLoaded).not.toHaveBeenCalled();
    expect(onLoadFailed).not.toHaveBeenCalled();
  });

  it('calls onStateLoaded exactly once when hydrated becomes true', () => {
    const { rerender } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useNavigationStorage(hydrated, basicSections, { onStateLoaded, onLoadFailed }),
      { initialProps: { hydrated: false } }
    );

    expect(onStateLoaded).not.toHaveBeenCalled();

    act(() => {
      rerender({ hydrated: true });
    });

    expect(onStateLoaded).toHaveBeenCalledTimes(1);
  });

  it('loads saved state from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, 'true');
    window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');
    window.localStorage.setItem(STORAGE_KEYS.COLLAPSED_SECTIONS, '["main","discover"]');

    renderHook(() => useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed }));

    expect(onStateLoaded).toHaveBeenCalledWith({
      isSidebarOpen: true,
      isSidebarCollapsed: true,
      collapsedSections: new Set(['main', 'discover']),
    });
  });

  it('falls back to defaults when localStorage is empty', () => {
    renderHook(() => useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed }));

    expect(onStateLoaded).toHaveBeenCalledWith(
      expect.objectContaining({
        isSidebarOpen: false,
        isSidebarCollapsed: false,
      })
    );
  });

  it('calls onLoadFailed when localStorage throws', () => {
    jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });

    renderHook(() => useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed }));

    expect(onLoadFailed).toHaveBeenCalledTimes(1);
    expect(onStateLoaded).not.toHaveBeenCalled();
  });

  // CRITICAL REGRESSION: when the caller passes a new callback reference (unstable fn),
  // the effect re-fires. This test documents that contract so the fix in useNavigation.ts
  // (stable ref pattern) remains necessary.
  it('re-fires the effect when a new callback reference is passed', () => {
    const { rerender } = renderHook(
      ({ cb }: { cb: jest.Mock }) =>
        useNavigationStorage(true, basicSections, {
          onStateLoaded: cb,
          onLoadFailed: jest.fn(),
        }),
      { initialProps: { cb: onStateLoaded } }
    );

    expect(onStateLoaded).toHaveBeenCalledTimes(1);

    const newCb = jest.fn();
    act(() => {
      rerender({ cb: newCb });
    });

    // New reference triggers a second effect run — the caller must stabilize the ref.
    expect(newCb).toHaveBeenCalledTimes(1);
  });

  describe('persist helpers', () => {
    it('persistSidebarState writes to localStorage', () => {
      const { result } = renderHook(() =>
        useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed })
      );

      act(() => {
        result.current.persistSidebarState(true);
      });

      expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN)).toBe('true');
    });

    it('persistSidebarCollapsedState writes to localStorage', () => {
      const { result } = renderHook(() =>
        useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed })
      );

      act(() => {
        result.current.persistSidebarCollapsedState(true);
      });

      expect(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED)).toBe('true');
    });

    it('persistCollapsedSections serializes the Set to localStorage', () => {
      const { result } = renderHook(() =>
        useNavigationStorage(true, basicSections, { onStateLoaded, onLoadFailed })
      );

      act(() => {
        result.current.persistCollapsedSections(new Set(['main', 'discover']));
      });

      const stored = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.COLLAPSED_SECTIONS) ?? '[]'
      );
      expect(stored).toEqual(expect.arrayContaining(['main', 'discover']));
      expect(stored).toHaveLength(2);
    });
  });
});
