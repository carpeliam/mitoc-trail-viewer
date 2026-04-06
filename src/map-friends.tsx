import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { bbox } from '@turf/bbox';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { PeakProperties, RouteProperties } from '../types';

export function MapBlurHandler({ onBlur: onBlur, delay = 250 }: { onBlur: (e: L.LeafletMouseEvent) => void, delay?: number }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    click(e) {
      clearTimeout(timerRef.current ?? undefined);
      timerRef.current = setTimeout(() => {
        onBlur(e);
      }, delay);
    },
    dblclick() {
      clearTimeout(timerRef.current ?? undefined);
      timerRef.current = null;
    },
  });

  return null;
}

export function RouteWatcher({ selectedRoute }: { selectedRoute: Feature<LineString, RouteProperties> | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (selectedRoute) {
      const [minLng, minLat, maxLng, maxLat] = bbox(selectedRoute);
      map.fitBounds([[minLat, minLng], [maxLat, maxLng]]);
    }
  }, [map, selectedRoute]);

  return null;
}

export function PeakWatcher({ selectedPeak, visibleRoutes }: { selectedPeak: Feature<Point, PeakProperties> | undefined; visibleRoutes: FeatureCollection<LineString, RouteProperties> | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPeak) {
      if (visibleRoutes?.features.length) {
        const [minLng, minLat, maxLng, maxLat] = bbox(visibleRoutes);
        map.flyToBounds([[minLat, minLng], [maxLat, maxLng]], { maxZoom: 14 });
      } else {
        const [lng, lat] = selectedPeak.geometry.coordinates;
        const zoom = Math.max(map.getZoom(), 14);
        map.flyTo([lat, lng], zoom);
      }
    }
  }, [map, selectedPeak, visibleRoutes]);

  return null;
}
