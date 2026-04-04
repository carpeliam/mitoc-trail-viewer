export interface Trip {
  name: string;
  url: string;
  date: string;
}

export interface RouteProperties {
  name: string;
  total_elevation_gain: number;
  peaks: string[];
  trips: Trip[];
};
