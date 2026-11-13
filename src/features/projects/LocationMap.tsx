import { config } from '../../lib/config';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { notify } from '../../lib/api';
export default function LocationMap({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const div = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const place = useRef<(point: L.LatLng) => void>(() => {});
  useEffect(() => {
    if (!div.current) return;
    const instance = L.map(div.current, { scrollWheelZoom: false }).setView([23.7, 80.5], 5);
    map.current = instance;
    L.tileLayer(config.mapTileUrl, {
      attribution: config.mapAttribution,
      maxZoom: 19,
    }).addTo(instance);
    const icon = L.divIcon({
      html: '<span class="map-pin"></span>',
      className: 'pin-wrapper',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });
    place.current = (point) => {
      if (!marker.current) {
        marker.current = L.marker(point, { draggable: true, icon }).addTo(instance);
        marker.current.on('dragend', () => {
          const p = marker.current!.getLatLng();
          change.current(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
        });
      } else marker.current.setLatLng(point);
    };
    instance.on('click', (event) => {
      place.current(event.latlng);
      change.current(`${event.latlng.lat.toFixed(6)}, ${event.latlng.lng.toFixed(6)}`);
    });
    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);
  useEffect(() => {
    const parts = (value || '').split(',').map(Number);
    if (
      parts.length === 2 &&
      parts.every(Number.isFinite) &&
      Math.abs(parts[0]) <= 90 &&
      Math.abs(parts[1]) <= 180 &&
      map.current
    ) {
      const point = L.latLng(parts[0], parts[1]);
      place.current(point);
      map.current.setView(point, Math.max(map.current.getZoom(), 12));
    }
  }, [value]);
  return (
    <div className="location-map-wrap">
      <div
        ref={div}
        className="location-map"
        role="region"
        aria-label="Click the map or drag the pin to select site coordinates"
      />
      <button
        type="button"
        className="btn secondary location-button"
        onClick={() => {
          if (!navigator.geolocation) {
            notify('Location is unavailable in this browser.', 'error');
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) =>
              onChange(
                `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
              ),
            () => notify('Location permission was denied or unavailable.', 'error'),
          );
        }}
      >
        <LocateFixed size={16} /> Use my location
      </button>
      <small className="muted">
        Click to place your pin. Drag it to refine the project location.
      </small>
    </div>
  );
}
