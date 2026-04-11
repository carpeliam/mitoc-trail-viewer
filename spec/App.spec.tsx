import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { peaks, trails, routes } from './support/msw/handlers';
import App from '@/App.tsx';
import type { FeatureCollection, LineString } from 'geojson';

it('renders', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});

it('displays trails by default', async () => {
  render(<App />);
  expect(await screen.findByTestId('trails')).toHaveAttribute('data-geojson-content', JSON.stringify(trails));
});

it('displays peaks by default', async () => {
  render(<App />);
  expect(await screen.findByTestId('peaks')).toHaveAttribute('data-geojson-content', JSON.stringify(peaks));
});

it('displays all routes by default', async () => {
  render(<App />);
  expect(await screen.findByTestId('routes')).toHaveAttribute('data-geojson-content', JSON.stringify(routes));
});

it('displays relevant routes when I click on a peak', async () => {
  render(<App />);
  fireEvent.click(await screen.findByTestId('node/358211478'));
  const routesLayer = await screen.findByTestId('routes');
  const routesData = JSON.parse(routesLayer.getAttribute('data-geojson-content')!) as FeatureCollection<LineString, { name: string }>;
  const routeNames = routesData.features.map(f => f.properties.name);

  expect(routeNames).toContain('Katahdin via Cathedral');
  expect(routeNames).not.toContain('Franconia Ridge Fun!');
});

it('clears selected peak filter when I click again on a peak', async () => {
  render(<App />);
  fireEvent.click(await screen.findByTestId('node/358211478'));
  fireEvent.click(screen.getByTestId('node/358211478'));

  expect(screen.getByTestId('routes')).toHaveAttribute('data-geojson-content', JSON.stringify(routes));
});

it('displays information about a route when I click on it', async () => {
  render(<App />);

  fireEvent.click(await screen.findByTestId('Franconia Ridge'));
  expect(await screen.findByRole('complementary')).toHaveTextContent('Franconia Ridge Fun!');
});
