import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RecoveryEvidencePanel } from '../../components/recovery-evidences/RecoveryEvidencePanel';
import { NationalOperationsMap } from '../../components/noc/NationalOperationsMap';
import { FileText } from 'lucide-react';
import {
  CheckCircle,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  ShieldAlert,
  Siren,
  Truck,
  X,
} from 'lucide-react';

import { api } from '../../api/api';
import { socket } from '../../api/socket';
import { useLiveGps } from '../../hooks/useLiveGps';
import { DispatchChat } from '../../components/dispatch-chat/DispatchChat';
import type { LiveMotorcycle } from '../../hooks/useLiveGps';

type OpenAlert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  status?: string;
  createdAt: string;

  motorcycle?: {
    id?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;
    status?: string;
  };
};

type TheftReport = {
  id: string;
  status: string;
  reportType?: string;
  description?: string;
  location?: string;
  createdAt: string;

  motorcycle?: {
    id?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;
    status?: string;

    owner?: {
      fullName?: string;
      phone?: string;
    };
  };
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
  startedAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;
  events?: DispatchEvent[];

  motorcycle?: {
    id?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;

    owner?: {
      fullName?: string;
      phone?: string;
    };
  };

  policeOfficer?: {
    id?: string;
    fullName?: string;
    badgeNumber?: string;

    user?: {
      fullName?: string;
      name?: string;
    };
  };
};

