import {
  useEffect,
  useState,
} from 'react';

import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import { SatelliteMapLayers } from './SatelliteMapLayers';

import { LatLngBounds } from 'leaflet';

import {
  calculateDistanceKm,
  calculateEstimatedMinutes,
  formatDistance,
  formatEstimatedTime,
} from '../../utils/mapUtils';

import { GeofenceLayer } from './GeofenceLayer';
import { MotorcycleMarker } from './MotorcycleMarker';

import type { LiveMotorcycle } from '../../hooks/useLiveGps';

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

export type LivePoliceLocation = {
  id: string;
  fullName: string;
  badgeNumber?: string;
  stationName?: string;
  phone?: string;
  userStatus?: string;
  operationalStatus: string;

  activeDispatch?: {
    id: string;
    code: string;
    status: string;
    motorcycleId?: string;

    motorcycle?: {
      id?: string;
      plateNumber?: string;
    };
  } | null;

  location?: {
    id?: string;
    policeOfficerId?: string;
    dispatchId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    isActive?: boolean;
    recordedAt?: string;
  } | null;
};

type Props = {
  motorcycles: LiveMotorcycle[];
  geofences?: Geofence[];
  violatedGeofenceIds?: string[];
  policeLocations?: LivePoliceLocation[];
  showPolice?: boolean;
  height?: string;
  focusedPoliceOfficerId?: string | null;
  focusOperationOnly?: boolean;

  onSelectMotorcycle?: (
    motorcycle: LiveMotorcycle,
  ) => void;

  onSelectPoliceOfficer?: (
    officer: LivePoliceLocation,
  ) => void;
};

