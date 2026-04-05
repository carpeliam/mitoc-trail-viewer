import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { bbox } from '@turf/bbox';
import type { Feature, LineString, Point } from 'geojson';
import type { PeakProperties, RouteProperties } from '../types';

export function MapBlurHandler({ onBlur: onBlur }: { onBlur: (e: L.LeafletMouseEvent) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    click(e) {
      clearTimeout(timerRef.current ?? undefined);
      timerRef.current = setTimeout(() => {
        onBlur(e);
      }, 250);
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

export function PeakWatcher({ selectedPeak }: { selectedPeak: Feature<Point, PeakProperties> | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPeak) {
      const [lng, lat] = selectedPeak.geometry.coordinates;
      const zoom = Math.max(map.getZoom(), 14);
      map.flyTo([lat, lng], zoom);
    }
  }, [map, selectedPeak]);

  return null;
}