type DispatchEvent = {
  id: string;
  dispatchId: string;
  type: string;
  status?: string;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type PoliceOfficer = {
  id: string;
  fullName?: string;
  badgeNumber?: string;
  stationName?: string;

  user?: {
    id?: string;
    fullName?: string;
    name?: string;
    status?: string;
  };
};

type NearestOfficer = {
  policeOfficerId: string;
  fullName: string;
  badgeNumber?: string;
  stationName?: string;
  phone?: string;
  operationalStatus: string;
  distanceKm: number;
  distanceMeters: number;
  etaMinutes: number;

  location: {
    id?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    recordedAt?: string;
  };

  activeDispatch?: {
    id: string;
    code: string;
    status: string;
  } | null;
};

type NearestOfficersResponse = {
  dispatch: {
    id: string;
    code: string;
    status: string;

    motorcycle?: {
      id: string;
      plateNumber: string;
    } | null;

    targetLocation: {
      latitude: number;
      longitude: number;
      source: string;
    };
  };

  recommendedOfficer: NearestOfficer | null;
  officers: NearestOfficer[];
  total: number;
};

export function NocPage() {
  const [alerts, setAlerts] = useState<OpenAlert[]>([]);
  const [reports, setReports] = useState<TheftReport[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);

  const [policeOfficers, setPoliceOfficers] = useState<PoliceOfficer[]>([]);
  const [assigningDispatch, setAssigningDispatch] = useState<Dispatch | null>(null);
  const [selectedPoliceOfficerId, setSelectedPoliceOfficerId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [nearestOfficers, setNearestOfficers] =
    useState<NearestOfficer[]>([]);

  const [recommendedOfficer, setRecommendedOfficer] =
    useState<NearestOfficer | null>(null);

  const [loadingNearestOfficers, setLoadingNearestOfficers] =
    useState(false);

  const [nearestOfficersError, setNearestOfficersError] =
    useState('');

  const [timelineDispatch, setTimelineDispatch] = useState<Dispatch | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<DispatchEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [selectedMotorcycle, setSelectedMotorcycle] =
    useState<LiveMotorcycle | null>(null);

  const [loading, setLoading] = useState(true);
  const [nocLastUpdate, setNocLastUpdate] = useState('');
  const [creatingDispatchId, setCreatingDispatchId] = useState<string | null>(
    null,
  );
  const [creatingReportAlertId, setCreatingReportAlertId] = useState<
    string | null
  >(null);
  const [updatingDispatchId, setUpdatingDispatchId] = useState<string | null>(
    null,
  );

  const {
    motorcycles: liveMotorcycles,
    loading: liveGpsLoading,
    lastUpdate: liveGpsLastUpdate,
    reload,
  } = useLiveGps();

  async function loadNocData() {
    try {
      const [
        alertsResult,
        reportsResult,
        dispatchesResult,
        policeResult,
      ] = await Promise.allSettled([
        api.get('/alerts/open'),
        api.get('/theft-reports'),
        api.get('/dispatches'),
        api.get('/police-officers'),
      ]);

      if (alertsResult.status === 'fulfilled') {
        setAlerts(alertsResult.value.data.data ?? []);
      } else {
        console.error('Erro ao carregar alertas:', alertsResult.reason);
      }

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value.data.data ?? []);
      } else {
        console.error('Erro ao carregar ocorrências:', reportsResult.reason);
      }

      if (dispatchesResult.status === 'fulfilled') {
        setDispatches(dispatchesResult.value.data.data ?? []);
      } else {
        console.error('Erro ao carregar despachos:', dispatchesResult.reason);
      }

      if (policeResult.status === 'fulfilled') {
        setPoliceOfficers(policeResult.value.data.data ?? []);
      } else {
        setPoliceOfficers([]);
        console.error(
          'Erro ao carregar policiais:',
          policeResult.reason,
        );
      }

      setNocLastUpdate(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNocData();

    function handleRealtimeUpdate() {
      loadNocData();
      reload();
    }

    socket.on('dashboard.updated', handleRealtimeUpdate);
    socket.on('alert.created', handleRealtimeUpdate);
    socket.on('alert.updated', handleRealtimeUpdate);
    socket.on('gps.location.created', handleRealtimeUpdate);

    return () => {
      socket.off('dashboard.updated', handleRealtimeUpdate);
      socket.off('alert.created', handleRealtimeUpdate);
      socket.off('alert.updated', handleRealtimeUpdate);
      socket.off('gps.location.created', handleRealtimeUpdate);
    };
  }, []);

  async function createReportFromAlert(alert: OpenAlert) {
    const plateNumber =
      alert.motorcycle?.plateNumber?.trim();

    if (!plateNumber) {
      window.alert(
        'Este alerta não possui a placa da mota.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Deseja criar uma ocorrência para a mota ${plateNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCreatingReportAlertId(alert.id);

      const motorcyclesResponse =
        await api.get('/motorcycles');

      console.log(
        'Resposta de /motorcycles:',
        motorcyclesResponse.data,
      );

      const motorcycles = extractMotorcyclesArray(
        motorcyclesResponse.data,
      );

      console.log(
        'Lista de motas encontrada:',
        motorcycles,
      );

      const normalizedPlate =
        normalizePlate(plateNumber);

      const motorcycle = motorcycles.find(
        (item) =>
          normalizePlate(
            item.plateNumber ?? '',
          ) === normalizedPlate,
      );

      if (!motorcycle) {
        window.alert(
          `A mota com placa ${plateNumber} não foi encontrada no cadastro.`,
        );
        return;
      }

      if (!motorcycle.id) {
        console.error(
          'Mota encontrada sem ID:',
          motorcycle,
        );

        window.alert(
          `A mota ${plateNumber} foi encontrada, mas o backend não retornou o ID dela.`,
        );
        return;
      }

      const payload = {
        motorcycleId: motorcycle.id,
        type: resolveTheftReportType(alert),

        description:
          alert.message ||
          alert.title ||
          'Ocorrência criada a partir de alerta operacional.',

        locationText:
          'Ocorrência criada pela Central Operacional a partir de alerta.',

        latitude: undefined,
        longitude: undefined,
      };

      console.log(
        'Payload enviado para /theft-reports:',
        payload,
      );

      await api.post(
        '/theft-reports',
        payload,
      );

      await loadNocData();

      window.alert(
        'Ocorrência criada com sucesso. Agora ela pode ser despachada.',
      );
    } catch (error: any) {
        console.error(error);

        const response =
          error.response?.data;

        const message =
          response?.message;

        if (
          typeof message === 'string' &&
          message.includes(
            'já possui uma ocorrência aberta',
          )
        ) {
          window.alert(
            `⚠️ Já existe uma ocorrência operacional aberta para esta mota.

      Não é necessário criar outra ocorrência.

      Localize a ocorrência na coluna "Ocorrências" para despachá-la ou acompanhar sua evolução.`
          );

          return;
        }

        if (Array.isArray(message)) {
          window.alert(message.join('\n'));
          return;
        }

        window.alert(
          message ??
            'Não foi possível criar a ocorrência.',
        );
      } finally {
      setCreatingReportAlertId(null);
    }
  }

  async function createDispatchFromReport(
    report: TheftReport,
  ) {
    const motorcycleId =
      report.motorcycle?.id;

    if (!motorcycleId) {
      window.alert(
        'Esta ocorrência não possui uma mota vinculada.',
      );
      return;
    }

    try {
      setCreatingDispatchId(report.id);

      await api.post('/dispatches', {
        motorcycleId,

        title: `Despacho da ocorrência ${
          report.motorcycle?.plateNumber ??
          ''
        }`,

        description:
          report.description ??
          'Despacho criado a partir de ocorrência.',

        priority:
          report.status === 'OPEN'
            ? 'HIGH'
            : 'MEDIUM',

        notes:
          `Ocorrência ID: ${report.id}`,
      });

      await loadNocData();

      window.alert(
        'Despacho criado com sucesso.',
      );
    } catch (error: any) {
      console.error(
        'Erro ao criar despacho:',
        error,
      );

      const responseMessage =
        error?.response?.data?.message;

      const message = Array.isArray(
        responseMessage,
      )
        ? responseMessage.join(', ')
        : responseMessage;

      window.alert(
        message ||
          'Não foi possível criar o despacho.',
      );
    } finally {
      setCreatingDispatchId(null);
    }
  }

  async function startDispatch(dispatchId: string) {
    try {
      setUpdatingDispatchId(dispatchId);

      await api.patch(`/dispatches/${dispatchId}/start`, {
        notes: 'Atendimento iniciado pela Central Operacional.',
      });

      await loadNocData();
    } finally {
      setUpdatingDispatchId(null);
    }
  }

  async function resolveDispatch(dispatchId: string) {
    const confirmed = window.confirm(
      'Deseja marcar este despacho como resolvido?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingDispatchId(dispatchId);

      await api.patch(`/dispatches/${dispatchId}/resolve`, {
        notes: 'Despacho resolvido pela Central Operacional.',
      });

      await loadNocData();
    } finally {
      setUpdatingDispatchId(null);
    }
  }

  async function cancelDispatch(dispatchId: string) {
    const confirmed = window.confirm(
      'Deseja realmente cancelar este despacho?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingDispatchId(dispatchId);

      await api.patch(`/dispatches/${dispatchId}/cancel`, {
        notes: 'Despacho cancelado pela Central Operacional.',
      });

      await loadNocData();
    } finally {
      setUpdatingDispatchId(null);
    }
  }

  const activeDispatches = dispatches.filter((dispatch) =>
    [
      'OPEN',
      'ASSIGNED',
      'ACCEPTED',
      'ON_ROUTE',
      'ARRIVED',
      'SEARCHING',
      'IN_PROGRESS',
      'RECOVERED',
    ].includes(dispatch.status),
  );

  const completedDispatches = dispatches.filter((dispatch) =>
    ['RESOLVED', 'CANCELLED'].includes(dispatch.status),
  );

  const reportIdsWithDispatch = useMemo(() => {
    const reportIds = new Set<string>();

    dispatches.forEach((dispatch) => {
      const match = dispatch.notes?.match(/Ocorrência ID:\s*([^\s]+)/i);

      if (match?.[1]) {
        reportIds.add(match[1]);
      }
    });

    return reportIds;
  }, [dispatches]);

  const operationalReports = reports.filter(
    (report) =>
      ['OPEN', 'INVESTIGATING'].includes(report.status) &&
      !reportIdsWithDispatch.has(report.id),
  );

  const finalizedReports = reports.filter(
    (report) =>
      ['RECOVERED', 'CLOSED', 'CANCELLED'].includes(report.status) &&
      !reportIdsWithDispatch.has(report.id),
  );

  async function openDispatchTimeline(dispatch: Dispatch) {
    setTimelineDispatch(dispatch);
    setLoadingTimeline(true);

    try {
      const response = await api.get(`/dispatches/${dispatch.id}/timeline`);

      setTimelineEvents(response.data.data ?? []);
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);

      setTimelineEvents(dispatch.events ?? []);
    } finally {
      setLoadingTimeline(false);
    }
  }

  function closeDispatchTimeline() {
    setTimelineDispatch(null);
    setTimelineEvents([]);
  }

  async function loadNearestOfficers(
    dispatchId: string,
  ) {
    try {
      setLoadingNearestOfficers(true);
      setNearestOfficersError('');
      setNearestOfficers([]);
      setRecommendedOfficer(null);

      const response = await api.get(
        `/dispatches/${dispatchId}/nearest-officers`,
      );

      const result: NearestOfficersResponse =
        response.data?.data ??
        response.data;

      setNearestOfficers(
        Array.isArray(result?.officers)
          ? result.officers
          : [],
      );

      setRecommendedOfficer(
        result?.recommendedOfficer ?? null,
      );

      /*
      * Seleciona automaticamente o policial recomendado
      * somente quando ainda não existe policial selecionado.
      */
      if (
        result?.recommendedOfficer?.policeOfficerId
      ) {
        setSelectedPoliceOfficerId(
          (current) =>
            current ||
            result.recommendedOfficer!
              .policeOfficerId,
        );
      }
    } catch (error: any) {
      console.error(
        'Erro ao procurar policiais próximos:',
        error,
      );

      const responseMessage =
        error?.response?.data?.message;

      setNearestOfficersError(
        Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : typeof responseMessage === 'string'
            ? responseMessage
            : 'Não foi possível calcular os policiais mais próximos.',
      );
    } finally {
      setLoadingNearestOfficers(false);
    }
  }

  function openAssignModal(dispatch: Dispatch) {
    setAssigningDispatch(dispatch);

    setSelectedPoliceOfficerId(
      dispatch.policeOfficer?.id ?? '',
    );

    setAssignmentNotes(
      dispatch.notes ?? '',
    );

    setNearestOfficers([]);
    setRecommendedOfficer(null);
    setNearestOfficersError('');

    void loadNearestOfficers(dispatch.id);
  }

  function closeAssignModal() {
    if (savingAssignment) {
      return;
    }

    setAssigningDispatch(null);
    setSelectedPoliceOfficerId('');
    setAssignmentNotes('');
    setNearestOfficers([]);
    setRecommendedOfficer(null);
    setNearestOfficersError('');
  }

  async function assignPoliceOfficer() {
    if (!assigningDispatch) {
      return;
    }

    if (!selectedPoliceOfficerId) {
      alert('Selecione um policial.');
      return;
    }

    try {
      setSavingAssignment(true);

      await api.patch(`/dispatches/${assigningDispatch.id}/assign`, {
        policeOfficerId: selectedPoliceOfficerId,
        notes: assignmentNotes.trim() || undefined,
      });

      await loadNocData();

      setAssigningDispatch(null);
      setSelectedPoliceOfficerId('');
      setAssignmentNotes('');

      alert('Policial designado com sucesso.');
    } catch (error) {
      console.error('Erro ao designar policial:', error);
      alert('Não foi possível designar o policial.');
    } finally {
      setSavingAssignment(false);
    }
  }

  if (loading || liveGpsLoading) {
    return <NocSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Central Nacional de Operações
          </h1>

          <p className="text-slate-500">
            Monitoramento e resposta operacional em tempo real.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Última atualização: {liveGpsLastUpdate || nocLastUpdate || '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadNocData();
            reload();
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <NationalOperationsMap
        motorcycles={liveMotorcycles}
        alerts={alerts}
        dispatches={dispatches}
        selectedMotorcycle={selectedMotorcycle}
        onSelectMotorcycle={setSelectedMotorcycle}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Fluxo operacional
          </h2>

          <p className="text-sm text-slate-500">
            Alertas, ocorrências, despachos em andamento e operações encerradas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <OperationalColumn
            title="Alertas"
            count={alerts.length}
            icon={<Siren size={18} className="text-red-600" />}
            empty="Nenhum alerta aberto."
          >
            {alerts.map((alert) => (
              <AlertOperationalCard
                key={alert.id}
                alert={alert}
                creatingReport={
                  creatingReportAlertId === alert.id
                }
                onCreateReport={createReportFromAlert}
                onSelectMotorcycle={() => {
                  const motorcycle = liveMotorcycles.find(
                    (item) =>
                      item.motorcycleId ===
                        alert.motorcycle?.id ||
                      item.plateNumber ===
                        alert.motorcycle?.plateNumber,
                  );

                  if (motorcycle) {
                    setSelectedMotorcycle(motorcycle);

                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }
                }}
              />
            ))}
          </OperationalColumn>

          <OperationalColumn
            title="Ocorrências"
            count={operationalReports.length}
            icon={<ClipboardList size={18} className="text-amber-600" />}
            empty="Nenhuma ocorrência aguardando despacho."
          >
            {operationalReports.map((report) => (
              <ReportOperationalCard
                key={report.id}
                report={report}
                creatingDispatch={creatingDispatchId === report.id}
                onCreateDispatch={createDispatchFromReport}
              />
            ))}
          </OperationalColumn>

          <OperationalColumn
            title="Despachos ativos"
            count={activeDispatches.length}
            icon={<Truck size={18} className="text-purple-600" />}
            empty="Nenhum despacho ativo."
          >
            {activeDispatches.map((dispatch) => (
              <DispatchOperationalCard
                key={dispatch.id}
                dispatch={dispatch}
                updating={updatingDispatchId === dispatch.id}
                onAssign={openAssignModal}
                onStart={startDispatch}
                onResolve={resolveDispatch}
                onCancel={cancelDispatch}
                onOpenTimeline={openDispatchTimeline}
              />
            ))}
          </OperationalColumn>

          <OperationalColumn
            title="Finalizados"
            count={finalizedReports.length + completedDispatches.length}
            icon={<CheckCircle2 size={18} className="text-green-600" />}
            empty="Nenhuma operação finalizada."
          >
            {completedDispatches.map((dispatch) => (
              <DispatchOperationalCard
                key={dispatch.id}
                dispatch={dispatch}
                updating={false}
                onAssign={openAssignModal}
                onStart={startDispatch}
                onResolve={resolveDispatch}
                onCancel={cancelDispatch}
                onOpenTimeline={openDispatchTimeline}
              />
            ))}

            {finalizedReports.map((report) => (
              <ReportOperationalCard
                key={report.id}
                report={report}
                creatingDispatch={false}
                onCreateDispatch={createDispatchFromReport}
                finalized
              />
            ))}
          </OperationalColumn>
        </div>
      </section>

      {timelineDispatch && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Histórico operacional
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {timelineDispatch.code} —{' '}
                  {timelineDispatch.motorcycle?.plateNumber ?? 'Sem placa'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDispatchTimeline}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 border-b bg-slate-50 p-5 sm:grid-cols-4">
              <TimelineSummary
                label="Status"
                value={translateDispatchStatus(timelineDispatch.status)}
              />

              <TimelineSummary
                label="Prioridade"
                value={translatePriority(timelineDispatch.priority)}
              />

              <TimelineSummary
                label="Policial"
                value={
                  timelineDispatch.policeOfficer?.fullName ??
                  timelineDispatch.policeOfficer?.user?.fullName ??
                  timelineDispatch.policeOfficer?.user?.name ??
                  'Não designado'
                }
              />

              <TimelineSummary
                label="Criado"
                value={formatDate(timelineDispatch.createdAt)}
              />
            </div>

            <div className="max-h-[72vh] overflow-auto p-5">
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 font-bold text-slate-900">
                    Linha do tempo
                  </h3>

                  {loadingTimeline ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      Carregando histórico...
                    </p>
                  ) : (
                    <DispatchTimeline events={timelineEvents} />
                  )}
                </div>

                <div className="border-t pt-5">
                  <RecoveryEvidencePanel
                    dispatchId={timelineDispatch.id}
                  />
                </div>

                <Link
                  to={`/recovery-reports/${timelineDispatch.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <FileText size={17} />
                  Abrir dossiê da recuperação
                </Link>

                <div className="border-t pt-5">
                  <DispatchChat
                    dispatchId={timelineDispatch.id}
                    senderType="CENTRAL"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {assigningDispatch && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Designar policial
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {assigningDispatch.code} —{' '}
                  {assigningDispatch.motorcycle?.plateNumber ?? 'Sem placa'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAssignModal}
                disabled={savingAssignment}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Policial
                </label>

                {loadingNearestOfficers && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-800">
                      Procurando policiais próximos...
                    </p>

                    <p className="mt-1 text-xs text-blue-600">
                      O sistema está analisando as últimas localizações disponíveis.
                    </p>
                  </div>
                )}

                {nearestOfficersError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">
                      Recomendação indisponível
                    </p>

                    <p className="mt-1 text-xs text-amber-700">
                      {nearestOfficersError}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (assigningDispatch) {
                          void loadNearestOfficers(
                            assigningDispatch.id,
                          );
                        }
                      }}
                      className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-200"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!loadingNearestOfficers &&
                  recommendedOfficer && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                            Policial recomendado
                          </p>

                          <p className="mt-1 text-lg font-bold text-green-950">
                            {recommendedOfficer.fullName}
                          </p>

                          <p className="mt-1 text-sm text-green-800">
                            {recommendedOfficer.badgeNumber
                              ? `Matrícula ${recommendedOfficer.badgeNumber}`
                              : 'Matrícula não informada'}
                          </p>

                          <p className="text-sm text-green-800">
                            {recommendedOfficer.stationName ??
                              'Unidade não informada'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPoliceOfficerId(
                              recommendedOfficer.policeOfficerId,
                            );

                            if (!assignmentNotes.trim()) {
                              setAssignmentNotes(
                                `Policial recomendado automaticamente pela Central. Distância aproximada: ${formatOfficerDistance(
                                  recommendedOfficer.distanceKm,
                                )}. ETA estimado: ${formatOfficerEta(
                                  recommendedOfficer.etaMinutes,
                                )}.`,
                              );
                            }
                          }}
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Selecionar recomendado
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <RecommendationInfo
                          label="Distância"
                          value={formatOfficerDistance(
                            recommendedOfficer.distanceKm,
                          )}
                        />

                        <RecommendationInfo
                          label="ETA"
                          value={formatOfficerEta(
                            recommendedOfficer.etaMinutes,
                          )}
                        />

                        <RecommendationInfo
                          label="Situação"
                          value={translateOfficerOperationalStatus(
                            recommendedOfficer.operationalStatus,
                          )}
                        />
                      </div>
                    </div>
                  )}

                {!loadingNearestOfficers &&
                  !nearestOfficersError &&
                  !recommendedOfficer && (
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Nenhum policial disponível com localização ativa.
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Você ainda pode selecionar manualmente um policial cadastrado.
                      </p>
                    </div>
                  )}

                <select
                  value={selectedPoliceOfficerId}
                  onChange={(event) =>
                    setSelectedPoliceOfficerId(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">Selecione um policial</option>

                  {nearestOfficers.length > 0 ? (
                    nearestOfficers.map((officer) => (
                      <option
                        key={officer.policeOfficerId}
                        value={officer.policeOfficerId}
                      >
                        {officer.fullName}

                        {officer.badgeNumber
                          ? ` — Matrícula ${officer.badgeNumber}`
                          : ''}

                        {` — ${formatOfficerDistance(
                          officer.distanceKm,
                        )}`}

                        {` — ETA ${formatOfficerEta(
                          officer.etaMinutes,
                        )}`}
                      </option>
                    ))
                  ) : (
                    policeOfficers.map((officer) => (
                      <option
                        key={officer.id}
                        value={officer.id}
                      >
                        {officer.fullName ??
                          officer.user?.fullName ??
                          officer.user?.name ??
                          'Policial sem nome'}

                        {officer.badgeNumber
                          ? ` — Matrícula ${officer.badgeNumber}`
                          : ''}

                        {officer.stationName
                          ? ` — ${officer.stationName}`
                          : ''}
                      </option>
                    ))
                  )}
                </select>

                {!policeOfficers.length && (
                  <p className="mt-2 text-xs text-amber-600">
                    Nenhum policial cadastrado foi encontrado.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ModalInfo
                  label="Mota"
                  value={
                    assigningDispatch.motorcycle?.plateNumber ?? '—'
                  }
                />

                <ModalInfo
                  label="Prioridade"
                  value={translatePriority(assigningDispatch.priority)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Orientações para o policial
                </label>

                <textarea
                  value={assignmentNotes}
                  onChange={(event) =>
                    setAssignmentNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="Informe as orientações para esta missão..."
                  className="mt-1 w-full resize-none rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={closeAssignModal}
                disabled={savingAssignment}
                className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={assignPoliceOfficer}
                disabled={
                  savingAssignment || !selectedPoliceOfficerId
                }
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAssignment
                  ? 'Designando...'
                  : 'Confirmar designação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OperationalColumn({
  title,
  count,
  icon,
  empty,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          {icon}

          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
          {count}
        </span>
      </div>

      <div className="max-h-[650px] min-h-[420px] space-y-3 overflow-auto p-3">
        {count > 0 ? (
          children
        ) : (
          <p className="p-3 text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function AlertOperationalCard({
  alert,
  creatingReport,
  onCreateReport,
  onSelectMotorcycle,
}: {
  alert: OpenAlert;
  creatingReport: boolean;
  onCreateReport: (alert: OpenAlert) => void;
  onSelectMotorcycle: () => void;
}) {
  const motorcycleId =
    alert.motorcycle?.id;

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={severityClass(
            alert.severity,
          )}
        >
          {translateSeverity(
            alert.severity,
          )}
        </span>

        <span className="text-[11px] text-slate-500">
          {formatDate(alert.createdAt)}
        </span>
      </div>

      <h4 className="mt-2 font-bold text-slate-900">
        {alert.title}
      </h4>

      <p className="mt-1 text-sm text-slate-600">
        {alert.message}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Placa:{' '}
        {alert.motorcycle
          ?.plateNumber ?? '—'}
      </p>

      <button
        type="button"
        onClick={() =>
          onCreateReport(alert)
        }
        disabled={
          creatingReport ||
          !motorcycleId
        }
        className="mt-3 w-full rounded-lg bg-amber-600 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creatingReport
          ? 'Criando ocorrência...'
          : 'Criar ocorrência'}
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={
            onSelectMotorcycle
          }
          className="rounded-lg bg-red-600 py-2 text-xs text-white hover:bg-red-700"
        >
          Ver no mapa
        </button>

        {motorcycleId ? (
          <Link
            to={`/motorcycles/${motorcycleId}/360`}
            className="rounded-lg bg-purple-100 py-2 text-center text-xs text-purple-700 hover:bg-purple-200"
          >
            Visão 360°
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-lg bg-slate-100 py-2 text-xs text-slate-400"
          >
            Visão 360°
          </button>
        )}
      </div>
    </div>
  );
}

function ReportOperationalCard({
  report,
  creatingDispatch,
  onCreateDispatch,
  finalized = false,
}: {
  report: TheftReport;
  creatingDispatch: boolean;
  onCreateDispatch: (report: TheftReport) => void;
  finalized?: boolean;
}) {
  const motorcycleId = report.motorcycle?.id;

  return (
    <div
      className={`rounded-lg border p-3 ${
        finalized ? 'bg-green-50' : 'bg-amber-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={reportStatusClass(report.status)}>
          {translateReportStatus(report.status)}
        </span>

        <span className="text-[11px] text-slate-500">
          {formatDate(report.createdAt)}
        </span>
      </div>

      <h4 className="mt-2 font-bold text-slate-900">
        {report.motorcycle?.plateNumber ?? 'Sem placa'}
      </h4>

      <p className="text-sm text-slate-600">
        {report.motorcycle?.brand ?? ''}{' '}
        {report.motorcycle?.model ?? ''}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {report.description ?? 'Sem descrição.'}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Local: {report.location ?? '—'}
      </p>

      {motorcycleId && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to={`/motorcycles/${motorcycleId}/360`}
            className="rounded-lg bg-purple-100 py-2 text-center text-xs text-purple-700 hover:bg-purple-200"
          >
            Visão 360°
          </Link>

          <Link
            to={`/playback?motorcycleId=${motorcycleId}`}
            className="rounded-lg bg-blue-50 py-2 text-center text-xs text-blue-700 hover:bg-blue-100"
          >
            Playback
          </Link>
        </div>
      )}

      {!finalized && (
        <button
          type="button"
          onClick={() => onCreateDispatch(report)}
          disabled={creatingDispatch || !motorcycleId}
          className="mt-2 w-full rounded-lg bg-green-600 py-2 text-xs text-white hover:bg-green-700 disabled:opacity-50"
        >
          {creatingDispatch ? 'Criando despacho...' : 'Criar despacho'}
        </button>
      )}
    </div>
  );
}

function DispatchOperationalCard({
  dispatch,
  updating,
  onAssign,
  onStart,
  onResolve,
  onCancel,
  onOpenTimeline,
}: {
  dispatch: Dispatch;
  updating: boolean;
  onAssign: (dispatch: Dispatch) => void;
  onStart: (dispatchId: string) => void;
  onResolve: (dispatchId: string) => void;
  onCancel: (dispatchId: string) => void;
  onOpenTimeline: (dispatch: Dispatch) => void;
}) {
  const motorcycleId = dispatch.motorcycle?.id;
  const isFinalized = ['RESOLVED', 'CANCELLED'].includes(dispatch.status);

  const officerName =
    dispatch.policeOfficer?.fullName ??
    dispatch.policeOfficer?.user?.fullName ??
    dispatch.policeOfficer?.user?.name ??
    'Não designado';

  return (
    <div
      className={`rounded-lg border p-3 ${
        isFinalized ? 'bg-green-50' : 'bg-purple-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={dispatchStatusClass(dispatch.status)}>
          {translateDispatchStatus(dispatch.status)}
        </span>

        <span className={priorityClass(dispatch.priority)}>
          {translatePriority(dispatch.priority)}
        </span>
      </div>

      <p className="mt-2 text-xs font-bold text-purple-700">
        {dispatch.code}
      </p>

      <h4 className="mt-1 font-bold text-slate-900">{dispatch.title}</h4>

      <p className="mt-1 text-sm text-slate-600">
        {dispatch.description ?? 'Sem descrição.'}
      </p>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>Placa: {dispatch.motorcycle?.plateNumber ?? '—'}</p>
        <p>Policial: {officerName}</p>
        <p>Criado: {formatDate(dispatch.createdAt)}</p>
      </div>

      {motorcycleId && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to={`/motorcycles/${motorcycleId}/360`}
            className="rounded-lg bg-purple-100 py-2 text-center text-xs text-purple-700 hover:bg-purple-200"
          >
            Visão 360°
          </Link>

          <Link
            to={`/playback?motorcycleId=${motorcycleId}`}
            className="rounded-lg bg-blue-50 py-2 text-center text-xs text-blue-700 hover:bg-blue-100"
          >
            Playback
          </Link>
        </div>
      )}

      {!isFinalized && (
        <button
          type="button"
          onClick={() => onAssign(dispatch)}
          className="mt-3 w-full rounded-lg bg-purple-600 py-2 text-xs font-medium text-white hover:bg-purple-700"
        >
          {dispatch.policeOfficer
            ? 'Alterar policial'
            : 'Designar policial'}
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenTimeline(dispatch)}
        className="mt-2 w-full rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
      >
        Ver histórico operacional
      </button>

      {!isFinalized && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {['OPEN', 'ASSIGNED'].includes(dispatch.status) && (
            <button
              type="button"
              onClick={() => onStart(dispatch.id)}
              disabled={updating}
              className="rounded-lg bg-blue-600 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updating ? 'Atualizando...' : 'Iniciar'}
            </button>
          )}

          {dispatch.status === 'IN_PROGRESS' && (
            <button
              type="button"
              onClick={() => onResolve(dispatch.id)}
              disabled={updating}
              className="rounded-lg bg-green-600 py-2 text-xs text-white hover:bg-green-700 disabled:opacity-50"
            >
              {updating ? 'Atualizando...' : 'Resolver'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onCancel(dispatch.id)}
            disabled={updating}
            className="rounded-lg bg-red-50 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function DispatchTimeline({
  events,
}: {
  events: DispatchEvent[];
}) {
  if (!events.length) {
    return (
      <div className="py-10 text-center">
        <CircleDot className="mx-auto text-slate-300" size={38} />

        <p className="mt-3 text-sm text-slate-500">
          Nenhum evento foi registrado neste despacho.
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Despachos antigos podem não possuir timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-3 left-[19px] top-3 w-px bg-slate-200" />

      <div className="space-y-6">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="relative flex items-start gap-4"
          >
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white ${eventTone(
                event.type,
              )}`}
            >
              {eventIcon(event.type)}
            </div>

            <div className="min-w-0 flex-1 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    {event.title}
                  </h3>

                  {event.status && (
                    <span className={dispatchStatusClass(event.status)}>
                      {translateDispatchStatus(event.status)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  {formatDate(event.createdAt)}
                </p>
              </div>

              {event.description && (
                <p className="mt-3 text-sm text-slate-600">
                  {event.description}
                </p>
              )}

              {typeof event.latitude === 'number' &&
                typeof event.longitude === 'number' && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="flex items-center gap-1 font-semibold">
                      <MapPin size={14} />
                      Localização registrada
                    </p>

                    <p className="mt-1">
                      {event.latitude}, {event.longitude}
                    </p>

                    <a
                      href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-blue-600 hover:underline"
                    >
                      Abrir no mapa
                    </a>
                  </div>
                )}

              <p className="mt-3 text-[11px] text-slate-400">
                Evento {index + 1} de {events.length}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSummary({
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

function eventTone(type: string) {
  if (type === 'CREATED') {
    return 'bg-slate-100 text-slate-700';
  }

  if (type === 'ASSIGNED') {
    return 'bg-purple-100 text-purple-700';
  }

  if (type === 'ACCEPTED') {
    return 'bg-blue-100 text-blue-700';
  }

  if (type === 'ON_ROUTE') {
    return 'bg-cyan-100 text-cyan-700';
  }

  if (type === 'ARRIVED') {
    return 'bg-indigo-100 text-indigo-700';
  }

  if (type === 'SEARCHING') {
    return 'bg-amber-100 text-amber-700';
  }

  if (type === 'RECOVERED' || type === 'RESOLVED') {
    return 'bg-green-100 text-green-700';
  }

  if (type === 'CANCELLED') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-slate-100 text-slate-700';
}

function eventIcon(type: string) {
  if (type === 'CREATED') {
    return <ClipboardList size={17} />;
  }

  if (type === 'ASSIGNED') {
    return <ShieldAlert size={17} />;
  }

  if (type === 'ACCEPTED') {
    return <CheckCircle size={17} />;
  }

  if (type === 'ON_ROUTE') {
    return <Navigation size={17} />;
  }

  if (type === 'ARRIVED') {
    return <MapPin size={17} />;
  }

  if (type === 'SEARCHING') {
    return <Search size={17} />;
  }

  if (type === 'RECOVERED' || type === 'RESOLVED') {
    return <CheckCircle2 size={17} />;
  }

  if (type === 'CANCELLED') {
    return <X size={17} />;
  }

  return <CircleDot size={17} />;
}

function ModalInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function severityClass(severity: string) {
  const base = 'rounded-full px-2 py-1 text-[11px] font-medium';

  if (severity === 'CRITICAL') {
    return `${base} bg-red-100 text-red-700`;
  }

  if (severity === 'HIGH') {
    return `${base} bg-orange-100 text-orange-700`;
  }

  if (severity === 'MEDIUM') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  return `${base} bg-blue-100 text-blue-700`;
}

function reportStatusClass(status: string) {
  const base = 'rounded-full px-2 py-1 text-[10px] font-bold';

  if (status === 'OPEN') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  if (status === 'INVESTIGATING') {
    return `${base} bg-blue-100 text-blue-700`;
  }

  if (status === 'RECOVERED') {
    return `${base} bg-green-100 text-green-700`;
  }

  return `${base} bg-slate-100 text-slate-700`;
}

function dispatchStatusClass(status: string) {
  const base = 'rounded-full px-2 py-1 text-[10px] font-bold';

  if (status === 'OPEN') {
    return `${base} bg-amber-100 text-amber-700`;
  }

  if (status === 'ASSIGNED') {
    return `${base} bg-purple-100 text-purple-700`;
  }

  if (status === 'IN_PROGRESS') {
    return `${base} bg-blue-100 text-blue-700`;
  }

  if (status === 'RESOLVED') {
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

function translateSeverity(severity: string) {
  if (severity === 'CRITICAL') return 'Crítico';
  if (severity === 'HIGH') return 'Alto';
  if (severity === 'MEDIUM') return 'Médio';
  if (severity === 'LOW') return 'Baixo';

  return severity;
}

function translateReportStatus(status: string) {
  if (status === 'OPEN') return 'ABERTA';
  if (status === 'INVESTIGATING') return 'EM INVESTIGAÇÃO';
  if (status === 'RECOVERED') return 'RECUPERADA';
  if (status === 'CLOSED') return 'ENCERRADA';
  if (status === 'CANCELLED') return 'CANCELADA';

  return status;
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

function resolveTheftReportType(
  alert: OpenAlert,
): 'FURTO' | 'ROUBO' | 'DESAPARECIDA' {
  const content = [
    alert.type,
    alert.title,
    alert.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  if (
    content.includes('ROUBO') ||
    content.includes('ROBBED') ||
    content.includes('ASSALTO')
  ) {
    return 'ROUBO';
  }

  if (
    content.includes('FURTO') ||
    content.includes('STOLEN')
  ) {
    return 'FURTO';
  }

  return 'DESAPARECIDA';
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function NocSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="h-8 w-80 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 rounded bg-slate-200" />
      </div>

      <div className="grid min-h-[700px] grid-cols-1 gap-4 xl:grid-cols-[340px_1fr_340px]">
        <div className="rounded-xl border bg-white p-4" />
        <div className="rounded-xl border bg-white p-4" />
        <div className="rounded-xl border bg-white p-4" />
      </div>
    </div>
  );
}

type MotorcycleLookupItem = {
  id?: string;
  plateNumber?: string;
  brand?: string;
  model?: string;
};

function extractMotorcyclesArray(
  value: unknown,
): MotorcycleLookupItem[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    !value ||
    typeof value !== 'object'
  ) {
    return [];
  }

  const objectValue = value as Record<
    string,
    unknown
  >;

  const possibleKeys = [
    'data',
    'items',
    'motorcycles',
    'results',
    'records',
  ];

  for (const key of possibleKeys) {
    const nestedValue =
      objectValue[key];

    const result =
      extractMotorcyclesArray(
        nestedValue,
      );

    if (result.length > 0) {
      return result;
    }
  }

  return [];
}

function normalizePlate(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function RecommendationInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/70 p-3">
      <p className="text-[11px] text-green-700">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-green-950">
        {value}
      </p>
    </div>
  );
}

function formatOfficerDistance(
  distanceKm: number,
) {
  if (!Number.isFinite(distanceKm)) {
    return '—';
  }

  if (distanceKm < 1) {
    return `${Math.round(
      distanceKm * 1000,
    )} m`;
  }

  return `${distanceKm.toFixed(2)} km`;
}

function formatOfficerEta(
  minutes: number,
) {
  if (!Number.isFinite(minutes)) {
    return '—';
  }

  if (minutes <= 0) {
    return 'No local';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function translateOfficerOperationalStatus(
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

  return status;
}