export function LiveMotorcyclesMap({
  motorcycles,
  geofences = [],
  violatedGeofenceIds = [],
  policeLocations = [],
  showPolice = true,
  height = '620px',
  focusedPoliceOfficerId = null,
  focusOperationOnly = false,
  onSelectMotorcycle,
  onSelectPoliceOfficer,
}: Props) {
  const focusedOfficer =
    focusedPoliceOfficerId
      ? policeLocations.find(
          (officer) =>
            officer.id === focusedPoliceOfficerId,
        ) ?? null
      : null;

  const focusedMotorcycleId =
    focusedOfficer?.activeDispatch?.motorcycleId ??
    focusedOfficer?.activeDispatch?.motorcycle?.id ??
    null;

  const visiblePoliceLocations =
    focusOperationOnly && focusedOfficer
      ? [focusedOfficer]
      : policeLocations;

  const visibleMotorcycles =
    focusOperationOnly && focusedMotorcycleId
      ? motorcycles.filter(
          (motorcycle) =>
            motorcycle.motorcycleId ===
            focusedMotorcycleId,
        )
      : motorcycles;
  const firstPoliceWithLocation =
    visiblePoliceLocations.find(
      (officer) =>
        officer.location &&
        typeof officer.location.latitude ===
          'number' &&
        typeof officer.location.longitude ===
          'number',
    );

  const center: [number, number] =
    visibleMotorcycles.length > 0
      ? [
          visibleMotorcycles[0].latitude,
          visibleMotorcycles[0].longitude,
        ]
      : firstPoliceWithLocation?.location
        ? [
            firstPoliceWithLocation.location.latitude,
            firstPoliceWithLocation.location.longitude,
          ]
        : geofences.length > 0
          ? [
              geofences[0].centerLat,
              geofences[0].centerLng,
            ]
          : [11.8597, -15.5982];
  
  const policeDispatchConnections =
    visiblePoliceLocations
      .map((officer) => {
        const policeLocation =
          officer.location;

        const motorcycleId =
          officer.activeDispatch?.motorcycleId ??
          officer.activeDispatch?.motorcycle?.id;

        if (
          !showPolice ||
          !policeLocation?.isActive ||
          !motorcycleId
        ) {
          return null;
        }

        const motorcycle =
          visibleMotorcycles.find(
            (item) =>
              item.motorcycleId === motorcycleId,
          );

        if (!motorcycle) {
          return null;
        }

        const distanceKm =
          calculateDistanceKm(
            {
              latitude:
                policeLocation.latitude,
              longitude:
                policeLocation.longitude,
            },
            {
              latitude:
                motorcycle.latitude,
              longitude:
                motorcycle.longitude,
            },
          );

        return {
          officer,
          motorcycle,
          distanceKm,
        };
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => item !== null,
      );

  return (
    <div style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <SatelliteMapLayers />

        <FitOperationsBounds
          motorcycles={visibleMotorcycles}
          policeLocations={
            showPolice
              ? visiblePoliceLocations
              : []
          }
        />

        <GeofenceLayer
          geofences={geofences}
          violatedGeofenceIds={
            violatedGeofenceIds
          }
        />

        {visibleMotorcycles.map((motorcycle) => (
          <MotorcycleMarker
            key={motorcycle.motorcycleId}
            motorcycle={motorcycle}
            onSelect={onSelectMotorcycle}
          />
        ))}

        {policeDispatchConnections.map(
          ({
            officer,
            motorcycle,
            distanceKm,
          }) => (
            <OperationalRoadRoute
              key={`dispatch-road-route-${officer.id}`}
              officer={officer}
              motorcycle={motorcycle}
              fallbackDistanceKm={distanceKm}
            />
          ),
        )}

        {showPolice &&
          visiblePoliceLocations.map((officer) => {
            const location =
              officer.location;

            if (
              !location ||
              typeof location.latitude !==
                'number' ||
              typeof location.longitude !==
                'number'
            ) {
              return null;
            }

            const markerStyle =
              policeMarkerStyle(
                officer.operationalStatus,
              );

            return (
              <CircleMarker
                key={officer.id}
                center={[
                  location.latitude,
                  location.longitude,
                ]}
                radius={11}
                pathOptions={{
                  color: markerStyle.border,
                  fillColor:
                    markerStyle.background,
                  fillOpacity: 0.95,
                  weight: 4,
                }}
                eventHandlers={{
                  click: () =>
                    onSelectPoliceOfficer?.(
                      officer,
                    ),
                }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2">
                    <div>
                      <strong>
                        👮 {officer.fullName}
                      </strong>

                      <p className="text-xs text-slate-500">
                        Matrícula:{' '}
                        {officer.badgeNumber ??
                          '—'}
                      </p>
                    </div>

                    <p>
                      Unidade:{' '}
                      {officer.stationName ??
                        'Não informada'}
                    </p>

                    <p>
                      Situação:{' '}
                      {translatePoliceStatus(
                        officer.operationalStatus,
                      )}
                    </p>

                    {officer.activeDispatch && (
                      <>
                        <p>
                          Despacho:{' '}
                          {
                            officer
                              .activeDispatch.code
                          }
                        </p>

                        <p>
                          Mota:{' '}
                          {officer
                            .activeDispatch
                            .motorcycle
                            ?.plateNumber ??
                            '—'}
                        </p>
                      </>
                    )}

                    <p>
                      Precisão:{' '}
                      {typeof location.accuracy ===
                      'number'
                        ? `± ${Math.round(
                            location.accuracy,
                          )} m`
                        : '—'}
                    </p>

                    <p>
                      Última atualização:{' '}
                      {formatDate(
                        location.recordedAt,
                      )}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}

type RoadRouteResult = {
  positions: [number, number][];
  distanceKm: number;
  durationMinutes: number;
};

function OperationalRoadRoute({
  officer,
  motorcycle,
  fallbackDistanceKm,
}: {
  officer: LivePoliceLocation;
  motorcycle: LiveMotorcycle;
  fallbackDistanceKm: number;
}) {
  const [roadRoute, setRoadRoute] =
    useState<RoadRouteResult | null>(null);

  const [loadingRoute, setLoadingRoute] =
    useState(false);

  const [routeError, setRouteError] =
    useState('');

  const policeLocation = officer.location;

  useEffect(() => {
    if (
      !policeLocation ||
      !policeLocation.isActive
    ) {
      setRoadRoute(null);
      return;
    }

    let cancelled = false;

    async function loadRoadRoute() {
      try {
        setLoadingRoute(true);
        setRouteError('');

        const originLongitude =
          policeLocation!.longitude;

        const originLatitude =
          policeLocation!.latitude;

        const destinationLongitude =
          motorcycle.longitude;

        const destinationLatitude =
          motorcycle.latitude;

        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${originLongitude},${originLatitude};` +
          `${destinationLongitude},${destinationLatitude}` +
          '?overview=full&geometries=geojson&steps=false';

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Falha ao calcular rota: ${response.status}`,
          );
        }

        const result = await response.json();

        const route = result?.routes?.[0];

        const coordinates =
          route?.geometry?.coordinates;

        if (
          !route ||
          !Array.isArray(coordinates) ||
          coordinates.length < 2
        ) {
          throw new Error(
            'Nenhuma rota por estrada foi encontrada.',
          );
        }

        /*
         * O GeoJSON retorna [longitude, latitude].
         * O Leaflet utiliza [latitude, longitude].
         */
        const positions: [number, number][] =
          coordinates
            .filter(
              (coordinate: unknown) =>
                Array.isArray(coordinate) &&
                coordinate.length >= 2,
            )
            .map(
              (
                coordinate: [
                  number,
                  number,
                ],
              ) => [
                Number(coordinate[1]),
                Number(coordinate[0]),
              ],
            );

        const distanceKm =
          Number(route.distance) / 1000;

        const durationMinutes =
          Math.max(
            1,
            Math.ceil(
              Number(route.duration) / 60,
            ),
          );

        if (!cancelled) {
          setRoadRoute({
            positions,
            distanceKm,
            durationMinutes,
          });
        }
      } catch (error) {
        console.error(
          'Erro ao calcular rota operacional:',
          error,
        );

        if (!cancelled) {
          setRoadRoute(null);
          setRouteError(
            'Rota por estrada indisponível. Exibindo distância direta.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingRoute(false);
        }
      }
    }

    void loadRoadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    motorcycle.latitude,
    motorcycle.longitude,
    policeLocation?.latitude,
    policeLocation?.longitude,
    policeLocation?.isActive,
  ]);

  if (!policeLocation) {
    return null;
  }

  const fallbackPositions: [
    number,
    number,
  ][] = [
    [
      policeLocation.latitude,
      policeLocation.longitude,
    ],
    [
      motorcycle.latitude,
      motorcycle.longitude,
    ],
  ];

  const positions =
    roadRoute?.positions ??
    fallbackPositions;

  const displayedDistanceKm =
    roadRoute?.distanceKm ??
    fallbackDistanceKm;

  const displayedMinutes =
    roadRoute?.durationMinutes ??
    calculateEstimatedMinutes(
      fallbackDistanceKm,
    );

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: roadRoute
          ? '#2563eb'
          : '#64748b',
        weight: roadRoute ? 6 : 4,
        opacity: 0.9,
        dashArray: roadRoute
          ? undefined
          : '10 8',
      }}
    >
      <Popup>
        <div className="min-w-[230px] space-y-1">
          <strong>
            Rota operacional
          </strong>

          <p>
            Policial: {officer.fullName}
          </p>

          <p>
            Mota: {motorcycle.plateNumber}
          </p>

          <p>
            Tipo de rota:{' '}
            {roadRoute
              ? 'Percurso pelas estradas'
              : 'Distância direta'}
          </p>

          <p>
            Distância:{' '}
            {formatDistance(
              displayedDistanceKm,
            )}
          </p>

          <p>
            Tempo estimado:{' '}
            {formatEstimatedTime(
              displayedMinutes,
            )}
          </p>

          {loadingRoute && (
            <p className="text-xs text-blue-600">
              Calculando rota pelas estradas...
            </p>
          )}

          {routeError && (
            <p className="text-xs text-amber-700">
              {routeError}
            </p>
          )}
        </div>
      </Popup>
    </Polyline>
  );
}

function FitOperationsBounds({
  motorcycles,
  policeLocations,
}: {
  motorcycles: LiveMotorcycle[];
  policeLocations: LivePoliceLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    const positions: [number, number][] = [];

    motorcycles.forEach((motorcycle) => {
      if (
        Number.isFinite(motorcycle.latitude) &&
        Number.isFinite(motorcycle.longitude)
      ) {
        positions.push([
          motorcycle.latitude,
          motorcycle.longitude,
        ]);
      }
    });

    policeLocations.forEach((officer) => {
      const location = officer.location;

      if (
        location?.isActive &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude)
      ) {
        positions.push([
          location.latitude,
          location.longitude,
        ]);
      }
    });

    if (positions.length > 1) {
      map.fitBounds(
        new LatLngBounds(positions),
        {
          padding: [70, 70],
          maxZoom: 16,
          animate: true,
        },
      );

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
    motorcycles,
    policeLocations,
  ]);

  return null;
}

function policeMarkerStyle(
  status: string,
) {
  if (status === 'EM_ATENDIMENTO') {
    return {
      border: '#7e22ce',
      background: '#a855f7',
    };
  }

  if (status === 'EM_DESLOCAMENTO') {
    return {
      border: '#0369a1',
      background: '#0ea5e9',
    };
  }

  if (status === 'DESIGNADO') {
    return {
      border: '#c2410c',
      background: '#f97316',
    };
  }

  if (status === 'DISPONIVEL') {
    return {
      border: '#15803d',
      background: '#22c55e',
    };
  }

  return {
    border: '#475569',
    background: '#94a3b8',
  };
}

function translatePoliceStatus(
  status: string,
) {
  if (status === 'DISPONIVEL') {
    return 'Disponível';
  }

  if (status === 'DESIGNADO') {
    return 'Designado';
  }

  if (status === 'EM_DESLOCAMENTO') {
    return 'Em deslocamento';
  }

  if (status === 'EM_ATENDIMENTO') {
    return 'Em atendimento';
  }

  if (status === 'OFFLINE') {
    return 'Offline';
  }

  if (status === 'SEM_LOCALIZACAO') {
    return 'Sem localização';
  }

  return status;
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}
