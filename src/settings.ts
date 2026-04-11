import { useCallback, useState } from 'react';
import type { WinterTerrainLevel } from '../types';

export type WinterTerrainLevelSetting = WinterTerrainLevel | 'summer';
export interface Settings {
  visibleTerrainLevels: Record<WinterTerrainLevelSetting, boolean>;
  activeKeywords: Set<string>;
}

const defaultSettings: Settings = {
  visibleTerrainLevels: {
    A: true,
    B: true,
    C: true,
    summer: true,
  },
  activeKeywords: new Set(),
};

export function useSettings(): [Settings, (level: WinterTerrainLevelSetting, value: boolean) => void, (keyword: string) => void] {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const updateTerrainLevel = useCallback((level: WinterTerrainLevelSetting, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      visibleTerrainLevels: {
        ...prev.visibleTerrainLevels,
        [level]: value,
      },
    }));
  }, []);

  const toggleKeyword = useCallback((keyword: string) => {
    setSettings((prev) => {
      const next = new Set(prev.activeKeywords);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return { ...prev, activeKeywords: next };
    });
  }, []);

  return [settings, updateTerrainLevel, toggleKeyword];
}
