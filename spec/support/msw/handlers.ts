import { http, HttpResponse } from 'msw';

export const peaks = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'node/356552622',
      properties: {
        ele: '1123',
        name: 'Bolton Mountain',
        id: 'node/356552622',
      },
      geometry: { type: 'Point', coordinates: [-72.8395662, 44.4492199] },
    },
    {
      type: 'Feature',
      id: 'node/358211478',
      properties: { ele: '1605', name: 'Baxter Peak', id: 'node/358211478' },
      geometry: { type: 'Point', coordinates: [-68.9212786, 45.9043602] },
    },
    {
      type: 'Feature',
      id: 'node/357730240',
      properties: {
        ele: '1600',
        name: 'Mount Lafayette',
        id: 'node/357730240',
      },
      geometry: { type: 'Point', coordinates: [-71.6443751, 44.1607104] },
    },
    {
      type: 'Feature',
      id: 'node/2432687944',
      properties: {
        ele: '1917',
        name: 'Mount Washington',
        id: 'node/2432687944',
      },
      geometry: { type: 'Point', coordinates: [-71.3033045, 44.2704946] },
    },
  ],
};
export const trails = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'way/458234015',
      properties: { name: 'Long Trail', id: 'way/458234015' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-72.84357, 44.442774],
          [-72.8405435, 44.4686056],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'way/80794928',
      properties: { name: 'Franconia Ridge Trail', id: 'way/80794928' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-71.6428609, 44.1189588],
          [-71.6444467, 44.1608596],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'way/44899227',
      properties: {
        name: 'Crawford Path / Gulfside Trail',
        id: 'way/44899227',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-71.3056566, 44.2708745],
          [-71.3029572, 44.2705071],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'way/965232779',
      properties: { name: 'Hunt Trail', id: 'way/965232779' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.9365965, 45.8982453],
          [-68.9215011, 45.9044497],
        ],
      },
    },
  ],
};
export const routes = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Katahdin via Cathedral',
        total_elevation_gain: 1126.4,
        date: '2019-08-20',
        peaks: ['node/358211478'],
        trips: [],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.8665, 45.92231],
          [-68.92144, 45.90444],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Franconia Ridge Fun!',
        total_elevation_gain: 1186.8,
        date: '2023-01-21',
        peaks: [
          'node/357730240',
          'node/357730273',
          'node/357730283',
          'node/7288986418',
        ],
        url: 'https://mitoc-trips.mit.edu/trips/1889/',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-71.68158, 44.1419],
          [-71.64444, 44.16065],
          [-71.68083, 44.14165],
        ],
      },
    },
  ],
};

export const handlers = [
  http.get('/generated/peaks.geojson', () => HttpResponse.json(peaks)),
  http.get('/generated/trails.geojson', () => HttpResponse.json(trails)),
  http.get('/routes.geojson', () => HttpResponse.json(routes)),
  http.get(
    'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/:z/:x/:y@2x',
    () => HttpResponse.text(''),
  ),
];
