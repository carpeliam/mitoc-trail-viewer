#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FeatureCollection, LineString } from 'geojson';
import type { RouteProperties } from '../types';
import { keysToCamelCase, type MitocTrip } from './support/mitoc.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const routesFile = path.join(publicDir, 'routes.geojson');


const mitocDump = process.argv[2];
if (!mitocDump) {
  console.error('Usage: ./scripts/add-mitoc-trip-data.ts path/to/mitoc-trips.json');
  process.exit(1);
}
const mitoc = keysToCamelCase(JSON.parse(fs.readFileSync(mitocDump, 'utf-8')) as object) as MitocTrip[];


const routes: FeatureCollection<LineString, RouteProperties> = fs.existsSync(routesFile)
  ? JSON.parse(fs.readFileSync(routesFile, 'utf-8')) as FeatureCollection<LineString, RouteProperties>
  : { type: 'FeatureCollection', features: [] };

routes.features.forEach(feature => {
  feature.properties.trips.forEach(trip => {
    const mitocTrip = mitoc.find(t => t.url === trip.url);
    if (mitocTrip) {
      console.log('adding', trip.url, mitocTrip.name);
      trip.name = mitocTrip.name;
      if (mitocTrip.winter_terrain_level) {
        trip.winterTerrainLevel = mitocTrip.winter_terrain_level;
      }
    }
  });
});

fs.writeFileSync(routesFile, JSON.stringify(routes), 'utf-8');

console.log('MITOC trip data added to routes');
