import { along, bbox, length, nearestPointOnLine } from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import Geohash from 'latlon-geohash';
import type { RouteProperties } from '../../types';
import yesno from 'yesno';

export type NewRouteProperties = Omit<RouteProperties, 'trips'> & {
  date: string;
  url: string;
};

export type NewRouteFeature = Feature<LineString, NewRouteProperties>;
export type ExistingRouteFeature = Feature<LineString, RouteProperties>;

type RouteFeature = NewRouteFeature | ExistingRouteFeature;

type ReviewStage = 'lengthRatio' | 'geohash' | 'coverage';

export interface ReviewFlag {
  stage: ReviewStage;
  metrics: Record<string, number>;
}

export interface CheckResult {
  passes: boolean;
  flag?: ReviewFlag;
}

interface DuplicateResult {
  isDuplicate: boolean;
  reviewFlags: ReviewFlag[];
}

function routeLabel(feature: RouteFeature): string {
  const p = feature.properties;
  return 'date' in p
    ? `${p.name} (${p.date})`
    : `${p.name} (${Object.keys(p.trips).join(', ')})`;
}

export function geojsonUrlFor(feature: RouteFeature): string {
  return `https://geojson.io/#data=data:application/json,${encodeURIComponent(JSON.stringify(feature))}`;
}

// ---------------------------------------------------------------------------
// Stage 1: Bounding box
// ---------------------------------------------------------------------------

// Cheap pre-filter. If two routes' bounding boxes don't overlap (with a small
// buffer for GPS imprecision), they cannot be duplicates. This avoids any
// further computation for obviously non-overlapping pairs.
// Buffer is in degrees; 0.001° ≈ 100m at typical New England latitudes.
function bboxesIntersect(
  a: [number, number, number, number],
  b: [number, number, number, number],
  bufferDeg = 0.001,
): boolean {
  const [minXa, minYa, maxXa, maxYa] = a;
  const [minXb, minYb, maxXb, maxYb] = b;
  return (
    minXa - bufferDeg <= maxXb + bufferDeg &&
    maxXa + bufferDeg >= minXb - bufferDeg &&
    minYa - bufferDeg <= maxYb + bufferDeg &&
    maxYa + bufferDeg >= minYb - bufferDeg
  );
}

// ---------------------------------------------------------------------------
// Stage 2: Peak similarity
// ---------------------------------------------------------------------------

// All routes are guaranteed to reach at least one peak (within 50m), so a
// zero intersection is a definitive reject. Any intersection passes — there
// is no review band. The 50m peak proximity threshold already has tolerance
// baked in, so a route that came 51m from a summit would look nearly identical
// geometrically to one that came 49m from it; the geometric stages handle that
// case. A partial peak intersection (e.g. one shared peak out of five) is not
// treated as borderline here — the geometric stages are better placed to make
// that determination.
export function peakCheckPasses(featureA: RouteFeature, featureB: RouteFeature): boolean {
  const setB = new Set(featureB.properties.peaks);
  return featureA.properties.peaks.some((p) => setB.has(p));
}

// ---------------------------------------------------------------------------
// Stage 3: Length ratio
// ---------------------------------------------------------------------------

// Cheap pre-filter placed before geohash to catch large structural differences
// without paying for hash computation. For genuine duplicates, GPS drift and
// simplification artifacts cause length differences of no more than 5–10%,
// so a ratio below 0.85 indicates structurally different routes rather than
// measurement noise.
const LENGTH_RATIO_REJECT_BELOW = 0.85;
const LENGTH_RATIO_REVIEW_BELOW = 0.95;

const lengthCache = new Map<string, number>();

function getCachedLength(feature: RouteFeature): number {
  const key = routeLabel(feature);
  if (!lengthCache.has(key)) {
    lengthCache.set(key, length(feature, { units: 'kilometers' }));
  }
  return lengthCache.get(key)!;
}

export function lengthRatioCheckPasses(featureA: RouteFeature, featureB: RouteFeature): CheckResult {
  const lengthA = getCachedLength(featureA);
  const lengthB = getCachedLength(featureB);
  const ratio = Math.min(lengthA, lengthB) / Math.max(lengthA, lengthB);

  if (ratio < LENGTH_RATIO_REJECT_BELOW) return { passes: false };

  if (ratio < LENGTH_RATIO_REVIEW_BELOW) {
    return {
      passes: true,
      flag: {
        stage: 'lengthRatio',
        metrics: { lengthRatio: ratio },
      },
    };
  }

  return { passes: true };
}

