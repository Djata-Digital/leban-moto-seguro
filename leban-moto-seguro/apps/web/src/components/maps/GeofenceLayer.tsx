import { Circle as LeafletCircle, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';

type Geofence = {
  id: string;
  name: string;
  type: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  isActive: boolean;
  motorcycle?: {
    plateNumber?: string;
  };
};

type Props = {
  geofences: Geofence[];
  violatedGeofenceIds?: string[];
};

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function GeofenceLayer({
  geofences,
  violatedGeofenceIds = [],
}: Props) {
  return (
    <>
      {geofences.map((geofence) => {
        const isViolated = violatedGeofenceIds.includes(geofence.id);

        return (
          <div key={geofence.id}>
            <LeafletCircle
              center={[geofence.centerLat, geofence.centerLng]}
              radius={geofence.radiusMeters}
              pathOptions={{
                color: isViolated
                  ? '#dc2626'
                  : geofence.isActive
                    ? geofenceColor(geofence.type)
                    : '#94a3b8',
                fillColor: isViolated
                  ? '#dc2626'
                  : geofence.isActive
                    ? geofenceColor(geofence.type)
                    : '#94a3b8',
                fillOpacity: isViolated ? 0.28 : geofence.isActive ? 0.14 : 0.06,
                weight: isViolated ? 5 : 3,
              }}
              interactive={false}
            />

            <Marker
              position={[geofence.centerLat, geofence.centerLng]}
              icon={markerIcon}
            >
              <Popup>
                <strong>{geofence.name}</strong>
                <p>{translateType(geofence.type)}</p>
                <p>Status: {geofence.isActive ? 'Ativa' : 'Inativa'}</p>
                <p>Raio: {geofence.radiusMeters} m</p>
                <p>Mota: {geofence.motorcycle?.plateNumber ?? '—'}</p>
                {isViolated && (
                  <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                    ⚠ Geofence violada
                  </p>
                )}
              </Popup>
            </Marker>
          </div>
        );
      })}
    </>
  );
}

function geofenceColor(type: string) {
  if (type === 'ALLOWED_AREA') return '#16a34a';
  if (type === 'RESTRICTED_AREA') return '#dc2626';
  if (type === 'WARNING_AREA') return '#f59e0b';
  return '#2563eb';
}

function translateType(type: string) {
  if (type === 'ALLOWED_AREA') return 'Área permitida';
  if (type === 'RESTRICTED_AREA') return 'Área proibida';
  if (type === 'WARNING_AREA') return 'Área de atenção';
  return type;
}