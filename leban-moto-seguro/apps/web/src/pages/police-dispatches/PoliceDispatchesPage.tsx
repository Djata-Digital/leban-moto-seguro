import { useEffect, useMemo, useRef, useState } from 'react';
import { DispatchChat } from '../../components/dispatch-chat/DispatchChat';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatchUnreadCount } from '../../hooks/useDispatchUnreadCount';
import { RecoveryEvidencePanel } from '../../components/recovery-evidences/RecoveryEvidencePanel';
import { RecoveryReportForm } from '../../components/recovery-report/RecoveryReportForm';

import {
  calculateDistanceKm,
  calculateEstimatedMinutes,
  formatDistance,
  formatEstimatedTime,
} from '../../utils/mapUtils';


import {
  PoliceNavigationMap,
  type NavigationPosition,
  type NavigationTrackPoint,
} from '../../components/police/PoliceNavigationMap';

import {
  CheckCircle2,
  CircleDot,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  FileText,
  RefreshCcw,
  Route,
  Search,
  Shield,
  XCircle,
} from 'lucide-react';

import { api } from '../../api/api';
import { clearAuth, getStoredUser } from '../../auth/auth';
import { socket } from '../../api/socket';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type DispatchEvent = {
  id: string;
  dispatchId: string;
  type: string;
  status?: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
};

type Dispatch = {
  id: string;
  code: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  notes?: string;

  createdAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  onRouteAt?: string;
  arrivedAt?: string;
  searchingAt?: string;
  startedAt?: string;
  recoveredAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;

  events?: DispatchEvent[];

  motorcycle?: {
    id?: string;
    plateNumber?: string;
    nationalCode?: string;
    brand?: string;
    model?: string;
    color?: string;
    type?: string;
    status?: string;
    chassisNumber?: string;
    engineNumber?: string;
    photoUrl?: string;

    owner?: {
      id?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      identityNumber?: string;
      address?: string;
      photoUrl?: string;
    };

    gpsDevices?: Array<{
    id?: string;
    isActive?: boolean;

    locations?: Array<{
      id?: string;
      latitude: number;
      longitude: number;
      speed?: number;
      battery?: number;
      ignitionOn?: boolean;
      recordedAt?: string;
      createdAt?: string;
    }>;
  }>;
  };
};


type PoliceOfficer = {
  id: string;
  fullName: string;
  badgeNumber?: string;
  stationName?: string;
  phone?: string;

  user?: {
    fullName?: string;
    email?: string;
    status?: string;
  };
};

type LastGpsLocation = {
  id?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  recordedAt?: string;
};

type ProximityStatus = {
  label: string;
  description: string;
  tone: 'red' | 'orange' | 'amber' | 'green';
};

