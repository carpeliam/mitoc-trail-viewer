import { useCallback, useState } from 'react';
import type { WinterTerrainLevel } from '../types';

export type WinterTerrainLevelSetting = WinterTerrainLevel | 'summer';
export interface Settings {
  visibleTerrainLevels: Record<WinterTerrainLevelSetting, boolean>;
}

const defaultSettings: Settings = {
  visibleTerrainLevels: {
    A: true,
    B: true,
    C: true,
    summer: true,
  },
};

export function useSettings(): [Settings, (level: WinterTerrainLevelSetting, value: boolean) => void] {
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

  return [settings, updateTerrainLevel];
}
