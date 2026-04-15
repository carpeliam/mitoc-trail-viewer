import { useCallback, useState } from 'react';
import type { Feature, LineString } from 'geojson';
import type { WinterTerrainLevel, DifficultyRating, RouteProperties } from '../types';

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

export function isVisible(f: Feature<LineString, RouteProperties>, settings: Settings): boolean {
  const passesWinterTerrainLevel = f.properties.trips.some(({ winterTerrainLevel }) => (
    settings.visibleTerrainLevels[winterTerrainLevel ?? 'summer']
  ));

  const difficultyRatings = f.properties.trips.map((t) => t.difficultyRating).filter(r => r !== undefined);
  const passesDifficultyRating = (difficultyRatings.length === 0)
    ? Object.values(settings.visibleDifficulties).every(v => v)
    : difficultyRatings.some((difficultyRating) => {
        const parts = difficultyRating.split(/[\s-]+/);
        const isSpicy = parts.includes('S+');

        if (isSpicy && !settings.visibleDifficulties.includeSpicy) return false;
        return parts
          .filter((p): p is DifficultyRating => p !== 'S+')
          .some(p => settings.visibleDifficulties[p]);
      });

  const passesKeywords =
    settings.activeKeywords.size === 0 ||
      f.properties.trips.some(t =>
        t.keywords?.some(kw => settings.activeKeywords.has(kw)),
      );

  return passesWinterTerrainLevel && passesDifficultyRating && passesKeywords;
}

export function filterKey(settings: Settings): string {
  const activeTerrainLevels = (Object.keys(settings.visibleTerrainLevels) as WinterTerrainLevelSetting[])
    .filter(k => settings.visibleTerrainLevels[k])
    .join();
  const activeDifficulties = (Object.keys(settings.visibleDifficulties) as DifficultyRatingSetting[])
    .filter(k => settings.visibleDifficulties[k])
    .join();
  return `${activeTerrainLevels}-${activeDifficulties}-${[...settings.activeKeywords].join(':')}`;
}
