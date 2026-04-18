#!/usr/bin/env node

import process from 'node:process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { overpassJson, type OverpassNode, type OverpassWay } from 'overpass-ts';
import osm2geojson from 'osm2geojson-lite';
import { featureCollection, simplify, truncate } from '@turf/turf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.join(__dirname, '..', 'public', 'generated');

const OVERPASS_QUERY = `
[out:json][timeout:180];

// 1. define USA area
area["ISO3166-1"="US"][admin_level=2]->.usa;

// 2. candidate peaks in bounding box, restricted to US
node
  ["natural"="peak"]
  ["name"~"."]
  ["ele"~"^(9[0-9]{2}|[1-9][0-9]{3,})"]
  (41,-73.8,47.6,-66.7)
  (area.usa)
  ->.peaks;

// 3. trails near peaks using large radius
way
  ["highway"~"path|footway|track|steps"]
  ["footway"!~"sidewalk"]
  ["foot"!~"no"]
  ["golf"!~"."]
  ["bicycle"!~"designated"]
  ["ski"!~"designated"]
  ["ski:nordic"!~"designated"]
  ["snowmobile"!~"designated"]
  ["atv"!~"designated"]
  ["motor_vehicle"!~"designated"]
  ["condition"!~"deficient|intolerable"]
  ["tunnel"!~"yes"]
  (around.peaks:5000)
  (area.usa)
  ->.trails;

// 4. output both peaks and trails
(
  .peaks;
  .trails;
);
out tags center geom;
`;

async function fetchOSM() {
  mkdirSync('./public/generated', { recursive: true });

  console.log('Fetching OSM data from Overpass…');
  const data = await overpassJson(OVERPASS_QUERY);

  if (data.elements.length === 0) {
    throw new Error(data.remark);
  }

  const peaks: OverpassNode[] = [], trails: OverpassWay[] = [];
  const desiredProperties = {
    LineString: ['id', 'name'],
    Point: ['id', 'name', 'ele'],
  };

  data.elements.forEach(element => {
    switch (element.type) {
      case 'node':
        peaks.push(element);
        break;
      case 'way':
        trails.push(element);
        break;

      default:
        console.error('unexpected element', element);
    }
  });
  for (const [type, elements] of Object.entries({ peaks, trails })) {
    console.log(`Converting ${type} to GeoJSON…`);
    const { features } = osm2geojson({ elements });
    const geojson = featureCollection(features.map(feature => {
      const properties = Object.fromEntries(
        Object.entries(feature.properties!).filter(([key]) => desiredProperties[feature.geometry.type as 'LineString' | 'Point'].includes(key)),
      );
      return { ...feature, properties };
    }));
    const simplified = simplify(geojson, {
      tolerance: 0.00001,
      highQuality: false,
    });
    const truncated = truncate(simplified, { precision: 6 });

    console.log('Writing file…');
    writeFileSync(path.join(generatedDir, `${type}.geojson`), JSON.stringify(truncated));
  }

  console.log('Done.');
}

if (['peaks', 'trails'].every(type => existsSync(path.join(generatedDir, `${type}.geojson`)))) {
  console.log('OSM data already exists, skipping fetch.');
} else {
  fetchOSM().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
