import { useMemo, useState } from 'react';
import { GeoJSON, LayersControl, MapContainer, Pane, TileLayer, type TileLayerProps } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import SettingsControl from './SettingsControl';
import { MapBlurHandler, PeakWatcher, RouteWatcher } from './map-friends';
import Search from './Search';
import { PeakPanel, RoutePanel, SettingsPanel } from './Sidebar';

import { useGeoJSON } from './data';
import { useSettings, isVisible, filterKey, type Settings } from './settings';

import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { PeakProperties, RouteProperties, TrailProperties } from '../types';

import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import './App.css';

function hueFor(feature: Feature<LineString, RouteProperties> | undefined): number {
  const name = feature?.properties.name;
  if (!name) return 35;
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  }
  // Mix bits so that similar names are less likely to have similar hues
  hash ^= hash >> 8;
  hash = (hash * 0x9e37) & 0xffff;
  hash ^= hash >> 4;
  return (hash % 38) + 7;
}

function visibleRoutesKey(settings: Settings, selectedPeak: Feature<Point, PeakProperties> | undefined) {
  return `${selectedPeak?.id ?? 'all-routes'}-${filterKey(settings)}`;
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
  const { settings, updateTerrainLevel, updateDifficultyRating, updateDistance, updateElevationGain, toggleKeyword } = useSettings();

  const availableKeywords = useMemo(() => {
    if (!routes) return [];
    const all = routes.features.flatMap(f =>
      f.properties.trips.flatMap(t => t.keywords ?? []),
    );
    return [...new Set(all)].sort();
  }, [routes]);

  const visibleRoutes = useMemo(() => {
    if (!routes) return null;
    return {
      ...routes,
      features: routes.features.filter(feature => {
        const passesSelectedPeak = !selectedPeak || feature.properties.peaks.includes(selectedPeak.id as string);
        return passesSelectedPeak && isVisible(feature, settings);
      }),
    };
  }, [routes, selectedPeak, settings]);

  const searchableRoutes = useMemo(() => (
    [...visibleRoutes?.features ?? [], ...peaks?.features ?? []]
  ), [visibleRoutes, peaks]);

  function selectSearchItem(item: Feature<LineString, RouteProperties> | Feature<Point, PeakProperties> | null) {
    if (item === null) return;
    if (item.geometry.type === 'Point') {
      setSelectedPeak(item as Feature<Point, PeakProperties>);
    } else {
      setSelectedRoute(item as Feature<LineString, RouteProperties>);
    }
  }

  return (
    <main>
      <MapContainer center={[44.2706, -71.3033]} zoom={10} id="map-container">
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
            const hue = hueFor(feature as Feature<LineString, RouteProperties>);
            return {
              color: `hsl(${hue}, 80%, 44%)`,
              weight: feature === selectedRoute ? 8 : 4,
              opacity: feature === selectedRoute ? 1 : 0.75,
            };
          }}
        />}
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
          <LayersControl.Overlay checked name="Display all peaks">
            <MarkerClusterGroup chunkedLoading maxClusterRadius={(zoomLevel: number) => zoomLevel > 9 ? 8 : 80} clusterPane="peaks">
              {peaks && (
                <GeoJSON data={peaks} data-testid="peaks" pane="peaks"
                  pointToLayer={(_point, latlng) => L.circleMarker(latlng, {
                    radius: 6,
                    color: '#6b5c52',      // stroke
                    fillColor: '#8c7b72',
                    fillOpacity: 0.75,
                    weight: 1.5,
                  })}
                  onEachFeature={(feature: Feature<Point, PeakProperties>, layer) => {
                    const { name } = feature.properties;

                    layer.bindPopup(name);
                    layer.on('click', (e) => {
                      L.DomEvent.stopPropagation(e);
                      setSelectedPeak(current => current?.id === feature.id ? undefined : feature);
                    });
                  }}
                />
              )}
            </MarkerClusterGroup>
          </LayersControl.Overlay>
        </LayersControl>
        <SettingsControl onToggle={() => setIsSettingsOpen(open => !open)} position="topright" />
        <RouteWatcher selectedRoute={selectedRoute} />
        <PeakWatcher selectedPeak={selectedPeak} visibleRoutes={visibleRoutes} />
        <Search features={searchableRoutes} className="map-search" onSelect={selectSearchItem} />
      </MapContainer>
      <aside hidden={!isSettingsOpen && !selectedRoute && !selectedPeak}>
        {isSettingsOpen && <SettingsPanel settings={settings} routes={routes} availableKeywords={availableKeywords} updateTerrainLevel={updateTerrainLevel} updateDifficultyRating={updateDifficultyRating} updateDistance={updateDistance} updateElevationGain={updateElevationGain} toggleKeyword={toggleKeyword} onClose={() => setIsSettingsOpen(false)} />}
        {selectedRoute && <RoutePanel route={selectedRoute} allPeaks={peaks} onPeakSelect={setSelectedPeak} onClose={() => setSelectedRoute(undefined)} />}
        {selectedPeak && <PeakPanel peak={selectedPeak} onClose={() => setSelectedPeak(undefined)} />}
      </aside>
    </main>
  );
}
