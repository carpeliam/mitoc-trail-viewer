import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { trails } from './support/msw/handlers';
import App from '@/App.tsx';

it('renders', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});

it('displays trails by default', () => {
  render(<App />);
  expect(screen.getByTestId('trails')).toHaveAttribute('data-geojson-content', JSON.stringify(trails));
});
