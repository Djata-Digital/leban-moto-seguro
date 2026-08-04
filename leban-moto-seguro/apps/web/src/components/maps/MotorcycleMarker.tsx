import { DivIcon } from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import type { LiveMotorcycle } from '../../hooks/useLiveGps';

type Props = {
  motorcycle: LiveMotorcycle;
  onSelect?: (motorcycle: LiveMotorcycle) => void;
};

export function MotorcycleMarker({ motorcycle, onSelect }: Props) {
  const icon = new DivIcon({
    className: '',
    html: `
      <div style="
        background: ${markerColor(motorcycle)};
        color: white;
        border-radius: 999px;
        padding: 6px 8px;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,.25);
        border: 2px solid white;
        white-space: nowrap;
      ">
        🛵 ${motorcycle.plateNumber}
      </div>
    `,
    iconSize: [90, 34],
    iconAnchor: [45, 17],
  });

  return (
    <Marker
      position={[motorcycle.latitude, motorcycle.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect?.(motorcycle),
      }}
    >
      <Popup>
        <div className="space-y-1 text-sm">
          <strong>{motorcycle.plateNumber}</strong>
          <p>
            {motorcycle.brand} {motorcycle.model ?? ''}
          </p>
          <p>Dono: {motorcycle.ownerName}</p>
          <p>Status: {motorcycle.status}</p>
          <p>Velocidade: {motorcycle.speed ?? 0} km/h</p>
          <p>Bateria: {motorcycle.battery ?? '—'}%</p>
          <p>
            Ignição:{' '}
            {motorcycle.ignitionOn === true
              ? 'Ligada'
              : motorcycle.ignitionOn === false
                ? 'Desligada'
                : '—'}
          </p>
          <p>
            Atualizado:{' '}
            {motorcycle.recordedAt
              ? new Date(motorcycle.recordedAt).toLocaleString()
              : '—'}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function markerColor(motorcycle: LiveMotorcycle) {
  if (motorcycle.mapStatus === 'ALERT') return '#dc2626';
  if (motorcycle.status === 'ROBBED' || motorcycle.status === 'STOLEN') {
    return '#dc2626';
  }
  if ((motorcycle.battery ?? 100) < 20) return '#f97316';
  if (motorcycle.mapStatus === 'WARNING') return '#f59e0b';

  return '#16a34a';
}