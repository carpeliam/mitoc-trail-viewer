#!/usr/bin/env node

import { distance } from '@turf/turf';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import yesno from 'yesno';
import type { RouteProperties } from '../types';
import { convertToExisting, geojsonUrlFor, isDuplicateRoute, type NewRouteProperties } from './support/detect-duplicates.ts';

const newRoutesFile = process.argv[2];
if (!newRoutesFile) {
  console.error('Usage: ./scripts/ingest-routes new-routes.geojson');
  process.exit(1);
}
const newRoutes = JSON.parse(fs.readFileSync(newRoutesFile, 'utf-8')) as FeatureCollection<LineString, NewRouteProperties>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const routesFile = path.join(publicDir, 'routes.geojson');

const existingRoutes: FeatureCollection<LineString, RouteProperties> = fs.existsSync(routesFile)
  ? JSON.parse(fs.readFileSync(routesFile, 'utf-8')) as FeatureCollection<LineString, RouteProperties>
  : { type: 'FeatureCollection', features: [] };

function isLoop(feature: Feature<LineString>) {
  const { coordinates } = feature.geometry;
  return distance(coordinates[0], coordinates[coordinates.length - 1], { units: 'meters' }) < 250;
}

for (const newRoute of newRoutes.features) {
  if (!isLoop(newRoute)) {
    console.warn('**** TRAVERSE FOUND');
    await open(geojsonUrlFor(newRoute));
    const ok = await yesno({ question: 'This route does not end at its starting point. Are you sure you want to add it? (y|N)', defaultValue: false });
    if (!ok) {
      continue;
    }
  }

  let foundDuplicate = false;

  for (const knownRoute of existingRoutes.features) {
    let isDupe = false;
    const { isDuplicate, reviewFlags } = isDuplicateRoute(newRoute, knownRoute);
    isDupe = isDuplicate;

    if (reviewFlags.length > 0) {
      console.log('**** POTENTIAL DUPLICATE FOUND', reviewFlags);
      console.log(geojsonUrlFor(newRoute));
      console.log();
      console.log(geojsonUrlFor(knownRoute));
      console.log();
      isDupe = await yesno({ question: 'Is this a duplicate?' });
    }
    if (isDupe) {
      const { date, url } = newRoute.properties;
      if (knownRoute.properties.trips.every(t => t.url !== url && url !== '')) {
        knownRoute.properties.trips.push({ date, url, name: '' });
      }
      foundDuplicate = true;
    }
  }

  if (!foundDuplicate) {
    existingRoutes.features.push(convertToExisting(newRoute));
  }
}

fs.writeFileSync(routesFile, JSON.stringify(existingRoutes), 'utf-8');

console.log('New routes ingested and written to', routesFile);
