import { vi, beforeEach } from 'vitest';
import type { GeoJSONProps } from 'react-leaflet';
import * as L from 'leaflet';
import type { Layer, LeafletMouseEvent, LeafletMouseEventHandlerFn } from 'leaflet';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

type MockGeoJSONProps = GeoJSONProps & {
  [key: `data-${string}`]: string | undefined;
  data: FeatureCollection<LineString | Point> | Feature<LineString | Point>;
};

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GeoJSON: vi.fn(({ data, onEachFeature, 'data-testid': testId = 'geojson' }: MockGeoJSONProps) => {
      const features = data.type === 'FeatureCollection' ? data.features : [data];
      return (
        <div data-testid={testId} data-geojson-content={JSON.stringify(data)} onClick={(e) => e.stopPropagation()}>
          {onEachFeature && features.map(f => (
            <button
              key={f.id || f.properties?.name as string}
              data-testid={f.id || f.properties?.name as string}
              onClick={e => {
                e.stopPropagation();
                const fakeLayer = {
                  bindPopup: vi.fn(),
                  bindTooltip: vi.fn(),
                  on: vi.fn((event, handler: LeafletMouseEventHandlerFn) => {
                    if (event === 'click') handler({ latlng: L.latLng(0, 0) } as LeafletMouseEvent);
                    return fakeLayer;
                  }),
                } as unknown as Layer;
                onEachFeature?.(f, fakeLayer);
              }}
            />
          ))}
        </div>
      );
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
