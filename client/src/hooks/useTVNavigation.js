import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Universal TV Remote Key Codes across Samsung Tizen, LG webOS,
 * Android TV, Google TV, Fire TV, Apple TV, and standard IR remotes.
 */
const TV_KEYS = {
  UP: ['ArrowUp', 'Up', '38'],
  DOWN: ['ArrowDown', 'Down', '40'],
  LEFT: ['ArrowLeft', 'Left', '37'],
  RIGHT: ['ArrowRight', 'Right', '39'],
  ENTER: ['Enter', 'Select', 'Ok', '13'],
  BACK: ['Escape', 'Backspace', 'Back', 'GoBack', 'BrowserBack', '27', '8', '10009', '461'],
  PLAY_PAUSE: [' ', 'MediaPlayPause', 'MediaPlay', 'MediaPause', 'Play', 'Pause', '179'],
  ZOOM_IN: ['+', '=', 'ZoomIn'],
  ZOOM_OUT: ['-', '_', 'ZoomOut'],
  ZOOM_RESET: ['0', 'Digit0'],
};

function matchesKey(event, keyGroup) {
  const key = event.key;
  const code = String(event.keyCode || event.which);
  return keyGroup.includes(key) || keyGroup.includes(code);
}

/**
 * Dual-Zone Spatial TV Remote Navigation Hook
 * Zone 0: Category Tabs (All, Images, Videos, PDFs, Messages)
 * Zone 1: Gallery Cards Grid
 * Seamlessly moves between Tabs and Grid without unwanted page reloads or tab switches!
 */
export function useTVNavigation({
  itemCount,
  columns = 4,
  tabsCount = 5,
  currentTab = 0,
  onTabChange,
  onSelect,
  onBack,
  isEnabled = true,
  initialIndex = 0,
}) {
  const [activeZone, setActiveZone] = useState('grid'); // 'tabs' or 'grid'
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const [focusedTabIndex, setFocusedTabIndex] = useState(currentTab);
  const lastKeyTimeRef = useRef(0);

  // Synchronize focused tab index with external prop
  useEffect(() => {
    setFocusedTabIndex(currentTab);
  }, [currentTab]);

  // Adjust focused grid index when itemCount changes
  useEffect(() => {
    if (itemCount === 0) {
      setFocusedIndex(0);
      setActiveZone('tabs'); // If no files, keep focus on tabs
    } else if (focusedIndex >= itemCount) {
      setFocusedIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, focusedIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!isEnabled) return;

      const now = Date.now();
      // 100ms debounce to prevent IR remote signal bouncing
      if (now - lastKeyTimeRef.current < 100) return;

      // Handle BACK / ESC
      if (matchesKey(e, TV_KEYS.BACK)) {
        e.preventDefault();
        lastKeyTimeRef.current = now;
        if (onBack) onBack();
        return;
      }

      // ── ZONE 0: CATEGORY TABS ─────────────────────────
      if (activeZone === 'tabs') {
        if (matchesKey(e, TV_KEYS.RIGHT)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          const nextTab = (focusedTabIndex + 1) % tabsCount;
          setFocusedTabIndex(nextTab);
          if (onTabChange) onTabChange(nextTab);
        } else if (matchesKey(e, TV_KEYS.LEFT)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          const prevTab = (focusedTabIndex - 1 + tabsCount) % tabsCount;
          setFocusedTabIndex(prevTab);
          if (onTabChange) onTabChange(prevTab);
        } else if (matchesKey(e, TV_KEYS.DOWN)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          if (itemCount > 0) {
            setActiveZone('grid');
            setFocusedIndex(0);
          }
        } else if (matchesKey(e, TV_KEYS.ENTER)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          if (onTabChange) onTabChange(focusedTabIndex);
          if (itemCount > 0) {
            setActiveZone('grid');
          }
        }
        return;
      }

      // ── ZONE 1: GALLERY GRID ──────────────────────────
      if (activeZone === 'grid') {
        if (matchesKey(e, TV_KEYS.RIGHT)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          setFocusedIndex((prev) => (prev + 1 < itemCount ? prev + 1 : prev));
        } else if (matchesKey(e, TV_KEYS.LEFT)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
        } else if (matchesKey(e, TV_KEYS.DOWN)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          setFocusedIndex((prev) => {
            const next = prev + columns;
            return next < itemCount ? next : prev;
          });
        } else if (matchesKey(e, TV_KEYS.UP)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          if (focusedIndex < columns) {
            // Reached top row -> move focus to Category Tabs!
            setActiveZone('tabs');
          } else {
            setFocusedIndex((prev) => prev - columns);
          }
        } else if (matchesKey(e, TV_KEYS.ENTER)) {
          e.preventDefault();
          lastKeyTimeRef.current = now;
          if (onSelect) onSelect(focusedIndex);
        }
      }
    },
    [
      isEnabled,
      activeZone,
      focusedTabIndex,
      tabsCount,
      focusedIndex,
      itemCount,
      columns,
      onTabChange,
      onSelect,
      onBack,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    activeZone,
    setActiveZone,
    focusedIndex,
    setFocusedIndex,
    focusedTabIndex,
    setFocusedTabIndex,
  };
}
