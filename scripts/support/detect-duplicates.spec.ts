import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lineString } from '@turf/turf';
import {
    coverageCheckPasses,
    geohashCheckPasses,
    isDuplicateRoute,
    lengthRatioCheckPasses,
    peakCheckPasses,
    clearCaches,
} from '../../scripts/support/detect-duplicates';
import type { ExistingRouteFeature, NewRouteFeature, ReviewFlag } from '../../scripts/support/detect-duplicates';
import type { Position } from 'geojson';

beforeEach(() => {
  clearCaches();
});

describe('peakCheckPasses', () => {
  it('returns false when there are no shared peaks', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-adams', 'mt-jefferson']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-madison', 'mt-clay']);
    expect(peakCheckPasses(a, b)).toBe(false);
  });

  it('returns true when at least one peak is shared', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-adams', 'mt-jefferson']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-jefferson', 'mt-clay']);
    expect(peakCheckPasses(a, b)).toBe(true);
  });

  it('returns true when all peaks are shared', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-washington', 'mt-monroe']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-washington', 'mt-monroe']);
    expect(peakCheckPasses(a, b)).toBe(true);
  });

  it('returns true when one route is a peak subset of the other', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-washington']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-washington', 'mt-monroe', 'mt-eisenhower']);
    expect(peakCheckPasses(a, b)).toBe(true);
  });
});

describe('lengthRatioCheckPasses', () => {
  it('confidently rejects when ratio is below 0.85', () => {
    // LINE_SHORT / LINE_LONG ≈ 0.70
    const a = makeNewRoute(LINE_LONG, ['mt-test']);
    const b = makeExistingRoute(LINE_SHORT, ['mt-test']);
    const result = lengthRatioCheckPasses(a, b);
    expect(result.passes).toBe(false);
    expect(result.flag).toBeUndefined();
  });

  it('flags as borderline when ratio is between 0.85 and 0.95', () => {
    // LINE_MEDIUM / LINE_LONG ≈ 0.90
    const a = makeNewRoute(LINE_LONG, ['mt-test']);
    const b = makeExistingRoute(LINE_MEDIUM, ['mt-test']);
    const result = lengthRatioCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeDefined();
    expect(result.flag!.stage).toBe('lengthRatio');
    expect(result.flag!.metrics.lengthRatio).toBeGreaterThan(0.85);
    expect(result.flag!.metrics.lengthRatio).toBeLessThan(0.95);
  });

  it('passes cleanly when ratio is above 0.95', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-test']);
    const result = lengthRatioCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeUndefined();
  });

  it('is symmetric — order of routes does not affect outcome', () => {
    const a = makeNewRoute(LINE_LONG, ['mt-test']);
    const b = makeExistingRoute(LINE_SHORT, ['mt-test']);
    // Swap order — shorter/longer should still produce same ratio
    const c = makeNewRoute(LINE_SHORT, ['mt-test']);
    const d = makeExistingRoute(LINE_LONG, ['mt-test']);
    expect(lengthRatioCheckPasses(a, b).passes).toBe(lengthRatioCheckPasses(c, d).passes);
  });
});

describe('geohashCheckPasses', () => {
  it('confidently passes for identical routes', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-test']);
    const result = geohashCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeUndefined();
  });

  it('confidently passes for routes with minor GPS drift', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS_DRIFTED, ['mt-test']);
    const result = geohashCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeUndefined();
  });

  it('confidently rejects routes in completely different areas', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS_FAR, ['mt-other']);
    const result = geohashCheckPasses(a, b);
    expect(result.passes).toBe(false);
    expect(result.flag).toBeUndefined();
  });

  it('passes for a reversed route', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute([...LOOP_COORDS].reverse(), ['mt-test']);
    const result = geohashCheckPasses(a, b);
    expect(result.passes).toBe(true);
  });
});

describe('coverageCheckPasses', () => {
  it('confidently passes for identical routes', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS, ['mt-test']);
    const result = coverageCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeUndefined();
  });

  it('confidently passes for routes with minor GPS drift', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS_DRIFTED, ['mt-test']);
    const result = coverageCheckPasses(a, b);
    expect(result.passes).toBe(true);
    expect(result.flag).toBeUndefined();
  });

  it('confidently rejects routes in completely different areas', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute(LOOP_COORDS_FAR, ['mt-other']);
    const result = coverageCheckPasses(a, b);
    expect(result.passes).toBe(false);
    expect(result.flag).toBeUndefined();
  });

  it('passes for a reversed route', () => {
    const a = makeNewRoute(LOOP_COORDS, ['mt-test']);
    const b = makeExistingRoute([...LOOP_COORDS].reverse(), ['mt-test']);
    const result = coverageCheckPasses(a, b);
    expect(result.passes).toBe(true);
  });
});

