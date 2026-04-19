import { useCallback, useState } from 'react';
import type { Feature, LineString } from 'geojson';
import type { WinterTerrainLevel, DifficultyRating, RouteProperties } from '../types';

export type WinterTerrainLevelSetting = WinterTerrainLevel | 'summer';
export type DifficultyRatingSetting = DifficultyRating | 'includeSpicy';

export interface Settings {
  visibleTerrainLevels: Record<WinterTerrainLevelSetting, boolean>;
  visibleDifficulties: Record<DifficultyRatingSetting, boolean>;
  distance?: [number, number];
  elevationGain?: [number, number];
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

export function useSettings() {
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

  const updateDistance = useCallback((distance: [number, number]) => {
    setSettings((prev) => ({
      ...prev,
      distance,
    }));
  }, []);

  const updateElevationGain = useCallback((elevationGain: [number, number]) => {
    setSettings((prev) => ({
      ...prev,
      elevationGain,
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

  return { settings, updateTerrainLevel, updateDifficultyRating, updateDistance, updateElevationGain, toggleKeyword };
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

  const passesDistance =
    settings.distance === undefined
      ? true
      : f.properties.distance >= settings.distance[0] && f.properties.distance <= settings.distance[1];

  const passesElevationGain =
    settings.elevationGain === undefined
      ? true
      : f.properties.total_elevation_gain >= settings.elevationGain[0] && f.properties.total_elevation_gain <= settings.elevationGain[1];

  const passesKeywords =
    settings.activeKeywords.size === 0 ||
      f.properties.trips.some(t =>
        t.keywords?.some(kw => settings.activeKeywords.has(kw)),
      );

  return passesWinterTerrainLevel && passesDifficultyRating && passesDistance && passesElevationGain && passesKeywords;
}

export function filterKey(settings: Settings): string {
  const activeTerrainLevels = (Object.keys(settings.visibleTerrainLevels) as WinterTerrainLevelSetting[])
    .filter(k => settings.visibleTerrainLevels[k])
    .join();
  const activeDifficulties = (Object.keys(settings.visibleDifficulties) as DifficultyRatingSetting[])
    .filter(k => settings.visibleDifficulties[k])
    .join();
  const distance = (settings.distance ?? []).join(':');
  const elevationGain = (settings.elevationGain ?? []).join(':');
  return `${activeTerrainLevels}-${activeDifficulties}-${distance}-${elevationGain}-${[...settings.activeKeywords].join(':')}`;
}
