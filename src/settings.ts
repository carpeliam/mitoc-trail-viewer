import { useCallback, useState } from 'react';
import type { WinterTerrainLevel, DifficultyRating } from '../types';

export type WinterTerrainLevelSetting = WinterTerrainLevel | 'summer';
export type DifficultyRatingSetting = DifficultyRating | 'includeSpicy';

export interface Settings {
  visibleTerrainLevels: Record<WinterTerrainLevelSetting, boolean>;
  visibleDifficulties: Record<DifficultyRatingSetting, boolean>;
  activeKeywords: Set<string>;
}

const defaultSettings: Settings = {
  visibleTerrainLevels: {
    A: true,
    B: true,
    C: true,
    summer: true,
  },
  visibleDifficulties: {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: true,
    includeSpicy: true,
  },
  activeKeywords: new Set(),
};

export function useSettings(): [Settings, (level: WinterTerrainLevelSetting, value: boolean) => void, (rating: DifficultyRatingSetting, value: boolean) => void, (keyword: string) => void] {
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

  const updateDifficultyRating = useCallback((rating: DifficultyRatingSetting, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      visibleDifficulties: {
        ...prev.visibleDifficulties,
        [rating]: value,
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

  return [settings, updateTerrainLevel, updateDifficultyRating, toggleKeyword];
}
