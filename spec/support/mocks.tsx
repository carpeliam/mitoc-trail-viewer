import type { GeoJSONProps } from 'react-leaflet';
import { vi, beforeEach } from 'vitest';

type MockGeoJSONProps = GeoJSONProps & {
  [key: `data-${string}`]: string | undefined;
};

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    GeoJSON: vi.fn(({ data, 'data-testid': testId = 'geojson' }: MockGeoJSONProps) => (
      <div
        data-testid={testId}
        data-geojson-content={JSON.stringify(data)}
      />
    )),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
