export type WinterTerrainLevel = 'A' | 'B' | 'C';

export interface Trip {
  name: string;
  url: string;
  date: string;
  winterTerrainLevel?: WinterTerrainLevel;
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
  total_elevation_gain: number;
  peaks: string[];
  trips: Trip[];
};
