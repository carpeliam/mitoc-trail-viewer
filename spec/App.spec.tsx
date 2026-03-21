import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App.tsx';

it('renders', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
