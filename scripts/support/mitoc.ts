export function keysToCamelCase(obj: object): object {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamelCase);

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/\s(.)/g, (_, char: string) => char.toUpperCase()).replace(/^\s/, ''),
      keysToCamelCase(value as object),
    ]),
  );
}

interface MitocLeader {
  name: string;
  id: number;
  url: string;
}
export interface MitocTrip {
  name: string;
  id: number;
  summary: string;
  difficulty_rating: string;
  level: string | null;
  winter_terrain_level: 'A' | 'B' | 'C' | null;
  prereqs: string;
  notes: string;
  url: string;
  program: string;
  primaryTripActivity: string;
  tripDate: string;
  leaders: MitocLeader[];
  description: string;
}
