import { useMemo, type ComponentProps } from 'react';
import Slider from '@rc-component/slider';
import type { Settings, WinterTerrainLevelSetting, DifficultyRatingSetting } from './settings';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { DifficultyRating, DifficultyRatingValue, PeakProperties, RouteProperties, Trip, WinterTerrainLevel } from '../types';
import '@rc-component/slider/assets/index.css';
import './Sidebar.css';

const METERS_TO_FEET = 3.28084;
const METERS_TO_MILES = 0.000621371;
function metersToFeet(meters: number): string {
  return Math.round(meters * METERS_TO_FEET).toLocaleString();
}
function metersToMiles(meters: number): string {
  return (meters * METERS_TO_MILES).toFixed(2);
}


interface SidebarPanelProps {
  title: string;
  type?: string;
  className?: string;
  onClose: () => void;
  children: React.ReactNode;
}
export function SidebarPanel({ title, type, className, onClose, children }: SidebarPanelProps) {
  return (
    <section className={`sidebar-card ${className ?? ''}`}>
      <header>
        <div>
          {type && <span>{type}</span>}
          <h2>{title}</h2>
        </div>
        <button aria-label="Close" type="button" onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </header>
      {children}
    </section>
  );
}

interface SettingsPanelProps {
  settings: Settings;
  routes: FeatureCollection<LineString, RouteProperties> | null;
  availableKeywords: string[];
  updateTerrainLevel: (level: WinterTerrainLevelSetting, value: boolean) => void;
  updateDifficultyRating: (rating: DifficultyRatingSetting, value: boolean) => void;
  updateDistance: (value: [number, number]) => void;
  toggleKeyword: (keyword: string) => void;
  onClose: () => void;
}
export function SettingsPanel({ settings, routes, availableKeywords, updateTerrainLevel, updateDistance, updateDifficultyRating, toggleKeyword, onClose }: SettingsPanelProps) {
  const { visibleTerrainLevels, visibleDifficulties, activeKeywords } = settings;
  const distanceProps = useMemo((): ComponentProps<typeof Slider> => {
    if (!routes?.features.length) return { disabled: true };
    const max = Math.max(...routes.features.map(f => f.properties.distance));
    return {
      max,
      marks: { 0: 0, [max]: metersToMiles(max) },
      defaultValue: [0, max],
    };
  }, [routes]);
  return (
    <SidebarPanel title="Settings" className="settings" onClose={onClose}>
      <form>
        <h3>Terrain level</h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <label><input type="checkbox" checked={visibleTerrainLevels.A} onChange={() => updateTerrainLevel('A', !visibleTerrainLevels.A)} /> A</label>
          <label><input type="checkbox" checked={visibleTerrainLevels.B} onChange={() => updateTerrainLevel('B', !visibleTerrainLevels.B)} /> B</label>
          <label><input type="checkbox" checked={visibleTerrainLevels.C} onChange={() => updateTerrainLevel('C', !visibleTerrainLevels.C)} /> C</label>
          <label><input type="checkbox" checked={visibleTerrainLevels.summer} onChange={() => updateTerrainLevel('summer', !visibleTerrainLevels.summer)} /> 3-Season</label>
        </div>
        <h3>Difficulty</h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <label><input type="checkbox" checked={visibleDifficulties.L1} onChange={() => updateDifficultyRating('L1', !visibleDifficulties.L1)} /> L1</label>
          <label><input type="checkbox" checked={visibleDifficulties.L2} onChange={() => updateDifficultyRating('L2', !visibleDifficulties.L2)} /> L2</label>
          <label><input type="checkbox" checked={visibleDifficulties.L3} onChange={() => updateDifficultyRating('L3', !visibleDifficulties.L3)} /> L3</label>
          <label><input type="checkbox" checked={visibleDifficulties.L4} onChange={() => updateDifficultyRating('L4', !visibleDifficulties.L4)} /> L4</label>
          <label><input type="checkbox" checked={visibleDifficulties.L5} onChange={() => updateDifficultyRating('L5', !visibleDifficulties.L5)} /> L5</label>
        </div>
        <div>
          <label><input type="checkbox" checked={visibleDifficulties.includeSpicy} onChange={() => updateDifficultyRating('includeSpicy', !visibleDifficulties.includeSpicy)} /> Include "Spicy" routes</label>
        </div>
        <h3>Distance</h3>
        <div className="slider-wrapper">
          <Slider range {...distanceProps}
            styles={{
              track: { backgroundColor: 'var(--accent)' },
              handle: { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', opacity: 1 },
            }}
            handleRender={(node, handleProps) => {
              return (
                <div className="slider-handle-wrapper" style={{ left: node.props.style?.left }}>
                  <div className="slider-handle-inner">
                    {node}
                    {handleProps.dragging && <div className="slider-handle-tooltip">
                      {metersToMiles(handleProps.value)} mi
                    </div>}
                  </div>
                </div>
              );
            }}
            onChangeComplete={value => updateDistance(value as [number, number])}
            ariaLabelForHandle={['Minimum Distance', 'Maximum Distance']}
          />
        </div>
        {settings.distance && (
          <p>{metersToMiles(settings.distance[0])} – {metersToMiles(Math.min(settings.distance[1], distanceProps.max ?? settings.distance[1]))} miles</p>
        )}
        <h3>Keywords</h3>
        <div className="keyword-list">
          {availableKeywords.map(keyword => (
            <label key={keyword}>
              <input
                type="checkbox"
                checked={activeKeywords.has(keyword)}
                onChange={() => toggleKeyword(keyword)}
              />
              {keyword}
            </label>
          ))}
        </div>
      </form>
    </SidebarPanel>
  );
}

interface PeakPanelProps {
  peak: Feature<Point, PeakProperties>;
  onClose: () => void;
}
export function PeakPanel({ peak, onClose }: PeakPanelProps) {
  const { name, ele } = peak.properties;
  const elevation = metersToFeet(parseFloat(ele));
  return (
    <SidebarPanel title={name} type="Peak" onClose={onClose}>
      <p>Elevation: {elevation} ft</p>
    </SidebarPanel>
  );
}

interface RoutePanelProps {
  route: Feature<LineString, RouteProperties>;
  onClose: () => void;
  onPeakSelect: (peak: Feature<Point, PeakProperties>) => void;
  allPeaks: FeatureCollection<Point, PeakProperties> | null;
}
export function RoutePanel({ route, onClose, onPeakSelect, allPeaks }: RoutePanelProps) {
  const { name, trips, distance, total_elevation_gain, peaks } = route.properties;
  return (
    <SidebarPanel title={name} type="Route" onClose={onClose}>
      <div>Distance: {metersToMiles(distance)} mi</div>
      <div>Elevation gain: {metersToFeet(total_elevation_gain)} ft</div>
      <h3>Peaks</h3>
      <ul className="sidebar-list">
        {peaks.map(peak => {
          const feature = allPeaks?.features.find(p => p.id === peak);
          return (feature)
            ? (
              <li key={peak}>
                <button onClick={() => onPeakSelect(feature)}>
                  <span className="peak-dot" />
                  <span className="item-name">{feature.properties.name}</span>
                  <span className="item-meta">{metersToFeet(parseFloat(feature.properties.ele))} ft</span>
                </button>
              </li>)
            : null;
        })}
      </ul>
      <h3>Trips</h3>
      <ul className="sidebar-list">
        {trips.map(trip => <Trip trip={trip} key={`${trip.date}${trip.url}`} />)}
      </ul>
    </SidebarPanel>
  );
}

function Trip({ trip }: { trip: Trip }) {
  return (
    <li>
      <details>
        <summary>
          <div>
            <span className="item-name">{trip.name || <i>unnamed</i>}</span>
            <span className="item-meta">{trip.date}</span>
          </div>
        </summary>
        <div>
          {trip.url && <a href={trip.url} target="_blank" rel="noopener">{new URL(trip.url).origin}</a>}
          {trip.difficultyRating && <div>Difficulty: <abbr title={difficultyLabel(trip.difficultyRating)}>{trip.difficultyRating}</abbr></div>}
          {trip.winterTerrainLevel && <div>Terrain level: <abbr title={terrainLevelLabel(trip.winterTerrainLevel)}>{trip.winterTerrainLevel}</abbr></div>}
        </div>
      </details>

      {(trip.keywords) ? (
        <ul className="keyword-list">
          {trip.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}
        </ul>
      ) : null}
    </li>
  );
}

function terrainLevelLabel(level: WinterTerrainLevel): string {
  const levelLabels: Record<WinterTerrainLevel, string> = {
    'A': '<1 hr from definitive care',
    'B': '>=1 hr from definitive care, below treeline',
    'C': 'Above treeline',
  };

  return levelLabels[level];
}

function difficultyLabel(difficulty: DifficultyRatingValue): string {
  const difficultyLabels: Record<DifficultyRating, string> = {
    L1: 'Relaxed', L2: 'Easy', L3: 'Moderate', L4: 'Difficult', L5: 'Advanced',
  };

  const parts = difficulty.split(/[\s-]+/);
  const isSpicy = parts.includes('S+');

  const base = parts
    .filter((p): p is DifficultyRating => p in difficultyLabels)
    .map(p => difficultyLabels[p])
    .join(' – ');

  return isSpicy ? `${base} (Spicy)` : base;
}
