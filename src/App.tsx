import { MapContainer, TileLayer, GeoJSON, type TileLayerProps, LayersControl } from 'react-leaflet';
import { useEffect, useState } from 'react';
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

async function fetchData<T>(url: string) {
  return await fetch(import.meta.env.BASE_URL + url).then(res => res.json()) as T;
}

const tileLayerProps: TileLayerProps = (import.meta.env.VITE_MAPBOX_API_TOKEN)
  ? {
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/" target="_blank">Improve this map</a>',
    url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_API_TOKEN}`,
  }
  : {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

interface TrailProperties {
  id: string;
  name: string;
}

interface PeakProperties {
  id: string;
  name: string;
  ele: string;
}

export default function App() {
  const [trails, setTrails] = useState<FeatureCollection<LineString, TrailProperties>>();
  const [peaks, setPeaks] = useState<FeatureCollection<LineString, PeakProperties>>();
  useEffect(() => {
    async function loadTrails() {
      const data = await fetchData<FeatureCollection<LineString, TrailProperties>>('generated/trails.geojson');
      setTrails(data);
    }
    async function loadPeaks() {
      const data = await fetchData<FeatureCollection<LineString, PeakProperties>>('generated/peaks.geojson');
      setPeaks(data);
    }
    void loadTrails();
    void loadPeaks();
  }, []);
  return (
    <main>
      <MapContainer center={[44.2706, -71.3033]} zoom={10} scrollWheelZoom={false} id="map-container">
        <TileLayer {...tileLayerProps} />

        {peaks && (
          <GeoJSON data={peaks} data-testid="peaks"
            pointToLayer={(_point, latlng) => L.circleMarker(latlng, { radius: 4, color: '#7F8386', weight: 2 })}
            onEachFeature={(feature: Feature<Geometry, PeakProperties>, layer) => {
              const { name } = feature.properties;

              layer.bindTooltip(name, {
                permanent: false,
                direction: "right",
                opacity: 0.8,
              });
            }}
          />)}

        <LayersControl position="topright" collapsed={false}>
          <LayersControl.Overlay checked name="Display all trails">
            {trails && <GeoJSON data={trails} style={{ weight: 1 }} data-testid="trails" />}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </main>
  );
}