export function PoliceDispatchesPage() {
  const navigate = useNavigate();
  const { id: routeOfficerId } = useParams();
  const id = routeOfficerId ?? getStoredUser()?.policeOfficerId;

  const [officer, setOfficer] = useState<PoliceOfficer | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDispatch, setSelectedDispatch] =
    useState<Dispatch | null>(null);

  const [officerPosition, setOfficerPosition] =
    useState<NavigationPosition | null>(null);
  const [motorcyclePosition, setMotorcyclePosition] =
    useState<NavigationPosition | null>(null);
  const [motorcycleTrack, setMotorcycleTrack] =
    useState<NavigationTrackPoint[]>([]);

  const [showMotorcycleTrack, setShowMotorcycleTrack] =
    useState(true);
  const [loadingNavigation, setLoadingNavigation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState('');

  const locationWatchIdRef = useRef<number | null>(null);
  const lastPoliceLocationSentAtRef = useRef(0);

  async function loadData() {
    if (!id) {
      return;
    }

    setLoading(true);

    try {
      const [officerResult, dispatchesResult] = await Promise.allSettled([
        api.get(`/police-officers/${id}`),
        api.get(`/police-officers/${id}/dispatches`),
      ]);

      if (officerResult.status === 'fulfilled') {
        setOfficer(officerResult.value.data.data);
      }

      if (dispatchesResult.status === 'fulfilled') {
        setDispatches(dispatchesResult.value.data.data ?? []);
      } else {
        setDispatches([]);
        console.error(
          'Erro ao carregar despachos:',
          dispatchesResult.reason,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedDispatch) {
      return;
    }

    const updatedDispatch = dispatches.find(
      (dispatch) =>
        dispatch.id === selectedDispatch.id,
    );

    if (updatedDispatch) {
      setSelectedDispatch(updatedDispatch);
    }
  }, [dispatches, selectedDispatch?.id]);
  

  useEffect(() => {
    void loadData();

    function handleDispatchAssigned() {
      void loadData();
    }

    function handleDispatchUpdated() {
      void loadData();
    }

    function handleDashboardUpdated(payload?: {
      type?: string;
    }) {
      if (
        !payload?.type ||
        payload.type.startsWith('dispatch.') ||
        payload.type.startsWith('recovery-report.')
      ) {
        void loadData();
      }
    }

    function handleRecoveryCompleted() {
      void loadData();
    }

    socket.on(
      'dispatch.assigned',
      handleDispatchAssigned,
    );

    socket.on(
      'dispatch.updated',
      handleDispatchUpdated,
    );

    socket.on(
      'dashboard.updated',
      handleDashboardUpdated,
    );

    socket.on(
      'recovery-report.completed',
      handleRecoveryCompleted,
    );

    return () => {
      socket.off(
        'dispatch.assigned',
        handleDispatchAssigned,
      );

      socket.off(
        'dispatch.updated',
        handleDispatchUpdated,
      );

      socket.off(
        'dashboard.updated',
        handleDashboardUpdated,
      );

      socket.off(
        'recovery-report.completed',
        handleRecoveryCompleted,
      );
    };
  }, [id]);

  useEffect(() => {
    const selectedMotorcycleId =
      selectedDispatch?.motorcycle?.id;

    if (!selectedMotorcycleId) {
      return;
    }

    function handleGpsLocationCreated(
      payload: unknown,
    ) {
      const objectPayload =
        payload &&
        typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : null;

      const motorcycleObject =
        objectPayload?.motorcycle &&
        typeof objectPayload.motorcycle === 'object'
          ? (objectPayload.motorcycle as Record<string, unknown>)
          : null;

      const payloadMotorcycleId =
        typeof objectPayload?.motorcycleId === 'string'
          ? objectPayload.motorcycleId
          : typeof motorcycleObject?.id === 'string'
            ? motorcycleObject.id
            : undefined;

      if (
        payloadMotorcycleId &&
        payloadMotorcycleId !== selectedMotorcycleId
      ) {
        return;
      }

      const location =
        extractGpsLocation(payload);

      if (!location) {
        return;
      }

      // Atualiza o marcador atual da mota no mapa.
      setMotorcyclePosition({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Cole o bloco da trilha exatamente aqui.
      setMotorcycleTrack((current) => {
        const nextPoint: NavigationTrackPoint = {
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          recordedAt:
            location.recordedAt ??
            new Date().toISOString(),
        };

        const thirtyMinutesAgo =
          Date.now() - 30 * 60 * 1000;

        return [...current, nextPoint].filter(
          (point) => {
            if (!point.recordedAt) {
              return true;
            }

            return (
              new Date(
                point.recordedAt,
              ).getTime() >=
              thirtyMinutesAgo
            );
          },
        );
      });
    }

    socket.on(
      'gps.location.created',
      handleGpsLocationCreated,
    );

    return () => {
      socket.off(
        'gps.location.created',
        handleGpsLocationCreated,
      );
    };
  }, [selectedDispatch?.motorcycle?.id]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, []);

  const activeDispatches = useMemo(
    () =>
      dispatches.filter((dispatch) =>
        [
          'ASSIGNED',
          'ACCEPTED',
          'ON_ROUTE',
          'ARRIVED',
          'SEARCHING',
          'IN_PROGRESS',
          'RECOVERED',
        ].includes(dispatch.status),
      ),
    [dispatches],
  );

  const pendingDispatches = useMemo(
    () =>
      dispatches.filter(
        (dispatch) =>
          dispatch.status === 'OPEN' ||
          dispatch.status === 'ASSIGNED',
      ),
    [dispatches],
  );

  const completedDispatches = useMemo(
    () =>
      dispatches.filter((dispatch) =>
        ['RESOLVED', 'CANCELLED'].includes(dispatch.status),
      ),
    [dispatches],
  );

  async function requestOfficerPosition() {
    if (!navigator.geolocation) {
      setLocationError(
        'Este navegador não oferece suporte à localização.',
      );
      return null;
    }

    return new Promise<NavigationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setOfficerPosition(currentPosition);
          setLocationAccuracy(position.coords.accuracy);
          setLastLocationUpdate(new Date(position.timestamp).toLocaleString());
          setLocationError('');
          resolve(currentPosition);
        },
        (error) => {
          console.error('Erro de localização:', error);

          if (error.code === error.PERMISSION_DENIED) {
            setLocationError(
              'Permissão de localização negada. Autorize o acesso à localização no navegador.',
            );
          } else {
            setLocationError(
              'Não foi possível obter a localização do policial.',
            );
          }

          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        },
      );
    });
  }

  function stopLocationSharing() {
  if (locationWatchIdRef.current !== null) {
    navigator.geolocation.clearWatch(
      locationWatchIdRef.current,
    );

    locationWatchIdRef.current = null;
  }

  setIsSharingLocation(false);

  if (id) {
    void api
      .patch(
        `/police-officers/${id}/locations/stop`,
      )
      .catch((error) => {
        console.error(
          'Erro ao encerrar localização no servidor:',
          error,
        );
      });
  }
}

  async function sendOfficerLocation(
    position: GeolocationPosition,
  ) {
    if (!id) {
      return;
    }

    const now = Date.now();

    /*
    * Evita enviar dezenas de requisições por segundo.
    * Envia no máximo uma posição a cada 5 segundos.
    */
    if (
      now -
        lastPoliceLocationSentAtRef.current <
      5000
    ) {
      return;
    }

    lastPoliceLocationSentAtRef.current =
      now;

    try {
      console.log(
        'Enviando localização do policial:',
        {
          policeOfficerId: id,
          dispatchId: selectedDispatch?.id,
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
          accuracy:
            position.coords.accuracy,
        },
      );

      await api.post(
        `/police-officers/${id}/locations`,
        {
          dispatchId:
            selectedDispatch?.id,
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
          accuracy:
            position.coords.accuracy,
          speed:
            position.coords.speed ??
            undefined,
          heading:
            position.coords.heading ??
            undefined,
          isActive: true,
        },
      );
    } catch (error: any) {
      console.error(
        'Erro ao enviar localização do policial:',
        error?.response?.data ?? error,
      );
    }
  }

  function startLocationSharing() {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError(
        'Este navegador não oferece suporte à localização.',
      );
      return;
    }

    if (locationWatchIdRef.current !== null) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setOfficerPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationAccuracy(position.coords.accuracy);

        setLastLocationUpdate(
          new Date(position.timestamp).toLocaleString(),
        );

        setLocationError('');
        setIsSharingLocation(true);

        void sendOfficerLocation(position);
      },
      
      (error) => {
        console.error('Erro no rastreamento da localização:', error);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Permissão de localização negada. Autorize o acesso à localização no navegador.',
          );
        } else {
          setLocationError(
            'Não foi possível acompanhar a localização do policial.',
          );
        }

        stopLocationSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      },
    );

    locationWatchIdRef.current = watchId;
    setIsSharingLocation(true);
  }

  async function updateDispatch(
    dispatchId: string,
    endpoint: string,
    notes: string,
  ) {
    try {
      setUpdatingId(dispatchId);

      const currentPosition =
        officerPosition ?? (await requestOfficerPosition());

      await api.patch(`/dispatches/${dispatchId}/${endpoint}`, {
        notes,
        latitude: currentPosition?.latitude,
        longitude: currentPosition?.longitude,
      });

      await loadData();
    } finally {
      setUpdatingId(null);
    }
  }

  async function acceptDispatch(dispatchId: string) {
    await updateDispatch(
      dispatchId,
      'accept',
      'Missão aceita pelo policial.',
    );
  }

  async function startRoute(dispatchId: string) {
    await updateDispatch(
      dispatchId,
      'on-route',
      'Policial iniciou o deslocamento.',
    );
  }

  async function arriveAtLocation(dispatchId: string) {
    await updateDispatch(
      dispatchId,
      'arrive',
      'Policial chegou ao local da ocorrência.',
    );
  }

  async function startSearch(dispatchId: string) {
    await updateDispatch(
      dispatchId,
      'search',
      'Busca pela motocicleta iniciada.',
    );
  }

  async function recoverMotorcycle(dispatchId: string) {
    const confirmed = window.confirm(
      'Confirma que a motocicleta foi localizada e recuperada?',
    );

    if (!confirmed) {
      return;
    }

    await updateDispatch(
      dispatchId,
      'recover',
      'Motocicleta localizada e recuperada.',
    );
  }

  async function resolveDispatch(dispatchId: string) {
    const confirmed = window.confirm(
      'Deseja encerrar este atendimento como resolvido?',
    );

    if (!confirmed) {
      return;
    }

    await updateDispatch(
      dispatchId,
      'resolve',
      'Atendimento encerrado pelo policial.',
    );

    stopLocationSharing();
  }

  async function getOfficerLocation() {
    await requestOfficerPosition();
  }

  async function loadNavigation(
    dispatch: Dispatch,
  ) {
    const motorcycleId =
      dispatch.motorcycle?.id;

    if (!motorcycleId) {
      window.alert(
        'Este despacho não possui uma mota vinculada.',
      );
      return;
    }

    setSelectedDispatch(dispatch);
    setLoadingNavigation(true);
    setLocationError('');
    setMotorcycleTrack([]);

    const positionFromDispatch =
      getMotorcyclePosition(dispatch);

    if (positionFromDispatch) {
      setMotorcyclePosition(
        positionFromDispatch,
      );
    } else {
      setMotorcyclePosition(null);
    }

    await getOfficerLocation();
    startLocationSharing();

    try {
      const response = await api.get(
        `/gps/motorcycle/${motorcycleId}/last-location`,
      );

      console.log(
        'Resposta da última localização da mota:',
        response.data,
      );

      const endDate = new Date();

      const startDate = new Date(
        endDate.getTime() -
          30 * 60 * 1000,
      );

      const historyResponse =
        await api.get(
          `/gps/motorcycle/${motorcycleId}/history`,
          {
            params: {
              startDate:
                startDate.toISOString(),
              endDate:
                endDate.toISOString(),
              limit: 500,
            },
          },
        );

      const track =
        extractMotorcycleTrack(
          historyResponse.data,
        );

      setMotorcycleTrack(track);

      const location =
        extractGpsLocation(
          response.data,
        );

      console.log(
        'Localização extraída da mota:',
        location,
      );

      if (location) {
        setMotorcyclePosition({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        setLocationError('');
      } else if (!positionFromDispatch) {
        setLocationError(
          'A mota ainda não possui uma localização GPS válida.',
        );
      }
    } catch (error: any) {
      console.error(
        'Erro ao carregar localização da mota:',
        error,
      );

      const responseMessage =
        error?.response?.data?.message;

      setLocationError(
        typeof responseMessage === 'string'
          ? responseMessage
          : 'Não foi possível carregar a última localização da mota.',
      );
    } finally {
      setLoadingNavigation(false);
    }
  }

  function closeDispatchDetails() {
    setSelectedDispatch(null);
    setMotorcyclePosition(null);
    setLocationError('');
  }

  function handleLogout() {
    stopLocationSharing();
    clearAuth();
    navigate('/login', { replace: true });
  }

    const currentDistanceKm =
      officerPosition !== null &&
      motorcyclePosition !== null
        ? calculateDistanceKm(
            officerPosition,
            motorcyclePosition,
          )
        : null;

  if (loading) {
    return (
      <p className="text-slate-500">
        Carregando despachos do policial...
      </p>
    );
  }

  if (!officer) {
    return (
      <p className="text-red-600">
        Policial não encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Shield size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Meus Despachos
              </h1>

              <p className="text-slate-500">
                {officer.fullName}
                {officer.badgeNumber
                  ? ` — Matrícula ${officer.badgeNumber}`
                  : ''}
              </p>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {officer.stationName ?? 'Unidade não informada'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric
          title="Aguardando ação"
          value={pendingDispatches.length}
          tone="amber"
        />

        <Metric
          title="Em andamento"
          value={
            activeDispatches.filter(
              (dispatch) =>
                dispatch.status !== 'OPEN' &&
                dispatch.status !== 'ASSIGNED',
            ).length
          }
          tone="blue"
        />

        <Metric
          title="Finalizados"
          value={completedDispatches.length}
          tone="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Missões atribuídas
            </h2>

            <p className="text-sm text-slate-500">
              Atualize cada etapa do atendimento conforme a operação avança.
            </p>
          </div>

          <div className="space-y-4">
            {activeDispatches.map((dispatch) => (
              <MissionCard
                key={dispatch.id}
                dispatch={dispatch}
                updating={updatingId === dispatch.id}
                onSelect={() => loadNavigation(dispatch)}
                onAccept={acceptDispatch}
                onRoute={startRoute}
                onArrive={arriveAtLocation}
                onSearch={startSearch}
                onRecover={recoverMotorcycle}
                onResolve={resolveDispatch}
              />
            ))}

            {!activeDispatches.length && (
              <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
                <CircleDot
                  size={42}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-700">
                  Nenhuma missão ativa
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Novos despachos designados aparecerão aqui.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-bold text-slate-900">
              Histórico recente
            </h2>
          </div>

          <div className="max-h-[700px] space-y-3 overflow-auto p-4">
            {completedDispatches.map((dispatch) => (
              <button
                type="button"
                key={dispatch.id}
                onClick={() => loadNavigation(dispatch)}
                className="w-full rounded-lg border p-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={dispatchStatusClass(dispatch.status)}
                  >
                    {translateDispatchStatus(dispatch.status)}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {formatDate(
                      dispatch.resolvedAt ??
                        dispatch.cancelledAt ??
                        dispatch.createdAt,
                    )}
                  </span>
                </div>

                <p className="mt-2 font-bold text-slate-900">
                  {dispatch.code}
                </p>

                <p className="text-sm text-slate-600">
                  {dispatch.motorcycle?.plateNumber ?? 'Sem placa'}
                </p>
              </button>
            ))}

            {!completedDispatches.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                Nenhum atendimento finalizado.
              </p>
            )}
          </div>
        </aside>
      </div>

      {selectedDispatch && (
        <DispatchDetailsModal
          dispatch={selectedDispatch}
          officer={officer}
          officerPosition={officerPosition}
          motorcyclePosition={motorcyclePosition}
          motorcycleTrack={motorcycleTrack}
          showMotorcycleTrack={showMotorcycleTrack}
          onToggleMotorcycleTrack={() =>
            setShowMotorcycleTrack(
              (current) => !current,
            )
          }
          loadingNavigation={loadingNavigation}
          locationError={locationError}
          distanceKm={currentDistanceKm}
          isSharingLocation={isSharingLocation}
          locationAccuracy={locationAccuracy}
          lastLocationUpdate={lastLocationUpdate}
          onRefreshOfficerLocation={getOfficerLocation}
          onStartLocationSharing={startLocationSharing}
          onStopLocationSharing={stopLocationSharing}
          onClose={closeDispatchDetails}
        />
      )}
    </div>
  );
}

function MissionCard({
  dispatch,
  updating,
  onSelect,
  onAccept,
  onRoute,
  onArrive,
  onSearch,
  onRecover,
  onResolve,
}: {
  dispatch: Dispatch;
  updating: boolean;
  onSelect: () => void;
  onAccept: (id: string) => void;
  onRoute: (id: string) => void;
  onArrive: (id: string) => void;
  onSearch: (id: string) => void;
  onRecover: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const motorcycleId = dispatch.motorcycle?.id;

  const { unreadCount } = useDispatchUnreadCount(
    dispatch.id,
    'POLICE',
  );

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={dispatchStatusClass(dispatch.status)}>
              {translateDispatchStatus(dispatch.status)}
            </span>

            <span className={priorityClass(dispatch.priority)}>
              {translatePriority(dispatch.priority)}
            </span>
          </div>

          <p className="mt-3 text-xs font-bold text-blue-700">
            {dispatch.code}
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {dispatch.title}
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            {dispatch.description ?? 'Sem descrição.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSelect}
          className="relative rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200"
        >
          Ver detalhes

          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-xl border bg-white">
          {resolveMediaUrl(dispatch.motorcycle?.photoUrl) ? (
            <img
              src={resolveMediaUrl(dispatch.motorcycle?.photoUrl) ?? undefined}
              alt={`Mota ${dispatch.motorcycle?.plateNumber ?? ''}`}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-slate-400">
              Sem imagem da mota
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Info label="Placa" value={dispatch.motorcycle?.plateNumber ?? '—'} />
          <Info label="Código nacional" value={dispatch.motorcycle?.nationalCode ?? '—'} />
          <Info label="Marca / modelo" value={`${dispatch.motorcycle?.brand ?? ''} ${dispatch.motorcycle?.model ?? ''}`.trim() || '—'} />
          <Info label="Cor" value={dispatch.motorcycle?.color ?? '—'} />
          <Info label="Tipo" value={translateMotorcycleType(dispatch.motorcycle?.type)} />
          <Info label="Estado" value={translateMotorcycleStatus(dispatch.motorcycle?.status)} />
          <Info label="Chassi" value={dispatch.motorcycle?.chassisNumber ?? '—'} />
          <Info label="Motor" value={dispatch.motorcycle?.engineNumber ?? '—'} />
          <Info label="Criado" value={formatDate(dispatch.createdAt)} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Proprietário
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          {resolveMediaUrl(dispatch.motorcycle?.owner?.photoUrl) ? (
            <img
              src={resolveMediaUrl(dispatch.motorcycle?.owner?.photoUrl) ?? undefined}
              alt={dispatch.motorcycle?.owner?.fullName ?? 'Proprietário'}
              className="h-20 w-20 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Shield size={28} />
            </div>
          )}
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Nome" value={dispatch.motorcycle?.owner?.fullName ?? '—'} />
            <Info label="Telefone" value={dispatch.motorcycle?.owner?.phone ?? '—'} />
            <Info label="E-mail" value={dispatch.motorcycle?.owner?.email ?? '—'} />
            <Info label="Documento" value={dispatch.motorcycle?.owner?.identityNumber ?? '—'} />
            <Info label="Endereço" value={dispatch.motorcycle?.owner?.address ?? '—'} />
          </div>
        </div>
      </div>

      <div className="mt-4 hidden grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
        <Info
          label="Placa"
          value={dispatch.motorcycle?.plateNumber ?? '—'}
        />

        <Info
          label="Mota"
          value={`${dispatch.motorcycle?.brand ?? ''} ${
            dispatch.motorcycle?.model ?? ''
          }`.trim() || '—'}
        />

        <Info
          label="Proprietário"
          value={dispatch.motorcycle?.owner?.fullName ?? '—'}
        />

        <Info
          label="Criado"
          value={formatDate(dispatch.createdAt)}
        />
      </div>

      {dispatch.notes && (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">
            Orientações da Central
          </p>

          <p className="mt-1 text-sm text-amber-700">
            {dispatch.notes}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {motorcycleId && (
          <>
            <Link
              to={`/motorcycles/${motorcycleId}/360`}
              className="rounded-lg bg-purple-50 py-2 text-center text-sm text-purple-700 hover:bg-purple-100"
            >
              Visão 360°
            </Link>

            <Link
              to={`/playback?motorcycleId=${motorcycleId}`}
              className="rounded-lg bg-blue-50 py-2 text-center text-sm text-blue-700 hover:bg-blue-100"
            >
              Playback
            </Link>
          </>
        )}

        {dispatch.status === 'ASSIGNED' && (
          <ActionButton
            label="Aceitar missão"
            disabled={updating}
            onClick={() => onAccept(dispatch.id)}
            tone="blue"
          />
        )}

        {dispatch.status === 'ACCEPTED' && (
          <ActionButton
            label="Em deslocamento"
            disabled={updating}
            onClick={() => onRoute(dispatch.id)}
            tone="cyan"
          />
        )}

        {dispatch.status === 'ON_ROUTE' && (
          <ActionButton
            label="Cheguei ao local"
            disabled={updating}
            onClick={() => onArrive(dispatch.id)}
            tone="indigo"
          />
        )}

        {dispatch.status === 'ARRIVED' && (
          <ActionButton
            label="Iniciar busca"
            disabled={updating}
            onClick={() => onSearch(dispatch.id)}
            tone="amber"
          />
        )}

        {dispatch.status === 'SEARCHING' && (
          <ActionButton
            label="Moto recuperada"
            disabled={updating}
            onClick={() => onRecover(dispatch.id)}
            tone="green"
          />
        )}

        {dispatch.status === 'RECOVERED' && (
          <ActionButton
            label="Encerrar missão"
            disabled={updating}
            onClick={() => onResolve(dispatch.id)}
            tone="green"
          />
        )}

        {dispatch.status === 'IN_PROGRESS' && (
          <ActionButton
            label="Encerrar missão"
            disabled={updating}
            onClick={() => onResolve(dispatch.id)}
            tone="green"
          />
        )}
      </div>
    </div>
  );
}

function DispatchDetailsModal({
  dispatch,
  officer,
  officerPosition,
  motorcyclePosition,
  motorcycleTrack,
  showMotorcycleTrack,
  onToggleMotorcycleTrack,
  loadingNavigation,
  locationError,
  distanceKm,
  isSharingLocation,
  locationAccuracy,
  lastLocationUpdate,
  onRefreshOfficerLocation,
  onStartLocationSharing,
  onStopLocationSharing,
  onClose,
}: {
  dispatch: Dispatch;
  officer: PoliceOfficer | null;
  officerPosition: NavigationPosition | null;
  motorcyclePosition: NavigationPosition | null;
  motorcycleTrack: NavigationTrackPoint[];
  showMotorcycleTrack: boolean;
  onToggleMotorcycleTrack: () => void;
  loadingNavigation: boolean;
  locationError: string;
  distanceKm: number | null;
  isSharingLocation: boolean;
  locationAccuracy: number | null;
  lastLocationUpdate: string;
  onRefreshOfficerLocation: () => void;
  onStartLocationSharing: () => void;
  onStopLocationSharing: () => void;
  onClose: () => void;
}) {
  const navigationUrl =
    motorcyclePosition
      ? `https://www.google.com/maps/dir/?api=1&destination=${motorcyclePosition.latitude},${motorcyclePosition.longitude}`
      : '';

  const estimatedMinutes =
      distanceKm !== null
    ? calculateEstimatedMinutes(
        distanceKm,
      )
    : null

  const proximityStatus =
    getProximityStatus(distanceKm);

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b bg-white p-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Missão e navegação operacional
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {dispatch.code} —{' '}
              {dispatch.motorcycle?.plateNumber ?? 'Sem placa'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <XCircle size={21} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Info
              label="Status"
              value={translateDispatchStatus(dispatch.status)}
            />

            <Info
              label="Prioridade"
              value={translatePriority(dispatch.priority)}
            />

            <Info
              label="Distância aproximada"
              value={
                distanceKm !== null
                  ? formatDistance(distanceKm)
                  : '—'
              }
            />

            <Info
              label="Tempo estimado"
              value={
                estimatedMinutes !== null
                  ? formatEstimatedTime(estimatedMinutes)
                  : '—'
              }
            />

            <Info
              label="Criado"
              value={formatDate(dispatch.createdAt)}
            />
          </div>

          {proximityStatus && (
            <div
              className={`rounded-xl border p-4 ${proximityToneClass(
                proximityStatus.tone,
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <LocateFixed size={22} />
                </div>

                <div>
                  <p className="font-bold">
                    {proximityStatus.label}
                  </p>

                  <p className="mt-1 text-sm opacity-90">
                    {proximityStatus.description}
                  </p>

                  {distanceKm !== null && (
                    <p className="mt-2 text-xs font-semibold">
                      Distância atual: {formatDistance(distanceKm)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  Navegação até a mota
                </h3>

                <p className="text-sm text-slate-500">
                  A linha no mapa representa a distância direta.
                </p>
                {distanceKm !== null && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Distância: {formatDistance(distanceKm)}
                    </span>

                    {estimatedMinutes !== null && (
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                        ETA aproximado:{' '}
                        {formatEstimatedTime(estimatedMinutes)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onRefreshOfficerLocation}
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  <LocateFixed size={16} />
                  Atualizar posição
                </button>

                {isSharingLocation ? (
                  <button
                    type="button"
                    onClick={onStopLocationSharing}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Parar compartilhamento
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartLocationSharing}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Compartilhar localização
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleMotorcycleTrack}
                  disabled={!motorcycleTrack.length}
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showMotorcycleTrack
                    ? 'Ocultar rota recente'
                    : 'Mostrar rota recente'}
                </button>

                {motorcyclePosition && (
                  <a
                    href={navigationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    <Route size={16} />
                    Abrir navegação
                  </a>
                )}
              </div>
            </div>

            {locationError && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {locationError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
              <Info
                label="Compartilhamento"
                value={isSharingLocation ? 'Ativo' : 'Parado'}
              />
              <Info
                label="Precisão"
                value={
                  locationAccuracy !== null
                    ? `± ${Math.round(locationAccuracy)} m`
                    : '—'
                }
              />
              <Info
                label="Última posição"
                value={lastLocationUpdate || '—'}
              />
            </div>

            <div className="mt-4">
              {loadingNavigation ? (
                <div className="flex h-[430px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
                  Carregando localização da mota...
                </div>
              ) : (
                <PoliceNavigationMap
                  officerPosition={officerPosition}
                  motorcyclePosition={motorcyclePosition}
                  motorcycleTrack={motorcycleTrack}
                  motorcyclePlate={
                    dispatch.motorcycle?.plateNumber
                  }
                  officerAccuracy={locationAccuracy}
                  officerLastUpdate={lastLocationUpdate}
                  isSharingLocation={isSharingLocation}
                  showMotorcycleTrack={showMotorcycleTrack}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="font-bold text-slate-900">
              Motocicleta
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Placa"
                value={dispatch.motorcycle?.plateNumber ?? '—'}
              />

              <Info
                label="Marca/modelo"
                value={
                  `${dispatch.motorcycle?.brand ?? ''} ${
                    dispatch.motorcycle?.model ?? ''
                  }`.trim() || '—'
                }
              />

              <Info
                label="Cor"
                value={dispatch.motorcycle?.color ?? '—'}
              />

              <Info
                label="Proprietário"
                value={
                  dispatch.motorcycle?.owner?.fullName ?? '—'
                }
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="font-bold text-slate-900">
              Linha do tempo
            </h3>

            <div className="rounded-xl border p-4">
              <RecoveryEvidencePanel
                dispatchId={dispatch.id}
                policeOfficerId={officer?.id}
                currentPosition={officerPosition}
                canUpload={
                  dispatch.status !== 'CANCELLED'
                }
                canDelete
              />
            </div>

            {dispatch.status === 'RESOLVED' && (
              <Link
                to={`/recovery-reports/${dispatch.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <FileText size={17} />
                Abrir dossiê da recuperação
              </Link>
            )}

            {['SEARCHING', 'RECOVERED', 'IN_PROGRESS'].includes(
              dispatch.status,
            ) && (
              <RecoveryReportForm
                dispatchId={dispatch.id}
                policeOfficerId={officer?.id}
                position={officerPosition}
                onCompleted={() => {
                  onStopLocationSharing();
                  onClose();
                  window.location.reload();
                }}
              />
            )}

            <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900">
                        Chat Operacional
                    </h3>

                    <span className="text-xs text-slate-500">
                        Comunicação em tempo real com a Central
                    </span>
                </div>

                <DispatchChat
                    dispatchId={dispatch.id}
                    senderType="POLICE"
                    
                />
            </div>

            <div className="mt-4 space-y-3">
              {(dispatch.events ?? []).map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 border-b pb-3"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    {eventIcon(event.type)}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {event.title}
                    </p>

                    <p className="text-sm text-slate-600">
                      {event.description ?? 'Sem descrição.'}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}

              {!dispatch.events?.length && (
                <p className="text-sm text-slate-500">
                  Nenhum evento registrado.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  tone,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  tone: 'blue' | 'cyan' | 'indigo' | 'amber' | 'green';
}) {
  const toneClass =
    tone === 'cyan'
      ? 'bg-cyan-600 hover:bg-cyan-700'
      : tone === 'indigo'
        ? 'bg-indigo-600 hover:bg-indigo-700'
        : tone === 'amber'
          ? 'bg-amber-500 hover:bg-amber-600'
          : tone === 'green'
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-blue-600 hover:bg-blue-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg py-2 text-sm text-white disabled:opacity-50 ${toneClass}`}
    >
      {disabled ? 'Atualizando...' : label}
    </button>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'amber' | 'blue' | 'green';
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-100 bg-amber-50 text-amber-700'
      : tone === 'green'
        ? 'border-green-100 bg-green-50 text-green-700'
        : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm">{title}</p>
      <h2 className="mt-1 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function dispatchStatusClass(status: string) {
  const base = 'rounded-full px-2 py-1 text-[10px] font-bold';

  if (status === 'OPEN') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  if (status === 'ASSIGNED') {
    return `${base} bg-purple-100 text-purple-700`;
  }

  if (status === 'ACCEPTED') {
    return `${base} bg-blue-100 text-blue-700`;
  }

  if (status === 'ON_ROUTE') {
    return `${base} bg-cyan-100 text-cyan-700`;
  }

  if (status === 'ARRIVED') {
    return `${base} bg-indigo-100 text-indigo-700`;
  }

  if (status === 'SEARCHING') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  if (status === 'RECOVERED' || status === 'RESOLVED') {
    return `${base} bg-green-100 text-green-700`;
  }

  return `${base} bg-red-100 text-red-700`;
}

function priorityClass(priority: string) {
  const base = 'rounded-full px-2 py-1 text-[10px] font-bold';

  if (priority === 'CRITICAL') {
    return `${base} bg-red-100 text-red-700`;
  }

  if (priority === 'HIGH') {
    return `${base} bg-orange-100 text-orange-700`;
  }

  if (priority === 'MEDIUM') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  return `${base} bg-blue-100 text-blue-700`;
}

function translateMotorcycleType(type?: string) {
  if (!type) return '—';
  return type === 'MOTO_TAXI' ? 'Moto táxi' : type === 'PARTICULAR' ? 'Particular' : type;
}

function translateMotorcycleStatus(status?: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativa',
    SUSPENDED: 'Suspensa',
    STOLEN: 'Furtada',
    ROBBED: 'Roubada',
    RECOVERED: 'Recuperada',
    INVESTIGATION: 'Em investigação',
    BLOCKED: 'Bloqueada',
  };
  return status ? labels[status] ?? status : '—';
}

function translateDispatchStatus(status: string) {
  if (status === 'OPEN') return 'ABERTO';
  if (status === 'ASSIGNED') return 'DESIGNADO';
  if (status === 'ACCEPTED') return 'ACEITO';
  if (status === 'ON_ROUTE') return 'EM DESLOCAMENTO';
  if (status === 'ARRIVED') return 'NO LOCAL';
  if (status === 'SEARCHING') return 'EM BUSCA';
  if (status === 'IN_PROGRESS') return 'EM ATENDIMENTO';
  if (status === 'RECOVERED') return 'RECUPERADA';
  if (status === 'RESOLVED') return 'RESOLVIDO';
  if (status === 'CANCELLED') return 'CANCELADO';

  return status;
}

function translatePriority(priority: string) {
  if (priority === 'CRITICAL') return 'CRÍTICA';
  if (priority === 'HIGH') return 'ALTA';
  if (priority === 'MEDIUM') return 'MÉDIA';
  if (priority === 'LOW') return 'BAIXA';

  return priority;
}

function eventIcon(type: string) {
  if (type === 'ON_ROUTE') {
    return <Navigation size={15} />;
  }

  if (type === 'ARRIVED') {
    return <MapPin size={15} />;
  }

  if (type === 'SEARCHING') {
    return <Search size={15} />;
  }

  return <CheckCircle2 size={15} />;
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function getMotorcyclePosition(
  dispatch: Dispatch | null,
): NavigationPosition | null {
  const gpsDevices =
    dispatch?.motorcycle?.gpsDevices ?? [];

  for (const device of gpsDevices) {
    const lastLocation =
      device.locations?.[0];

    if (
      typeof lastLocation?.latitude === 'number' &&
      typeof lastLocation?.longitude === 'number'
    ) {
      return {
        latitude: lastLocation.latitude,
        longitude: lastLocation.longitude,
      };
    }
  }

  return null;
}

function extractGpsLocation(
  value: unknown,
): LastGpsLocation | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result =
        extractGpsLocation(item);

      if (result) {
        return result;
      }
    }

    return null;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const objectValue = value as Record<
    string,
    unknown
  >;

  const latitude = Number(
    objectValue.latitude,
  );

  const longitude = Number(
    objectValue.longitude,
  );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return {
      id:
        typeof objectValue.id === 'string'
          ? objectValue.id
          : undefined,

      latitude,
      longitude,

      speed:
        objectValue.speed !== undefined
          ? Number(objectValue.speed)
          : undefined,

      battery:
        objectValue.battery !== undefined
          ? Number(objectValue.battery)
          : undefined,

      ignitionOn:
        typeof objectValue.ignitionOn ===
        'boolean'
          ? objectValue.ignitionOn
          : undefined,

      recordedAt:
        typeof objectValue.recordedAt ===
        'string'
          ? objectValue.recordedAt
          : undefined,
    };
  }

  const possibleKeys = [
    'data',
    'location',
    'lastLocation',
    'lastGpsLocation',
    'gpsLocation',
    'locations',
    'result',
    'motorcycle',
    'gpsDevice',
    'gpsDevices',
  ];

  for (const key of possibleKeys) {
    const nestedValue =
      objectValue[key];

    const result =
      extractGpsLocation(
        nestedValue,
      );

    if (result) {
      return result;
    }
  }

  return null;
}


function getProximityStatus(
  distanceKm: number | null,
): ProximityStatus | null {
  if (
    distanceKm === null ||
    !Number.isFinite(distanceKm)
  ) {
    return null;
  }

  const distanceMeters =
    distanceKm * 1000;

  if (distanceMeters <= 30) {
    return {
      label: 'Policial chegou ao local',
      description:
        'A posição do policial está praticamente no mesmo ponto da motocicleta.',
      tone: 'green',
    };
  }

  if (distanceMeters <= 200) {
    return {
      label: 'Policial muito próximo da mota',
      description:
        'A motocicleta está a menos de 200 metros. Redobre a atenção durante a aproximação.',
      tone: 'green',
    };
  }

  if (distanceMeters <= 500) {
    return {
      label: 'Policial próximo da mota',
      description:
        'A motocicleta está a menos de 500 metros da posição atual.',
      tone: 'amber',
    };
  }

  if (distanceKm <= 2) {
    return {
      label: 'Policial aproximando-se',
      description:
        'A equipe está a menos de 2 quilômetros da motocicleta.',
      tone: 'orange',
    };
  }

  return {
    label: 'Policial ainda distante da mota',
    description:
      'Continue o deslocamento e acompanhe a atualização da posição no mapa.',
    tone: 'red',
  };
}

function proximityToneClass(
  tone: ProximityStatus['tone'],
) {
  if (tone === 'green') {
    return 'border-green-200 bg-green-50 text-green-800';
  }

  if (tone === 'amber') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (tone === 'orange') {
    return 'border-orange-200 bg-orange-50 text-orange-800';
  }

  return 'border-red-200 bg-red-50 text-red-800';
}


function extractMotorcycleTrack(
  value: unknown,
): NavigationTrackPoint[] {
  const locations: NavigationTrackPoint[] =
    [];

  function visit(
    current: unknown,
  ) {
    if (!current) {
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    if (
      typeof current !== 'object'
    ) {
      return;
    }

    const objectValue =
      current as Record<
        string,
        unknown
      >;

    const latitude = Number(
      objectValue.latitude,
    );

    const longitude = Number(
      objectValue.longitude,
    );

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      locations.push({
        id:
          typeof objectValue.id ===
          'string'
            ? objectValue.id
            : undefined,

        latitude,
        longitude,

        speed:
          objectValue.speed !==
          undefined
            ? Number(
                objectValue.speed,
              )
            : undefined,

        recordedAt:
          typeof objectValue.recordedAt ===
          'string'
            ? objectValue.recordedAt
            : typeof objectValue.createdAt ===
                'string'
              ? objectValue.createdAt
              : undefined,
      });

      return;
    }

    const possibleKeys = [
      'data',
      'locations',
      'gpsDevices',
      'devices',
      'result',
      'items',
    ];

    for (const key of possibleKeys) {
      visit(objectValue[key]);
    }
  }

  visit(value);

  const unique = new Map<
    string,
    NavigationTrackPoint
  >();

  locations.forEach((point) => {
    const key =
      point.id ??
      `${point.latitude}-${point.longitude}-${point.recordedAt ?? ''}`;

    unique.set(key, point);
  });

  return Array.from(
    unique.values(),
  ).sort((a, b) => {
    const dateA = a.recordedAt
      ? new Date(
          a.recordedAt,
        ).getTime()
      : 0;

    const dateB = b.recordedAt
      ? new Date(
          b.recordedAt,
        ).getTime()
      : 0;

    return dateA - dateB;
  });
}