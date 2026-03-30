import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { peaks, trails } from './support/msw/handlers';
import App from '@/App.tsx';

it('renders', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});

it('displays trails by default', async () => {
  render(<App />);
  expect(await screen.findByTestId('trails')).toHaveAttribute('data-geojson-content', JSON.stringify(trails));
});

it('displays peaks', async () => {
  render(<App />);
  expect(await screen.findByTestId('peaks')).toHaveAttribute('data-geojson-content', JSON.stringify(peaks));
});
