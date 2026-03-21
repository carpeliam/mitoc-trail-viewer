import { MapContainer, TileLayer, type TileLayerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

export default function App() {
  const tileLayerProps: TileLayerProps = (import.meta.env.VITE_MAPBOX_API_TOKEN)
  ? {
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/" target="_blank">Improve this map</a>',
    url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${import.meta.env.VITE_MAPBOX_API_TOKEN}`,
  }
  : {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };

  return (
    <main>
      <MapContainer center={[44.2706, -71.3033]} zoom={12} scrollWheelZoom={false} id="map-container">
        <TileLayer {...tileLayerProps} />
      </MapContainer>
    </main>
  );
}