// ---------------------------------------------------------------------------
// Stage 4: Geohash set similarity
// ---------------------------------------------------------------------------

// Each route is sampled at fixed intervals and each point encoded as a
// geohash. The resulting set is direction-agnostic, handling routes recorded
// in opposite directions.
//
// Precision 8 gives cells of ~38m × 19m. The 8 neighbours of each cell are
// also added to the set, since two devices recording the same trail can
// diverge 10–20m from each other — enough to straddle a cell boundary. The
// preprocessing steps (simplification, coordinate truncation) operate on each
// track in isolation and do not reconcile inter-device positional differences.
//
// The sampling interval is ~17m (roughly half a precision-8 cell width) to
// capture narrow trail crossings without excessive redundancy.
//
// Jaccard (|A ∩ B| / |A ∪ B|) is used rather than the containment
// coefficient because all routes are guaranteed to be complete (loops or
// traverses — truncated recordings are screened upstream). Jaccard penalises
// routes that share only a subset of the trail, which correctly distinguishes
// an out-and-back to one peak from a longer route that continues to a second.
//
// Note: the 9-neighbour expansion effectively widens each trail to ~100m,
// which means the geohash stage is not reliable for distinguishing partial
// from full route overlap when routes share a substantial common section. That
// responsibility falls to the coverage stage.
const GEOHASH_PRECISION = 8;
const GEOHASH_SAMPLE_INTERVAL_KM = 0.017;
const GEOHASH_REJECT_BELOW = 0.4;
const GEOHASH_REVIEW_BELOW = 0.75;

const geohashCache = new Map<string, Set<string>>();

