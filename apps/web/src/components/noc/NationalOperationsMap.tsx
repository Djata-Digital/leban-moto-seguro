import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  calculateDistanceKm,
  calculateEstimatedMinutes,
  formatDistance,
  formatEstimatedTime,
} from '../../utils/mapUtils';

import {
  AlertTriangle,
  Bike,
  Expand,
  Filter,
  LocateFixed,
  Minimize,
  Search,
  ShieldAlert,
  Truck,
  UserRound,
  X,
} from 'lucide-react';


import type { LiveMotorcycle } from '../../hooks/useLiveGps';
import { LiveMotorcyclesMap } from '../maps/LiveMotorcyclesMap';
import { api } from '../../api/api';
import { socket } from '../../api/socket';

import type {
  LivePoliceLocation,
} from '../maps/LiveMotorcyclesMap';

type OpenAlert = {
  id: string;
  severity: string;
  type: string;
  title: string;
  message: string;

  motorcycle?: {
    id?: string;
    plateNumber?: string;
  };
};

type Dispatch = {
  id: string;
  code: string;
  status: string;
  priority: string;
  title: string;

  motorcycle?: {
    id?: string;
    plateNumber?: string;
  };

  policeOfficer?: {
    id?: string;
    fullName?: string;
  };
};

type FilterStatus =
  | 'ALL'
  | 'NORMAL'
  | 'WARNING'
  | 'ALERT'
  | 'STOLEN'
  | 'ROBBED';

type Props = {
  motorcycles: LiveMotorcycle[];
  alerts: OpenAlert[];
  dispatches: Dispatch[];
  selectedMotorcycle: LiveMotorcycle | null;
  onSelectMotorcycle: (
    motorcycle: LiveMotorcycle | null,
  ) => void;
};

