import { useEffect, useRef, useState } from 'react';
import { GeoJSON, LayersControl, MapContainer, Pane, TileLayer, useMapEvents, type TileLayerProps } from 'react-leaflet';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import * as L from 'leaflet';
import type { RouteProperties } from '../types';
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
  const [peaks, setPeaks] = useState<FeatureCollection<Point, PeakProperties>>();
  const [routes, setRoutes] = useState<FeatureCollection<LineString, RouteProperties>>();

  const [selectedPeak, setSelectedPeak] = useState<Feature<Point>>();
  const [selectedRoute, setSelectedRoute] = useState<Feature<LineString, RouteProperties>>();

  const visibleRoutes = routes && (selectedPeak
    ? { ...routes, features: routes.features.filter(f => f.properties.peaks.includes(selectedPeak.id as string)) }
    : routes);

  useEffect(() => {
    async function loadTrails() {
      const data = await fetchData<FeatureCollection<LineString, TrailProperties>>('generated/trails.geojson');
      setTrails(data);
    }
    async function loadPeaks() {
      const data = await fetchData<FeatureCollection<Point, PeakProperties>>('generated/peaks.geojson');
      setPeaks(data);
    }
    async function loadRoutes() {
      const data = await fetchData<FeatureCollection<LineString, RouteProperties>>('routes.geojson');
      setRoutes(data);
    }
    void loadTrails();
    void loadPeaks();
    void loadRoutes();
  }, []);
  function MapClickHandler({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useMapEvents({
      click(e) {
        clearTimeout(timerRef.current ?? undefined);
        timerRef.current = setTimeout(() => {
          onClick(e);
        }, 250);
      },
      dblclick() {
        clearTimeout(timerRef.current ?? undefined);
        timerRef.current = null;
      },
    });

    return null;
  }
  return (
    <main>
      <MapContainer center={[44.2706, -71.3033]} zoom={10} scrollWheelZoom={false} id="map-container">
        <MapClickHandler onClick={() => { setSelectedRoute(undefined); setSelectedPeak(undefined); }} />
        <Pane name="trails" style={{ zIndex: 200 }} />
        <Pane name="routes" style={{ zIndex: 400 }} />
        <Pane name="peaks" style={{ zIndex: 600 }} />
        <TileLayer {...tileLayerProps} />

        {visibleRoutes && <GeoJSON
          data={visibleRoutes}
          data-testid="routes"
          pane="routes"
          key={selectedPeak?.id ?? 'all-routes'}
          onEachFeature={(feature: Feature<LineString, RouteProperties>, layer) => {
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              setSelectedRoute(current => current?.properties.name === feature.properties.name ? undefined : feature);
            });
          }}
          style={feature => {
            const hue = Math.floor(Math.random() * 60) + 240;
            return {
              color: `hsl(${hue}, 70%, 50%)`,
              weight: feature === selectedRoute ? 7 : 3,
              opacity: feature === selectedRoute ? 0.9 : 0.6,
            };
          }}
        />}
        {peaks && (
          <GeoJSON data={peaks} data-testid="peaks" pane="peaks"
            pointToLayer={(_point, latlng) => L.circleMarker(latlng, { radius: 6, color: '#7F8386', weight: 2 })}
            onEachFeature={(feature: Feature<Point, PeakProperties>, layer) => {
              const { name } = feature.properties;

              layer.bindTooltip(name, {
                permanent: false,
                direction: 'right',
                opacity: 0.8,
              });
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedPeak(current => current?.id === feature.id ? undefined : feature);
              });
            }}
          />)}

        <LayersControl position="topright" collapsed={false}>
          <LayersControl.Overlay checked name="Display all trails">
            {trails && <GeoJSON
              data={trails}
              data-testid="trails"
              pane="trails"
              style={{ weight: 1 }}
              onEachFeature={(feature: Feature<LineString, TrailProperties>, layer) => {
                if (feature.properties.name) {
                  layer.bindPopup(feature.properties.name);
                }
              }}
            />}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
      <aside hidden={!selectedRoute}>
        <section>
          <header>
            <h2>{selectedRoute?.properties.name}</h2>
            <button aria-label="Close" type="button" onClick={() => setSelectedRoute(undefined)}>
              <span aria-hidden="true">&times;</span>
            </button>
          </header>
          <ul>
            {(selectedRoute?.properties.trips ?? []).map(trip => (
              <li key={`${trip.date}${trip.url}`}><a href={trip.url} target="_blank">{trip.date}: {trip.name}</a></li>
            ))}
          </ul>
        </section>
      </aside>
    </main>
  );
}
