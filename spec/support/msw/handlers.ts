import { http, HttpResponse } from 'msw';
import { lineString, featureCollection, point } from '@turf/turf';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { PeakProperties, RouteProperties, TrailProperties } from '../../../types';

export const peaks: FeatureCollection<Point, PeakProperties> = featureCollection([
  point([-72.8395662, 44.4492199], {
    ele: '1123',
    name: 'Bolton Mountain',
    id: 'node/356552622',
  }, { id: 'node/356552622' }),
  point([-68.9212786, 45.9043602], {
    ele: '1605',
    name: 'Baxter Peak',
    id: 'node/358211478',
  }, { id: 'node/358211478' }),
  point([-71.6443751, 44.1607104], {
    ele: '1600',
    name: 'Mount Lafayette',
    id: 'node/357730240',
  }, { id: 'node/357730240' }),
  point([-71.3033045, 44.2704946], {
    ele: '1917',
    name: 'Mount Washington',
    id: 'node/2432687944',
  }, { id: 'node/2432687944' }),
]);
export const trails: FeatureCollection<LineString, TrailProperties> = featureCollection([
  lineString(
    [[-72.84357, 44.442774], [-72.8405435, 44.4686056]],
    { name: 'Long Trail', id: 'way/458234015' },
    { id: 'way/458234015' },
  ),
  lineString(
    [[-71.6428609, 44.1189588], [-71.6444467, 44.1608596]],
    { name: 'Franconia Ridge Trail', id: 'way/80794928' },
    { id: 'way/80794928' },
  ),
  lineString(
    [[-71.3056566, 44.2708745], [-71.3029572, 44.2705071]],
    { name: 'Crawford Path / Gulfside Trail', id: 'way/44899227' },
    { id: 'way/44899227' },
  ),
  lineString(
    [[-68.9365965, 45.8982453], [-68.9215011, 45.9044497]],
    { name: 'Hunt Trail', id: 'way/965232779' },
    { id: 'way/965232779' },
  ),
]);
export const routes: FeatureCollection<LineString, RouteProperties> = featureCollection([
  lineString([[-68.8665, 45.92231], [-68.92144, 45.90444]], {
    name: 'Katahdin via Cathedral',
    distance: 7847.5,
    total_elevation_gain: 1126.4,
    peaks: ['node/358211478'],
    trips: [{ date: '2019-08-20', name: '', url: '' }],
  }),
  lineString([[-71.68158, 44.1419], [-71.64444, 44.16065], [-71.68083, 44.14165]], {
    name: 'Franconia Ridge',
    distance: 14538.5,
    total_elevation_gain: 1186.8,
    peaks: [
      'node/357730240',
      'node/357730273',
      'node/357730283',
      'node/7288986418',
    ],
    trips: [
      {
        date: '2023-01-21',
        name: 'Franconia Ridge Fun!',
        url: 'https://mitoc-trips.mit.edu/trips/1889/',
        winterTerrainLevel: 'C',
        difficultyRating: 'L4',
        keywords: ['crampon'],
      },
    ],
  }),
]);

export const handlers = [
  http.get('/generated/peaks.geojson', () => HttpResponse.json(peaks)),
  http.get('/generated/trails.geojson', () => HttpResponse.json(trails)),
  http.get('/routes.geojson', () => HttpResponse.json(routes)),
  http.get(
    'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/:z/:x/:y@2x',
    () => HttpResponse.text(''),
  ),
];
