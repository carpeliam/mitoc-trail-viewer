// SettingsControl.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import type { ControlPosition } from 'leaflet';

interface SettingsControlProps {
  onToggle: () => void;
  position: ControlPosition;
}

export default function SettingsControl({ onToggle, position }: SettingsControlProps) {
  const map = useMap();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const control = new L.Control({ position });

    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      setContainer(div);
      return div;
    };

    control.addTo(map);

    return () => { control.remove(); };
  }, [map, position]);

  return container
    ? createPortal(<a href="#" title="Settings" aria-label="Settings" onClick={(e) => { e.preventDefault(); onToggle(); }}>⚙️</a>, container)
    : null;
}
