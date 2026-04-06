import { useMemo, useState } from 'react';
import { GeoJSON, LayersControl, MapContainer, Pane, TileLayer, type TileLayerProps } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import SettingsControl from './SettingsControl';
import { MapBlurHandler, PeakWatcher, RouteWatcher } from './map-friends';

import { useGeoJSON } from './data';
import { useSettings, type Settings, type WinterTerrainLevelSetting } from './settings';

import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { PeakProperties, RouteProperties, TrailProperties } from '../types';

import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import './App.css';

const METERS_TO_FEET = 3.28084;
function metersToFeet(meters: number): string {
  return Math.round(meters * METERS_TO_FEET).toLocaleString();
}

function hueFor(feature: Feature | undefined): number {
  const name = feature?.properties?.name as string;
  if (!name) return 240; // blue
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  }
  return (hash % 60) + 240;
}

function visibleRoutesKey(settings: Settings, selectedPeak: Feature<Point, PeakProperties> | undefined) {
  const activeTerrainLevels = (Object.keys(settings.visibleTerrainLevels) as WinterTerrainLevelSetting[])
    .filter(k => settings.visibleTerrainLevels[k])
    .join();
  return `${selectedPeak?.id ?? 'all-routes'}-${activeTerrainLevels}`;
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

export default function App() {
  const trails = useGeoJSON<FeatureCollection<LineString, TrailProperties>>('generated/trails.geojson');
  const peaks = useGeoJSON<FeatureCollection<Point, PeakProperties>>('generated/peaks.geojson');
  const routes = useGeoJSON<FeatureCollection<LineString, RouteProperties>>('routes.geojson');

  const [selectedPeak, setSelectedPeak] = useState<Feature<Point, PeakProperties>>();
  const [selectedRoute, setSelectedRoute] = useState<Feature<LineString, RouteProperties>>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, updateTerrainLevel] = useSettings();

  const visibleRoutes = useMemo(() => {
    if (!routes) return null;
    return {
      ...routes,
      features: routes.features.filter(f => {
        const passesSelectedPeak = !selectedPeak || f.properties.peaks.includes(selectedPeak.id as string);
        const passesWinterTerrainLevel = f.properties.trips.some(({ winterTerrainLevel }) => (
          settings.visibleTerrainLevels[winterTerrainLevel ?? 'summer']
        ));
        return passesSelectedPeak && passesWinterTerrainLevel;
      }),
    };
  }, [routes, selectedPeak, settings.visibleTerrainLevels]);

  return (
    <main>
      <MapContainer center={[44.2706, -71.3033]} zoom={10} scrollWheelZoom={false} id="map-container">
        <MapBlurHandler onBlur={() => { setSelectedRoute(undefined); setSelectedPeak(undefined); }} />
        <Pane name="trails" style={{ zIndex: 200 }} />
        <Pane name="routes" style={{ zIndex: 400 }} />
        <Pane name="peaks" style={{ zIndex: 600 }} />
        <TileLayer {...tileLayerProps} />

        {visibleRoutes && <GeoJSON
          data={visibleRoutes}
          data-testid="routes"
          pane="routes"
          key={visibleRoutesKey(settings, selectedPeak)}
          onEachFeature={(feature: Feature<LineString, RouteProperties>, layer) => {
            layer.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              setSelectedRoute(current => current?.properties.name === feature.properties.name ? undefined : feature);
            });
          }}
          style={feature => {
            const hue = hueFor(feature);
            return {
              color: `hsl(${hue}, 70%, 50%)`,
              weight: feature === selectedRoute ? 7 : 3,
              opacity: feature === selectedRoute ? 0.9 : 0.6,
            };
          }}
        />}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={(zoomLevel: number) => zoomLevel > 9 ? 8 : 80} clusterPane="peaks">
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
            />
          )}
        </MarkerClusterGroup>
        <LayersControl position="bottomleft" collapsed={false}>
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
        <SettingsControl onToggle={() => setIsSettingsOpen(open => !open)} position="topright" />
        <RouteWatcher selectedRoute={selectedRoute} />
        <PeakWatcher selectedPeak={selectedPeak} visibleRoutes={visibleRoutes} />
      </MapContainer>
      <aside hidden={!isSettingsOpen && !selectedRoute && !selectedPeak}>
        {isSettingsOpen && <Settings settings={settings} updateTerrainLevel={updateTerrainLevel} onClose={() => setIsSettingsOpen(false)} />}
        {selectedRoute && <RouteDetails route={selectedRoute} allPeaks={peaks} setSelectedPeak={setSelectedPeak} onClose={() => setSelectedRoute(undefined)} />}
        {selectedPeak && <PeakDetails peak={selectedPeak} onClose={() => setSelectedPeak(undefined)} />}
      </aside>
    </main>
  );
}

function SidebarPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <section>
      <header>
        <h2>{title}</h2>
        <button aria-label="Close" type="button" onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </header>
      {children}
    </section>
  );
}

function Settings({ settings, updateTerrainLevel, onClose }: { settings: Settings, updateTerrainLevel: (level: WinterTerrainLevelSetting, value: boolean) => void, onClose: () => void }) {
  return (
    <SidebarPanel title="Settings" onClose={onClose}>
      <form>
        <h3>Filter by Terrain Level</h3>
        <label><input type="checkbox" checked={settings.visibleTerrainLevels.A} onChange={() => updateTerrainLevel('A', !settings.visibleTerrainLevels.A)} /> A</label>
        <label><input type="checkbox" checked={settings.visibleTerrainLevels.B} onChange={() => updateTerrainLevel('B', !settings.visibleTerrainLevels.B)} /> B</label>
        <label><input type="checkbox" checked={settings.visibleTerrainLevels.C} onChange={() => updateTerrainLevel('C', !settings.visibleTerrainLevels.C)} /> C</label>
        <label><input type="checkbox" checked={settings.visibleTerrainLevels.summer} onChange={() => updateTerrainLevel('summer', !settings.visibleTerrainLevels.summer)} /> 3-Season</label>
      </form>
    </SidebarPanel>
  );
}

function PeakDetails({ peak, onClose }: { peak: Feature<Point, PeakProperties>, onClose: () => void }) {
  const { name, ele } = peak.properties;
  const elevation = metersToFeet(parseFloat(ele));
  return (
    <SidebarPanel title={name} onClose={onClose}>
      <p>Elevation: {elevation} ft</p>
    </SidebarPanel>
  );
}

interface RouteDetailsProps {
  route: Feature<LineString, RouteProperties>;
  onClose: () => void;
  setSelectedPeak: (peak: Feature<Point, PeakProperties>) => void;
  allPeaks: FeatureCollection<Point, PeakProperties> | null;
}

function RouteDetails({ route, onClose, setSelectedPeak, allPeaks }: RouteDetailsProps) {
  const { name, trips, total_elevation_gain, peaks } = route.properties;
  return (
    <SidebarPanel title={name} onClose={onClose}>
      <p>Elevation gain: {metersToFeet(total_elevation_gain)} ft</p>
      <h3>Peaks</h3>
      <ul>
        {peaks.map(peak => {
          const feature = allPeaks?.features.find(p => p.id === peak);
          return (feature)
            ? (
              <li key={peak}>
                <a href="#" onClick={e => { e.preventDefault(); setSelectedPeak(feature); }}>
                  {feature.properties.name}
                  {' '}
                  ({metersToFeet(parseFloat(feature.properties.ele))} ft)
                </a>
              </li>)
            : null;
        })}
      </ul>
      <h3>Trips</h3>
      <ul>
        {trips.map(trip => (
          <li key={`${trip.date}${trip.url}`}><a href={trip.url} target="_blank">{trip.date}: {trip.name}</a></li>
        ))}
      </ul>
    </SidebarPanel>
  );
}
