import yesno from 'yesno';

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