function sampleGeohashes(feature: RouteFeature): Set<string> {
  const totalLength = getCachedLength(feature);
  const hashes = new Set<string>();

  const addWithNeighbours = (hash: string) => {
    hashes.add(hash);
    for (const n of Object.values(Geohash.neighbours(hash)) as string[]) {
      hashes.add(n);
    }
  };

  let dist = 0;
  while (dist <= totalLength) {
    const pt = along(feature, dist, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    addWithNeighbours(Geohash.encode(lat, lng, GEOHASH_PRECISION));
    dist += GEOHASH_SAMPLE_INTERVAL_KM;
  }

  const last = feature.geometry.coordinates.at(-1)!;
  addWithNeighbours(Geohash.encode(last[1], last[0], GEOHASH_PRECISION));

  return hashes;
}

function getCachedGeohashes(feature: RouteFeature): Set<string> {
  const key = routeLabel(feature);
  if (!geohashCache.has(key)) {
    geohashCache.set(key, sampleGeohashes(feature));
  }
  return geohashCache.get(key)!;
}

export function geohashCheckPasses(featureA: RouteFeature, featureB: RouteFeature): CheckResult {
  const hashesA = getCachedGeohashes(featureA);
  const hashesB = getCachedGeohashes(featureB);

  let intersection = 0;
  for (const hash of hashesA) {
    if (hashesB.has(hash)) intersection++;
  }

  const union = hashesA.size + hashesB.size - intersection;
  const jaccard = intersection / union;

  if (jaccard < GEOHASH_REJECT_BELOW) return { passes: false };

  if (jaccard < GEOHASH_REVIEW_BELOW) {
    return {
      passes: true,
      flag: {
        stage: 'geohash',
        metrics: { geohashJaccard: jaccard },
      },
    };
  }

  return { passes: true };
}

// ---------------------------------------------------------------------------
// Stage 5: Mutual coverage fraction
// ---------------------------------------------------------------------------

// For each resampled point on one route, we check whether it falls within
// COVERAGE_DISTANCE_M of the other route. The fraction of points that do is
// the directed coverage. Both directions are computed independently and the
// minimum is taken as the score — both routes must substantially cover each
// other for the pair to be considered a duplicate.
const COVERAGE_DISTANCE_M = 50;
const COVERAGE_REJECT_BELOW = 0.85;
const COVERAGE_REVIEW_BELOW = 0.95;

const resampleCache = new Map<string, Array<[number, number]>>();

function resample(feature: RouteFeature): Array<[number, number]> {
  const totalLength = getCachedLength(feature);
  const points: Array<[number, number]> = [];

  const resampleIntervalKm = 0.03;
  let dist = 0;
  while (dist <= totalLength) {
    const pt = along(feature, dist, { units: 'kilometers' });
    points.push(pt.geometry.coordinates as [number, number]);
    dist += resampleIntervalKm;
  }

  // Explicitly include the endpoint, guarded against double-append if
  // totalLength is exactly divisible by resampleIntervalKm.
  const last = feature.geometry.coordinates.at(-1) as [number, number];
  const prev = points.at(-1)!;
  if (last[0] !== prev[0] || last[1] !== prev[1]) {
    points.push(last);
  }

  return points;
}

function getCachedResample(feature: RouteFeature): Array<[number, number]> {
  const key = routeLabel(feature);
  if (!resampleCache.has(key)) {
    resampleCache.set(key, resample(feature));
  }
  return resampleCache.get(key)!;
}

function directedCoverage(
  points: Array<[number, number]>,
  target: RouteFeature,
): number {
  let covered = 0;
  for (const [lng, lat] of points) {
    const nearest = nearestPointOnLine(target, [lng, lat], { units: 'meters' });
    if (nearest.properties.dist <= COVERAGE_DISTANCE_M) covered++;
  }
  return covered / points.length;
}

export function coverageCheckPasses(featureA: RouteFeature, featureB: RouteFeature): CheckResult {
  const pointsA = getCachedResample(featureA);
  const pointsB = getCachedResample(featureB);

  const aToB = directedCoverage(pointsA, featureB);
  const bToA = directedCoverage(pointsB, featureA);

  // Both directions must independently exceed the threshold. The lower score
  // is the binding constraint: if one route matches well in one direction but
  // poorly in the other, it includes trail segments the other route does not
  // cover.
  const score = Math.min(aToB, bToA);

  if (score < COVERAGE_REJECT_BELOW) return { passes: false };

  if (score < COVERAGE_REVIEW_BELOW) {
    return {
      passes: true,
      flag: {
        stage: 'coverage',
        metrics: {
          mutualCoverage: score,
          aToBCoverage: aToB,
          bToACoverage: bToA,
        },
      },
    };
  }

  return { passes: true };
}

export function isDuplicateRoute(
  newRoute: NewRouteFeature,
  existingRoute: ExistingRouteFeature,
  _checks: Array<(a: RouteFeature, b: RouteFeature) => CheckResult> = [
    lengthRatioCheckPasses,
    geohashCheckPasses,
    coverageCheckPasses,
  ],
): DuplicateResult {
  if (
    !bboxesIntersect(
      bbox(newRoute) as [number, number, number, number],
      bbox(existingRoute) as [number, number, number, number],
    )
  )
    return { isDuplicate: false, reviewFlags: [] };

  if (!peakCheckPasses(newRoute, existingRoute)) {
    return { isDuplicate: false, reviewFlags: [] };
  }

  const reviewFlags: ReviewFlag[] = [];
  let allBorderline = true;

  for (const check of _checks) {
    const { passes, flag } = check(newRoute, existingRoute);

    if (!passes) {
      return { isDuplicate: false, reviewFlags: [] };
    }

    if (flag) {
      reviewFlags.push(flag);
    } else {
      allBorderline = false;
    }
  }

  if (allBorderline && reviewFlags.length > 0) {
    return { isDuplicate: false, reviewFlags };
  }

  return { isDuplicate: true, reviewFlags: [] };
}

export function convertToExisting(newRoute: Feature<LineString, NewRouteProperties>): Feature<LineString, RouteProperties> {
  const { date, url, ...otherProperties } = newRoute.properties;
  const properties = { trips: [{ date, url, name: '' }], ...otherProperties };
  return { ...newRoute, properties };
}

export async function factoredValue(existingValue: number, newValue: number, currentTripCount: number): Promise<number> {
  const delta = Math.abs(existingValue - newValue);
  const average = (existingValue + newValue) / 2;
  if (delta / average > 0.15) {
    const confirmed = await yesno({
      question: `${newValue} is ${(delta / average * 100).toFixed(2)}% different from the existing value of ${existingValue}; incorporate it? (y/N)`,
      defaultValue: false,
    });
    if (!confirmed) {
      return existingValue;
    }
  }
  return (existingValue * currentTripCount + newValue) / (currentTripCount + 1);
}

export function clearCaches(): void {
  lengthCache.clear();
  geohashCache.clear();
  resampleCache.clear();
}
