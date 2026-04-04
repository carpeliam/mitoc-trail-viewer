import { useRef } from 'react';
import { useMapEvents } from 'react-leaflet';

export default function MapBlurHandler({ onBlur: onBlur }: { onBlur: (e: L.LeafletMouseEvent) => void }) {
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
