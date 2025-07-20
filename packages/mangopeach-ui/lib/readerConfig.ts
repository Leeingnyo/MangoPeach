/**
 * Reader configuration management with localStorage persistence
 */

import { useState, useEffect } from 'react';

export type ViewMode = 'scroll' | 'page' | 'dual-page';
export type FitMode = 'fit-width' | 'fit-height' | 'fit-both' | 'original';
export type PageDirection = 'ltr' | 'rtl'; // left-to-right, right-to-left
export type DualPageLayout = 'standard' | 'offset'; // (0,1),(2,3) vs (0),(1,2),(3,4)

export interface ReaderConfig {
  viewMode: ViewMode;
  fitMode: FitMode;
  pageDirection: PageDirection;
  dualPageLayout: DualPageLayout;
}

const DEFAULT_CONFIG: ReaderConfig = {
  viewMode: 'scroll',
  fitMode: 'fit-width',
  pageDirection: 'ltr',
  dualPageLayout: 'standard',
};

const STORAGE_KEY = 'mangopeach-reader-config';

/**
 * Load reader configuration from localStorage
 */
export function loadReaderConfig(): ReaderConfig {
  // Return defaults during SSR (when localStorage is not available)
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(stored);
    
    // Validate and merge with defaults to handle missing fields
    return {
      viewMode: isValidViewMode(parsed.viewMode) ? parsed.viewMode : DEFAULT_CONFIG.viewMode,
      fitMode: isValidFitMode(parsed.fitMode) ? parsed.fitMode : DEFAULT_CONFIG.fitMode,
      pageDirection: isValidPageDirection(parsed.pageDirection) ? parsed.pageDirection : DEFAULT_CONFIG.pageDirection,
      dualPageLayout: isValidDualPageLayout(parsed.dualPageLayout) ? parsed.dualPageLayout : DEFAULT_CONFIG.dualPageLayout,
    };
  } catch (error) {
    console.warn('Failed to load reader config from localStorage:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save reader configuration to localStorage
 */
export function saveReaderConfig(config: ReaderConfig): void {
  // Skip saving during SSR (when localStorage is not available)
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save reader config to localStorage:', error);
  }
}

/**
 * Update a specific field in the reader configuration
 */
export function updateReaderConfig<K extends keyof ReaderConfig>(
  field: K,
  value: ReaderConfig[K]
): ReaderConfig {
  const current = loadReaderConfig();
  const updated = { ...current, [field]: value };
  saveReaderConfig(updated);
  return updated;
}

/**
 * Reset reader configuration to defaults
 */
export function resetReaderConfig(): ReaderConfig {
  const defaultConfig = { ...DEFAULT_CONFIG };
  saveReaderConfig(defaultConfig);
  return defaultConfig;
}

// Validation functions
function isValidViewMode(value: any): value is ViewMode {
  return value === 'scroll' || value === 'page' || value === 'dual-page';
}

function isValidFitMode(value: any): value is FitMode {
  return value === 'fit-width' || value === 'fit-height' || value === 'fit-both' || value === 'original';
}

function isValidPageDirection(value: any): value is PageDirection {
  return value === 'ltr' || value === 'rtl';
}

function isValidDualPageLayout(value: any): value is DualPageLayout {
  return value === 'standard' || value === 'offset';
}

/**
 * React hook for managing reader configuration
 */
export function useReaderConfig() {
  const [config, setConfigState] = useState<ReaderConfig>(() => {
    // Always return defaults during initial render to avoid hydration mismatch
    return { ...DEFAULT_CONFIG };
  });

  // Load from localStorage after component mounts (client-side only)
  useEffect(() => {
    setConfigState(loadReaderConfig());
  }, []);

  const updateConfig = <K extends keyof ReaderConfig>(
    field: K,
    value: ReaderConfig[K]
  ) => {
    const updated = updateReaderConfig(field, value);
    setConfigState(updated);
  };

  const resetConfig = () => {
    const reset = resetReaderConfig();
    setConfigState(reset);
  };

  return {
    config,
    updateConfig,
    resetConfig,
    // Individual setters for convenience
    setViewMode: (mode: ViewMode) => updateConfig('viewMode', mode),
    setFitMode: (mode: FitMode) => updateConfig('fitMode', mode),
    setPageDirection: (direction: PageDirection) => updateConfig('pageDirection', direction),
    setDualPageLayout: (layout: DualPageLayout) => updateConfig('dualPageLayout', layout),
  };
}