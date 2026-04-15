import yesno from 'yesno';
import type { DifficultyRating, DifficultyRatingValue, RangeRating, RouteProperties } from '../../types';

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

export async function keywordsFor(trip: MitocTrip): Promise<string[]> {
  const keywords: string[] = [];
  const { name, summary, prereqs, description } = trip;
  for (const term of [name, summary, prereqs, description]) {
    for (const keyword of [/butt\s?sled/, 'crampon']) {
      const match = term.match(keyword);
      if (match) {
        console.log(match[0], 'found in', trip.url);
        console.log(`...${term.substring(match.index! - 50, match[0].length + match.index! + 50)}...`);
        const addKeyword = await yesno({ question: `Add ${match[0]} as a keyword? (y/N)`, defaultValue: false });
        if (addKeyword) {
          keywords.push(match[0]);
          continue;
        }
      }
    }
  }
  return keywords;
}

const SPICY_PATTERNS: RegExp[] = [
  /bushwhack/i,
  /overnight/i,
  /backpack/i,
  /scramble/i,
  /slide trail/i,
];

const METERS_TO_MILES = 0.000621371;
const METERS_TO_FEET = 3.28084;
function difficultyRatingFromStats(distanceInMeters: number, elevationGainInMeters: number) {
  const distanceInMiles = distanceInMeters * METERS_TO_MILES;
  const elevationInFeet = elevationGainInMeters * METERS_TO_FEET;
  const levelFromDistance = distanceInMiles > 12 ? 5 : distanceInMiles > 8 ? 4 : distanceInMiles > 5 ? 3 : distanceInMiles > 3 ? 2 : 1;
  const levelFromGain  = elevationInFeet > 4000 ? 5 : elevationInFeet > 3000 ? 4 : elevationInFeet > 1500 ? 3 : elevationInFeet > 600 ? 2 : 1;

  switch (Math.abs(levelFromDistance - levelFromGain)) {
    case 0:
      return `L${levelFromDistance - 1}` as DifficultyRating;
    case 1:
      return `L${Math.min(levelFromDistance, levelFromGain) - 1}` as DifficultyRating;
    default:
      return `L${Math.max(levelFromDistance, levelFromGain) - 1}` as DifficultyRating;
  }
}
function isSpicy(trip: MitocTrip): boolean {
  const text = `${trip.summary} ${trip.description} ${trip.prereqs}`;
  return SPICY_PATTERNS.some(p => p.test(text));
}

export function mapTripDifficulty(trip: MitocTrip, route: RouteProperties): DifficultyRatingValue {
  // Match a Level via "L{digit}" optionally followed by a second "L{digit}" with optional + or S+ suffix for spiciness
  const canonicalMatch = trip.difficulty_rating.match(/L([0-5])\s*(?:[/-]\s*L?([0-5]))?\s*(\+|S\+)?/i);
  if (canonicalMatch) {
    const min = `L${canonicalMatch[1]}` as DifficultyRating;
    const max = canonicalMatch[2] ? `L${canonicalMatch[2]}` : min;
    const spicy = !!canonicalMatch[3] || isSpicy(trip);
    const range = min === max ? min : `${min}-${max}` as RangeRating;
    return spicy ? `${range} S+` : range;
  } else {
    const level = difficultyRatingFromStats(route.distance, route.total_elevation_gain);
    const spicy = isSpicy(trip);
    return spicy ? `${level} S+` : level;
  }
}
