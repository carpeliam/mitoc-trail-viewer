import { vi, beforeEach } from 'vitest';
import type { GeoJSONProps } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, LeafletMouseEventHandlerFn } from 'leaflet';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { useEffect, useRef } from 'react';

type MockGeoJSONProps = GeoJSONProps & {
  [key: `data-${string}`]: string | undefined;
  data: FeatureCollection<LineString | Point>;
};

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GeoJSON: vi.fn(({ data, onEachFeature, 'data-testid': testId = 'geojson' }: MockGeoJSONProps) => {
      const clickHandlers = useRef<Map<Feature<LineString | Point>, LeafletMouseEventHandlerFn>>(new Map());
      useEffect(() => {
        clickHandlers.current.clear();
        data.features.forEach(f => {
          onEachFeature?.(f, {
            bindPopup: vi.fn(),
            bindTooltip: vi.fn(),
            on: vi.fn((type: string, handler: LeafletMouseEventHandlerFn) => {
              if (type === 'click') {
                clickHandlers.current.set(f, handler);
              }
            }),
          } as unknown as Layer);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [data]);
      return (
        <div data-testid={testId} data-geojson-content={JSON.stringify(data)}>
          {data.features.map(f => (
            <button
              key={f.id || f.properties?.name as string}
              data-testid={f.id || f.properties?.name as string}
              onClick={e => clickHandlers.current.get(f)?.({ originalEvent: e.nativeEvent } as LeafletMouseEvent)}>
              {f.properties?.name}
            </button>
          ))}
        </div>
      );
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
