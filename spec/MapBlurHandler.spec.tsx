import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapContainer, useMap } from 'react-leaflet';
import { MapBlurHandler } from '@/map-friends';

function SomethingClickable({ name }: { name: string }) {
  const map = useMap();
  return (
    <button onClick={() => map.fireEvent('click')}>{name}</button>
  );
}

it('calls onBlur when the map is clicked', async () => {
  const onBlur = vi.fn();
  render(
    <MapContainer>
      <SomethingClickable name="Click me" />
      <MapBlurHandler onBlur={onBlur} delay={0} />
    </MapContainer>,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Click me' }));

  await waitFor(() => expect(onBlur).toHaveBeenCalled());
});