export function NationalOperationsMap({
  motorcycles,
  alerts,
  dispatches,
  selectedMotorcycle,
  onSelectMotorcycle,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>('ALL');

  const [policeLocations, setPoliceLocations] =
    useState<LivePoliceLocation[]>([]);

  const [selectedPoliceOfficer, setSelectedPoliceOfficer] =
    useState<LivePoliceLocation | null>(null);

  const [showPolice, setShowPolice] =
    useState(true);

  const [showAlerts, setShowAlerts] =
    useState(true);

  const [showDispatches, setShowDispatches] =
    useState(true);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  useEffect(() => {
    async function loadPoliceLocations() {
      try {
        const response = await api.get(
          '/police-officers/locations/live',
        );

        const responseData =
          response.data?.data ??
          response.data ??
          [];

        setPoliceLocations(
          Array.isArray(responseData)
            ? responseData
            : [],
        );
      } catch (error) {
        console.error(
          'Erro ao carregar localizações policiais:',
          error,
        );

        setPoliceLocations([]);
      }
    }

    void loadPoliceLocations();

    function handlePoliceLocationUpdated(
      payload: LivePoliceLocation['location'] & {
        policeOfficerId?: string;
        policeOfficer?: {
          id?: string;
          fullName?: string;
          badgeNumber?: string;
          stationName?: string;
          phone?: string;
        };
        dispatch?: LivePoliceLocation['activeDispatch'];
      },
    ) {
      const policeOfficerId =
        payload.policeOfficerId ??
        payload.policeOfficer?.id;

      if (!policeOfficerId) {
        void loadPoliceLocations();
        return;
      }

      setPoliceLocations((current) => {
        const existingOfficer =
          current.find(
            (officer) =>
              officer.id === policeOfficerId,
          );

        if (!existingOfficer) {
          void loadPoliceLocations();
          return current;
        }

        return current.map((officer) =>
          officer.id === policeOfficerId
            ? {
                ...officer,
                operationalStatus:
                  resolveLivePoliceStatus(
                    payload.dispatch?.status,
                  ),
                activeDispatch:
                  payload.dispatch ??
                  officer.activeDispatch,
                location: {
                  ...officer.location,
                  ...payload,
                  latitude:
                    payload.latitude,
                  longitude:
                    payload.longitude,
                  isActive: true,
                },
              }
            : officer,
        );
      });
    }

    function handlePoliceLocationStopped(
      payload: {
        policeOfficerId?: string;
      },
    ) {
      if (!payload.policeOfficerId) {
        return;
      }

      setPoliceLocations((current) =>
        current.map((officer) =>
          officer.id ===
          payload.policeOfficerId
            ? {
                ...officer,
                operationalStatus:
                  'OFFLINE',
                location: officer.location
                  ? {
                      ...officer.location,
                      isActive: false,
                    }
                  : null,
              }
            : officer,
        ),
      );
    }

    socket.on(
      'police.location.updated',
      handlePoliceLocationUpdated,
    );

    socket.on(
      'police.location.stopped',
      handlePoliceLocationStopped,
    );

    socket.on(
      'dispatch.updated',
      loadPoliceLocations,
    );

    socket.on(
      'dispatch.assigned',
      loadPoliceLocations,
    );

    return () => {
      socket.off(
        'police.location.updated',
        handlePoliceLocationUpdated,
      );

      socket.off(
        'police.location.stopped',
        handlePoliceLocationStopped,
      );

      socket.off(
        'dispatch.updated',
        loadPoliceLocations,
      );

      socket.off(
        'dispatch.assigned',
        loadPoliceLocations,
      );
    };
  }, []);

  const activeDispatches = useMemo(
    () =>
      dispatches.filter(
        (dispatch) =>
          ![
            'RESOLVED',
            'CANCELLED',
          ].includes(dispatch.status),
      ),
    [dispatches],
  );

  const filteredMotorcycles = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return motorcycles.filter(
      (motorcycle) => {
        const matchesSearch =
          !normalizedSearch ||
          motorcycle.plateNumber
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          motorcycle.brand
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          motorcycle.model
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          motorcycle.ownerName
            ?.toLowerCase()
            .includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }

        if (statusFilter === 'ALL') {
          return true;
        }

        if (
          statusFilter === 'STOLEN' ||
          statusFilter === 'ROBBED'
        ) {
          return (
            motorcycle.status ===
            statusFilter
          );
        }

        return (
          motorcycle.mapStatus ===
          statusFilter
        );
      },
    );
  }, [
    motorcycles,
    search,
    statusFilter,
  ]);

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape' &&
        isFullscreen
      ) {
        setIsFullscreen(false);
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape,
      );
    };
  }, [isFullscreen]);

  const motorcycleAlert =
    selectedMotorcycle
      ? alerts.find(
          (alert) =>
            alert.motorcycle?.id ===
              selectedMotorcycle.motorcycleId ||
            alert.motorcycle
              ?.plateNumber ===
              selectedMotorcycle.plateNumber,
        )
      : undefined;

  const motorcycleDispatch =
    selectedMotorcycle
      ? activeDispatches.find(
          (dispatch) =>
            dispatch.motorcycle?.id ===
              selectedMotorcycle.motorcycleId ||
            dispatch.motorcycle
              ?.plateNumber ===
              selectedMotorcycle.plateNumber,
        )
      : undefined;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[2000] bg-slate-950'
          : 'overflow-hidden rounded-xl border bg-white shadow-sm'
      }
    >
      <div className="flex flex-col gap-3 border-b bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <LocateFixed
              size={19}
              className="text-blue-600"
            />

            Mapa Nacional de Operações
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {filteredMotorcycles.length}{' '}
            motas visíveis de{' '}
            {motorcycles.length} monitoradas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setShowAlerts(
                (current) => !current,
              )
            }
            className={
              showAlerts
                ? 'flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700'
                : 'flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600'
            }
          >
            <ShieldAlert size={15} />
            Alertas ({alerts.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setShowDispatches(
                (current) => !current,
              )
            }
            className={
              showDispatches
                ? 'flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700'
                : 'flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600'
            }
          >
            <Truck size={15} />
            Despachos (
            {activeDispatches.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setShowPolice(
                (current) => !current,
              )
            }
            className={
              showPolice
                ? 'flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700'
                : 'flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600'
            }
          >
            <UserRound size={15} />
            Policiais (
            {
              policeLocations.filter(
                (officer) =>
                  officer.location?.isActive,
              ).length
            }
            )
          </button>

          <button
            type="button"
            onClick={() =>
              setIsFullscreen(
                (current) => !current,
              )
            }
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            {isFullscreen ? (
              <>
                <Minimize size={15} />
                Sair da tela cheia
              </>
            ) : (
              <>
                <Expand size={15} />
                Tela cheia
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100%-81px)] grid-cols-1 lg:grid-cols-[300px_1fr_330px]">
        <aside className="border-r bg-white p-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Placa, marca, modelo ou proprietário..."
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter size={14} />
              Filtrar estado
            </p>

            <div className="grid grid-cols-2 gap-2">
              <FilterButton
                label="Todas"
                active={
                  statusFilter === 'ALL'
                }
                onClick={() =>
                  setStatusFilter('ALL')
                }
              />

              <FilterButton
                label="Normais"
                active={
                  statusFilter ===
                  'NORMAL'
                }
                onClick={() =>
                  setStatusFilter(
                    'NORMAL',
                  )
                }
              />

              <FilterButton
                label="Atenção"
                active={
                  statusFilter ===
                  'WARNING'
                }
                onClick={() =>
                  setStatusFilter(
                    'WARNING',
                  )
                }
              />

              <FilterButton
                label="Críticas"
                active={
                  statusFilter ===
                  'ALERT'
                }
                onClick={() =>
                  setStatusFilter(
                    'ALERT',
                  )
                }
              />

              <FilterButton
                label="Furtadas"
                active={
                  statusFilter ===
                  'STOLEN'
                }
                onClick={() =>
                  setStatusFilter(
                    'STOLEN',
                  )
                }
              />

              <FilterButton
                label="Roubadas"
                active={
                  statusFilter ===
                  'ROBBED'
                }
                onClick={() =>
                  setStatusFilter(
                    'ROBBED',
                  )
                }
              />
            </div>
          </div>

          <div className="mt-5 max-h-[520px] space-y-2 overflow-auto">
            {filteredMotorcycles.map(
              (motorcycle) => (
                <button
                  type="button"
                  key={
                    motorcycle.motorcycleId
                  }
                  onClick={() =>
                    onSelectMotorcycle(
                      motorcycle,
                    )
                  }
                  className={
                    selectedMotorcycle
                      ?.motorcycleId ===
                    motorcycle.motorcycleId
                      ? 'w-full rounded-lg border border-blue-300 bg-blue-50 p-3 text-left'
                      : 'w-full rounded-lg border p-3 text-left hover:bg-slate-50'
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {
                        motorcycle.plateNumber
                      }
                    </p>

                    <MapStatusBadge
                      status={
                        motorcycle.mapStatus
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {motorcycle.brand}{' '}
                    {motorcycle.model ?? ''}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Bateria:{' '}
                    {motorcycle.battery ??
                      '—'}
                    %
                  </p>
                </button>
              ),
            )}

            {!filteredMotorcycles.length && (
              <div className="py-10 text-center text-sm text-slate-500">
                Nenhuma mota encontrada.
              </div>
            )}
          </div>
        </aside>

        <section className="relative min-h-[650px]">
          <LiveMotorcyclesMap
            motorcycles={filteredMotorcycles}
            policeLocations={policeLocations}
            showPolice={showPolice}
            focusedPoliceOfficerId={
              selectedPoliceOfficer?.id ?? null
            }
            focusOperationOnly={
              Boolean(selectedPoliceOfficer)
            }
            height={
              isFullscreen
                ? 'calc(100vh - 81px)'
                : '720px'
            }
            onSelectMotorcycle={(motorcycle) => {
              setSelectedPoliceOfficer(null);
              onSelectMotorcycle(motorcycle);
            }}
            onSelectPoliceOfficer={(officer) => {
              onSelectMotorcycle(null);
              setSelectedPoliceOfficer(officer);
            }}
          />

          <div className="pointer-events-none absolute left-14 top-3 z-[500]">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-white/90 p-1 shadow-md backdrop-blur">
              <CompactOverlayMetric
                label="Motas"
                value={motorcycles.length}
                icon={<Bike size={13} />}
              />

              <CompactOverlayMetric
                label="Críticas"
                value={
                  motorcycles.filter(
                    (item) =>
                      item.mapStatus === 'ALERT',
                  ).length
                }
                icon={<AlertTriangle size={13} />}
              />

              <CompactOverlayMetric
                label="Alertas"
                value={
                  showAlerts
                    ? alerts.length
                    : 0
                }
                icon={<ShieldAlert size={13} />}
              />

              <CompactOverlayMetric
                label="Despachos"
                value={
                  showDispatches
                    ? activeDispatches.length
                    : 0
                }
                icon={<Truck size={13} />}
              />

              <CompactOverlayMetric
                label="Policiais"
                value={
                  showPolice
                    ? policeLocations.filter(
                        (officer) =>
                          officer.location?.isActive,
                      ).length
                    : 0
                }
                icon={<UserRound size={13} />}
              />
            </div>
          </div>
        </section>

        <aside className="border-l bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">
              Detalhes operacionais
            </h3>

            {selectedMotorcycle && (
              <button
                type="button"
                onClick={() =>
                  onSelectMotorcycle(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {selectedPoliceOfficer ? (
            <PoliceOperationalDetails
              officer={selectedPoliceOfficer}
              motorcycles={motorcycles}
              onClose={() =>
                setSelectedPoliceOfficer(null)
              }
            />
          ) : selectedMotorcycle ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-950 p-4 text-white">
                <p className="text-xs text-slate-400">
                  Placa
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    selectedMotorcycle.plateNumber
                  }
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {selectedMotorcycle.brand}{' '}
                  {selectedMotorcycle.model ??
                    ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <OperationalInfo
                  label="Estado"
                  value={
                    selectedMotorcycle.status
                  }
                />

                <OperationalInfo
                  label="Mapa"
                  value={
                    selectedMotorcycle.mapStatus
                  }
                />

                <OperationalInfo
                  label="Velocidade"
                  value={`${
                    selectedMotorcycle.speed ??
                    0
                  } km/h`}
                />

                <OperationalInfo
                  label="Bateria"
                  value={`${
                    selectedMotorcycle.battery ??
                    '—'
                  }%`}
                />
              </div>

              <div className="rounded-xl border p-3">
                <p className="text-xs text-slate-500">
                  Proprietário
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedMotorcycle.ownerName ??
                    '—'}
                </p>
              </div>

              <div className="rounded-xl border p-3">
                <p className="text-xs text-slate-500">
                  Coordenadas
                </p>

                <p className="mt-1 text-xs font-medium text-slate-700">
                  {selectedMotorcycle.latitude.toFixed(
                    6,
                  )}
                  ,{' '}
                  {selectedMotorcycle.longitude.toFixed(
                    6,
                  )}
                </p>
              </div>

              {showAlerts &&
                motorcycleAlert && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-bold text-red-700">
                      Alerta ativo
                    </p>

                    <p className="mt-1 text-sm font-semibold text-red-900">
                      {
                        motorcycleAlert.title
                      }
                    </p>

                    <p className="mt-1 text-xs text-red-700">
                      {
                        motorcycleAlert.message
                      }
                    </p>
                  </div>
                )}

              {showDispatches &&
                motorcycleDispatch && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                    <p className="text-xs font-bold text-purple-700">
                      Despacho ativo
                    </p>

                    <p className="mt-1 text-sm font-semibold text-purple-900">
                      {
                        motorcycleDispatch.code
                      }
                    </p>

                    <p className="mt-1 text-xs text-purple-700">
                      Status:{' '}
                      {
                        motorcycleDispatch.status
                      }
                    </p>

                    <p className="mt-1 text-xs text-purple-700">
                      Policial:{' '}
                      {motorcycleDispatch
                        .policeOfficer
                        ?.fullName ??
                        'Não designado'}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500">
              Selecione uma mota no mapa ou na lista.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white'
          : 'rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 hover:bg-slate-200'
      }
    >
      {label}
    </button>
  );
}

function MapStatusBadge({
  status,
}: {
  status: string;
}) {
  const className =
    status === 'ALERT'
      ? 'bg-red-100 text-red-700'
      : status === 'WARNING'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700';

  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${className}`}
    >
      {status}
    </span>
  );
}

function OperationalInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function CompactOverlayMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-600">
      <span className="text-blue-600">
        {icon}
      </span>

      <span>{label}</span>

      <strong className="text-slate-900">
        {value}
      </strong>
    </div>
  );
}

function PoliceOperationalDetails({
  officer,
  motorcycles,
  onClose,
}: {
  officer: LivePoliceLocation;
  motorcycles: LiveMotorcycle[];
  onClose: () => void;
}) {
  const location =
    officer.location;

  const assignedMotorcycleId =
    officer.activeDispatch
      ?.motorcycleId ??
    officer.activeDispatch
      ?.motorcycle?.id;

  const assignedMotorcycle =
    motorcycles.find(
      (motorcycle) =>
        motorcycle.motorcycleId ===
        assignedMotorcycleId,
    );

  const distanceKm =
    location &&
    assignedMotorcycle
      ? calculateDistanceKm(
          {
            latitude:
              location.latitude,
            longitude:
              location.longitude,
          },
          {
            latitude:
              assignedMotorcycle.latitude,
            longitude:
              assignedMotorcycle.longitude,
          },
        )
      : null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          <X size={17} />
        </button>
      </div>

      <div className="rounded-xl bg-blue-950 p-4 text-white">
        <p className="text-xs text-blue-300">
          Policial
        </p>

        <p className="mt-1 text-xl font-bold">
          {officer.fullName}
        </p>

        <p className="mt-1 text-sm text-blue-200">
          Matrícula:{' '}
          {officer.badgeNumber ?? '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <OperationalInfo
          label="Situação"
          value={translatePoliceStatus(
            officer.operationalStatus,
          )}
        />

        <OperationalInfo
          label="Unidade"
          value={
            officer.stationName ?? '—'
          }
        />

        <OperationalInfo
          label="Precisão"
          value={
            typeof location?.accuracy ===
            'number'
              ? `± ${Math.round(
                  location.accuracy,
                )} m`
              : '—'
          }
        />

        <OperationalInfo
          label="Velocidade"
          value={
            typeof location?.speed ===
            'number'
              ? `${location.speed.toFixed(
                  1,
                )} km/h`
              : '—'
          }
        />

        <OperationalInfo
          label="Distância da mota"
          value={
            distanceKm !== null
              ? formatDistance(distanceKm)
              : '—'
          }
        />

        <OperationalInfo
          label="ETA estimado"
          value={
            distanceKm !== null
              ? formatEstimatedTime(
                  calculateEstimatedMinutes(
                    distanceKm,
                  ),
                )
              : '—'
          }
        />
      </div>

      {officer.activeDispatch && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
          <p className="text-xs font-bold text-purple-700">
            Despacho atual
          </p>

          <p className="mt-1 font-semibold text-purple-900">
            {officer.activeDispatch.code}
          </p>

          <p className="mt-1 text-xs text-purple-700">
            Status:{' '}
            {officer.activeDispatch.status}
          </p>

          <p className="mt-1 text-xs text-purple-700">
            Mota:{' '}
            {officer.activeDispatch
              .motorcycle?.plateNumber ??
              '—'}
          </p>
        </div>
      )}

      <div className="rounded-xl border p-3">
        <p className="text-xs text-slate-500">
          Coordenadas
        </p>

        <p className="mt-1 text-xs font-medium text-slate-700">
          {location
            ? `${location.latitude.toFixed(
                6,
              )}, ${location.longitude.toFixed(
                6,
              )}`
            : 'Localização indisponível'}
        </p>
      </div>

      <div className="rounded-xl border p-3">
        <p className="text-xs text-slate-500">
          Última atualização
        </p>

        <p className="mt-1 text-sm font-medium text-slate-900">
          {location?.recordedAt
            ? new Date(
                location.recordedAt,
              ).toLocaleString()
            : '—'}
        </p>
      </div>
    </div>
  );
}

function resolveLivePoliceStatus(
  dispatchStatus?: string,
) {
  if (
    dispatchStatus === 'ACCEPTED' ||
    dispatchStatus === 'ON_ROUTE'
  ) {
    return 'EM_DESLOCAMENTO';
  }

  if (
    dispatchStatus === 'ARRIVED' ||
    dispatchStatus === 'SEARCHING' ||
    dispatchStatus ===
      'IN_PROGRESS' ||
    dispatchStatus === 'RECOVERED'
  ) {
    return 'EM_ATENDIMENTO';
  }

  if (dispatchStatus === 'ASSIGNED') {
    return 'DESIGNADO';
  }

  return 'DISPONIVEL';
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
