import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '@/App.tsx';

it('filters routes by winter difficulty when a checkbox is clicked', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  expect(await screen.findByRole('checkbox', { name: 'A' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'B' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'C' })).toBeChecked();

  fireEvent.click(screen.getByRole('checkbox', { name: 'C' }));
  expect(screen.getByRole('checkbox', { name: 'C' })).not.toBeChecked();

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Franconia Ridge Fun!');
});

it('filters routes by keywords', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'Settings' }));

  fireEvent.click(await screen.findByRole('checkbox', { name: 'crampon' }));

  expect(screen.getByTestId('routes').getAttribute('data-geojson-content')).not.toContain('Katahdin via Cathedral');
});
