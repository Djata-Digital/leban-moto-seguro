import { useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import { SatelliteMapLayers } from '../../components/maps/SatelliteMapLayers';
import { Icon, LatLngBounds } from 'leaflet';
import {
  Clock3,
  Gauge,
  MapPin,
  Navigation,
} from 'lucide-react';

export type NavigationPosition = {
  latitude: number;
  longitude: number;
};

export type NavigationTrackPoint = NavigationPosition & {
  id?: string;
  speed?: number;
  recordedAt?: string;
};

type PoliceNavigationMapProps = {
  officerPosition: NavigationPosition | null;
  motorcyclePosition: NavigationPosition | null;
  motorcycleTrack?: NavigationTrackPoint[];
  motorcyclePlate?: string;
  officerAccuracy?: number | null;
  officerLastUpdate?: string;
  isSharingLocation?: boolean;
  showMotorcycleTrack?: boolean;
  height?: string;
};

const motorcycleIcon = new Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function PoliceNavigationMap({
  officerPosition,
  motorcyclePosition,
  motorcycleTrack = [],
  motorcyclePlate,
  officerAccuracy,
  officerLastUpdate,
  isSharingLocation = false,
  showMotorcycleTrack = true,
  height = '430px',
}: PoliceNavigationMapProps) {
  const fallbackCenter: [number, number] = [
    11.8597,
    -15.5982,
  ];

  const center: [number, number] =
    officerPosition
      ? [
          officerPosition.latitude,
          officerPosition.longitude,
        ]
      : motorcyclePosition
        ? [
            motorcyclePosition.latitude,
            motorcyclePosition.longitude,
          ]
        : fallbackCenter;

  const directRoutePositions: [
    number,
    number,
  ][] = [];

  if (officerPosition) {
    directRoutePositions.push([
      officerPosition.latitude,
      officerPosition.longitude,
    ]);
  }

  if (motorcyclePosition) {
    directRoutePositions.push([
      motorcyclePosition.latitude,
      motorcyclePosition.longitude,
    ]);
  }

  const motorcycleTrackPositions: [
    number,
    number,
  ][] = motorcycleTrack.map(
    (point) => [
      point.latitude,
      point.longitude,
    ],
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div style={{ height }}>
        <MapContainer
          center={center}
          zoom={14}
          style={{
            height: '100%',
            width: '100%',
          }}
        >
          <SatelliteMapLayers />

          <FitNavigationBounds
            officerPosition={officerPosition}
            motorcyclePosition={motorcyclePosition}
            motorcycleTrack={motorcycleTrack}
          />

          {showMotorcycleTrack &&
            motorcycleTrackPositions.length > 1 && (
              <Polyline
                positions={
                  motorcycleTrackPositions
                }
                pathOptions={{
                  color: '#dc2626',
                  weight: 5,
                  opacity: 0.85,
                }}
              />
            )}

          {showMotorcycleTrack &&
            motorcycleTrack.map(
              (point, index) => (
                <CircleMarker
                  key={
                    point.id ??
                    `${point.latitude}-${point.longitude}-${index}`
                  }
                  center={[
                    point.latitude,
                    point.longitude,
                  ]}
                  radius={
                    index ===
                    motorcycleTrack.length - 1
                      ? 6
                      : 4
                  }
                  pathOptions={{
                    color: '#b91c1c',
                    fillColor: '#ef4444',
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <strong>
                        Ponto da rota da mota
                      </strong>

                      <p>
                        Latitude:{' '}
                        {point.latitude.toFixed(
                          6,
                        )}
                      </p>

                      <p>
                        Longitude:{' '}
                        {point.longitude.toFixed(
                          6,
                        )}
                      </p>

                      <p>
                        Velocidade:{' '}
                        {typeof point.speed ===
                        'number'
                          ? `${point.speed.toFixed(
                              1,
                            )} km/h`
                          : '—'}
                      </p>

                      <p>
                        Horário:{' '}
                        {point.recordedAt
                          ? new Date(
                              point.recordedAt,
                            ).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ),
            )}

          {officerPosition &&
            typeof officerAccuracy ===
              'number' &&
            officerAccuracy > 0 && (
              <Circle
                center={[
                  officerPosition.latitude,
                  officerPosition.longitude,
                ]}
                radius={officerAccuracy}
                pathOptions={{
                  color: '#60a5fa',
                  fillColor: '#bfdbfe',
                  fillOpacity: 0.2,
                  weight: 1,
                }}
              />
            )}

          {officerPosition && (
            <CircleMarker
              center={[
                officerPosition.latitude,
                officerPosition.longitude,
              ]}
              radius={
                isSharingLocation ? 11 : 9
              }
              pathOptions={{
                color: isSharingLocation
                  ? '#16a34a'
                  : '#2563eb',
                fillColor: isSharingLocation
                  ? '#22c55e'
                  : '#3b82f6',
                fillOpacity: 0.9,
                weight: 4,
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <strong>
                    Localização do policial
                  </strong>

                  <p>
                    Latitude:{' '}
                    {officerPosition.latitude.toFixed(
                      6,
                    )}
                  </p>

                  <p>
                    Longitude:{' '}
                    {officerPosition.longitude.toFixed(
                      6,
                    )}
                  </p>

                  <p>
                    Precisão:{' '}
                    {typeof officerAccuracy ===
                    'number'
                      ? `± ${Math.round(
                          officerAccuracy,
                        )} m`
                      : '—'}
                  </p>

                  <p>
                    Compartilhamento:{' '}
                    {isSharingLocation
                      ? 'Ativo'
                      : 'Parado'}
                  </p>

                  <p>
                    Atualizado em:{' '}
                    {officerLastUpdate || '—'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {motorcyclePosition && (
            <Marker
              position={[
                motorcyclePosition.latitude,
                motorcyclePosition.longitude,
              ]}
              icon={motorcycleIcon}
            >
              <Popup>
                <div className="space-y-1">
                  <strong>
                    Mota{' '}
                    {motorcyclePlate ??
                      'monitorada'}
                  </strong>

                  <p>
                    Latitude:{' '}
                    {motorcyclePosition.latitude.toFixed(
                      6,
                    )}
                  </p>

                  <p>
                    Longitude:{' '}
                    {motorcyclePosition.longitude.toFixed(
                      6,
                    )}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {directRoutePositions.length ===
            2 && (
            <Polyline
              positions={
                directRoutePositions
              }
              pathOptions={{
                color: '#2563eb',
                weight: 4,
                opacity: 0.75,
                dashArray: '10 8',
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t bg-slate-50 p-4 sm:grid-cols-3">
        <PositionInfo
          icon={
            <Navigation size={17} />
          }
          label="Policial"
          position={officerPosition}
          extra={
            isSharingLocation
              ? `Compartilhando • ${
                  officerLastUpdate ||
                  'agora'
                }`
              : 'Compartilhamento parado'
          }
        />

        <PositionInfo
          icon={<MapPin size={17} />}
          label={`Mota ${
            motorcyclePlate ?? ''
          }`.trim()}
          position={motorcyclePosition}
        />

        <TrackInfo
          points={motorcycleTrack}
          visible={showMotorcycleTrack}
        />
      </div>
    </div>
  );
}

function FitNavigationBounds({
  officerPosition,
  motorcyclePosition,
  motorcycleTrack,
}: {
  officerPosition: NavigationPosition | null;
  motorcyclePosition: NavigationPosition | null;
  motorcycleTrack: NavigationTrackPoint[];
}) {
  const map = useMap();

  useEffect(() => {
    const positions: [
      number,
      number,
    ][] = [];

    if (officerPosition) {
      positions.push([
        officerPosition.latitude,
        officerPosition.longitude,
      ]);
    }

    if (motorcyclePosition) {
      positions.push([
        motorcyclePosition.latitude,
        motorcyclePosition.longitude,
      ]);
    }

    motorcycleTrack.forEach(
      (point) => {
        positions.push([
          point.latitude,
          point.longitude,
        ]);
      },
    );

    if (positions.length > 1) {
      const bounds =
        new LatLngBounds(
          positions,
        );

      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });

      return;
    }

    if (positions.length === 1) {
      map.setView(
        positions[0],
        15,
        {
          animate: true,
        },
      );
    }
  }, [
    map,
    motorcyclePosition,
    motorcycleTrack,
    officerPosition,
  ]);

  return null;
}

function PositionInfo({
  icon,
  label,
  position,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  position: NavigationPosition | null;
  extra?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-blue-600">
        {icon}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700">
          {label}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {position
            ? `${position.latitude.toFixed(
                6,
              )}, ${position.longitude.toFixed(
                6,
              )}`
            : 'Localização indisponível'}
        </p>

        {extra && (
          <p className="mt-1 text-[11px] text-slate-400">
            {extra}
          </p>
        )}
      </div>
    </div>
  );
}

function TrackInfo({
  points,
  visible,
}: {
  points: NavigationTrackPoint[];
  visible: boolean;
}) {
  const latestPoint =
    points[points.length - 1];

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-red-600">
        <Clock3 size={17} />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700">
          Rota recente
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {visible
            ? `${points.length} pontos`
            : 'Oculta'}
        </p>

        {latestPoint && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <Gauge size={12} />

            {typeof latestPoint.speed ===
            'number'
              ? `${latestPoint.speed.toFixed(
                  1,
                )} km/h`
              : 'Velocidade indisponível'}
          </p>
        )}
      </div>
    </div>
  );
}