describe('isDuplicate borderline handling', () => {
  const newRoute = makeNewRoute(LOOP_COORDS, ['mt-test']);
  const existingRoute = makeExistingRoute(LOOP_COORDS, ['mt-test']);

  function borderlineFlag(stage: ReviewFlag['stage']): ReviewFlag {
    return { stage, metrics: { score: 0.9 } };
  }

  it('returns isDuplicate: true with no flags when all checks pass confidently', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true }),
      vi.fn().mockReturnValue({ passes: true }),
      vi.fn().mockReturnValue({ passes: true }),
    ]);
    expect(result.isDuplicate).toBe(true);
    expect(result.reviewFlags).toEqual([]);
  });

  it('clears flags when a later check confidently rejects after a borderline', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('lengthRatio') }),
      vi.fn().mockReturnValue({ passes: false }),
      vi.fn().mockReturnValue({ passes: true }),
    ]);
    expect(result.isDuplicate).toBe(false);
    expect(result.reviewFlags).toEqual([]);
  });

  it('clears flags when a later check confidently passes after a borderline', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('lengthRatio') }),
      vi.fn().mockReturnValue({ passes: true }), // confident pass
      vi.fn().mockReturnValue({ passes: true }),
    ]);
    expect(result.isDuplicate).toBe(true);
    expect(result.reviewFlags).toEqual([]);
  });

  it('surfaces flags when every check is borderline', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('lengthRatio') }),
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('geohash') }),
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('coverage') }),
    ]);
    expect(result.isDuplicate).toBe(false);
    expect(result.reviewFlags).toHaveLength(3);
    expect(result.reviewFlags.map(f => f.stage)).toEqual([
      'lengthRatio',
      'geohash',
      'coverage',
    ]);
  });

  it('surfaces flags when only some checks ran and all were borderline', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('lengthRatio') }),
    ]);
    expect(result.isDuplicate).toBe(false);
    expect(result.reviewFlags).toHaveLength(1);
  });

  it('does not surface flags when first check is borderline and second confidently rejects', () => {
    const result = isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true, flag: borderlineFlag('lengthRatio') }),
      vi.fn().mockReturnValue({ passes: false }),
    ]);
    expect(result.isDuplicate).toBe(false);
    expect(result.reviewFlags).toEqual([]);
  });

  it('short-circuits and does not call later checks after a confident reject', () => {
    const thirdCheck = vi.fn().mockReturnValue({ passes: true });
    isDuplicateRoute(newRoute, existingRoute, [
      vi.fn().mockReturnValue({ passes: true }),
      vi.fn().mockReturnValue({ passes: false }),
      thirdCheck,
    ]);
    expect(thirdCheck).not.toHaveBeenCalled();
  });
});

function makeNewRoute(coordinates: Position[], peaks: string[]): NewRouteFeature {
  return lineString(coordinates, {
    name: 'Test Route',
    distance: 4900,
    total_elevation_gain: 490,
    date: '2024-06-01',
    peaks,
    url: 'https://example.com/route',
  });
}

function makeExistingRoute(coordinates: Position[], peaks: string[]): ExistingRouteFeature {
  return lineString(coordinates, {
    name: 'Test Route',
    distance: 5000,
    total_elevation_gain: 500,
    peaks,
    trips: [{ date: '2024-01-01', url: 'https://example.com/route', name: '' }],
  });
}

// A closed loop in the White Mountains area, roughly 4km.
const LOOP_COORDS: Position[] = [
  [-71.30, 44.27],
  [-71.31, 44.29],
  [-71.32, 44.31],
  [-71.31, 44.33],
  [-71.30, 44.27],
];

// Same loop with minor coordinate perturbations (~10–15m) simulating GPS drift
// between two devices recording the same trail.
const LOOP_COORDS_DRIFTED: Position[] = [
  [-71.30005, 44.27005],
  [-71.31005, 44.29005],
  [-71.32005, 44.31005],
  [-71.31005, 44.33005],
  [-71.30005, 44.27005],
];

// A loop in a completely different area (southern Vermont).
const LOOP_COORDS_FAR: Position[] = [
  [-72.80, 43.10],
  [-72.81, 43.12],
  [-72.82, 43.14],
  [-72.81, 43.16],
  [-72.80, 43.10],
];

// Straight lines of known approximate lengths for length ratio tests.
// One degree of latitude ≈ 111km.
// LINE_LONG:   0.10° ≈ 11.1km
// LINE_MEDIUM: 0.09° ≈  9.99km  →  ratio vs LONG ≈ 0.90  (borderline: 0.85–0.95)
// LINE_SHORT:  0.07° ≈  7.77km  →  ratio vs LONG ≈ 0.70  (reject: < 0.85)
const LINE_LONG: Position[]   = [[-71.3, 44.27], [-71.3, 44.37]];
const LINE_MEDIUM: Position[] = [[-71.3, 44.27], [-71.3, 44.36]];
const LINE_SHORT: Position[]  = [[-71.3, 44.27], [-71.3, 44.34]];
