export type WinterTerrainLevel = 'A' | 'B' | 'C';
export type DifficultyRating = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type RangeRating = `${DifficultyRating}-${DifficultyRating}`;
export type DifficultyRatingValue = DifficultyRating | RangeRating | `${DifficultyRating | RangeRating} S+`;

export interface Trip {
  name: string;
  url: string;
  date: string;
  winterTerrainLevel?: WinterTerrainLevel;
  difficultyRating?: DifficultyRatingValue;
  keywords?: string[];
}

export interface TrailProperties {
  id: string;
  name: string;
}

export interface PeakProperties {
  id: string;
  name: string;
  ele: string;
}

export interface RouteProperties {
  name: string;
  distance: number;
  total_elevation_gain: number;
  peaks: string[];
  trips: Trip[];
}
