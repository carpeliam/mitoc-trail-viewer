import { it, expect } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import App from '@/App.tsx';

it('filters routes by winter terrain level when a checkbox is checked', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  expect(await screen.findByRole('checkbox', { name: 'A' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'B' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'C' })).toBeChecked();

  fireEvent.click(screen.getByRole('checkbox', { name: 'C' }));
  expect(screen.getByRole('checkbox', { name: 'C' })).not.toBeChecked();

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Franconia Ridge Fun!');
});

it('filters routes by difficulty when a checkbox is checked', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  expect(await screen.findByRole('checkbox', { name: 'L1' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'L2' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'L3' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'L4' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'L5' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Include "Spicy" routes' })).toBeChecked();

  fireEvent.click(screen.getByRole('checkbox', { name: 'L4' }));
  expect(screen.getByRole('checkbox', { name: 'L4' })).not.toBeChecked();

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Franconia Ridge Fun!');
});

it('filters routes by keywords', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  fireEvent.click(await screen.findByRole('checkbox', { name: 'crampon' }));

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Katahdin via Cathedral');
});

it('filters routes by distance', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  const slider = await screen.findByRole('slider', { name: 'Maximum Distance' });
  act(() => { slider.focus(); });
  fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });
  fireEvent.keyUp(slider, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Franconia Ridge Fun!');
});

it('filters routes by elevation gain', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  const slider = await screen.findByRole('slider', { name: 'Maximum Elevation Gain' });
  act(() => { slider.focus(); });
  fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });
  fireEvent.keyUp(slider, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Franconia Ridge Fun!');
});
