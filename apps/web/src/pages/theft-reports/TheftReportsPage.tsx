import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCcw,
  ShieldAlert,
  Truck,
} from 'lucide-react';

import { api } from '../../api/api';
import { socket } from '../../api/socket';

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

type Alert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  createdAt: string;
  motorcycle?: {
    id?: string;
    plateNumber?: string;
    brand?: string;
    model?: string;
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
    badgeNumber?: string;
    user?: {
      fullName?: string;
      name?: string;
    };
  };
};

type PoliceOfficer = {
  id: string;
  badgeNumber?: string;
  rank?: string;
  unit?: string;
  user?: {
    id?: string;
    fullName?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
};

export function TheftReportsPage() {
  const [reports, setReports] = useState<TheftReport[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDispatchId, setCreatingDispatchId] = useState<string | null>(
    null,
  );
  const [policeOfficers, setPoliceOfficers] = useState<PoliceOfficer[]>([]);
  const [assigningDispatch, setAssigningDispatch] = useState<Dispatch | null>(null);
  const [selectedPoliceOfficerId, setSelectedPoliceOfficerId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [
        reportsResult,
        alertsResult,
        dispatchesResult,
        policeResult,
      ] = await Promise.allSettled([
        api.get('/theft-reports'),
        api.get('/alerts/open'),
        api.get('/dispatches'),
        api.get('/police-officers'),
      ]);

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value.data.data ?? []);
      } else {
        console.error(
          'Erro ao carregar ocorrências:',
          reportsResult.reason,
        );
      }

      if (alertsResult.status === 'fulfilled') {
        setAlerts(alertsResult.value.data.data ?? []);
      } else {
        console.error(
          'Erro ao carregar alertas:',
          alertsResult.reason,
        );
      }

      if (dispatchesResult.status === 'fulfilled') {
        setDispatches(dispatchesResult.value.data.data ?? []);
      } else {
        console.error(
          'Erro ao carregar despachos:',
          dispatchesResult.reason,
        );
      }

      if (policeResult.status === 'fulfilled') {
        setPoliceOfficers(policeResult.value.data.data ?? []);
      } else {
        setPoliceOfficers([]);
        console.error('Erro ao carregar policiais:', policeResult.reason);
      }

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    function reload() {
      loadData();
    }

    socket.on('alert.created', reload);
    socket.on('alert.updated', reload);
    socket.on('dashboard.updated', reload);

    return () => {
      socket.off('alert.created', reload);
      socket.off('alert.updated', reload);
      socket.off('dashboard.updated', reload);
    };
  }, []);

  async function createDispatchFromReport(report: TheftReport) {
    if (!report.motorcycle?.id) {
      alert('Esta ocorrência não possui uma mota vinculada.');
      return;
    }

    try {
      setCreatingDispatchId(report.id);

      await api.post('/dispatches', {
        motorcycleId: report.motorcycle.id,
        title: `Despacho da ocorrência ${
          report.motorcycle.plateNumber ?? ''
        }`,
        description:
          report.description ?? 'Despacho criado a partir de ocorrência.',
        priority: report.status === 'OPEN' ? 'HIGH' : 'MEDIUM',
        notes: `Ocorrência ID: ${report.id}`,
      });

      await loadData();
      alert('Despacho criado com sucesso.');
    } finally {
      setCreatingDispatchId(null);
    }
  }

  async function startDispatch(dispatchId: string) {
    await api.patch(`/dispatches/${dispatchId}/start`, {
      notes: 'Atendimento iniciado pela Central Operacional.',
    });

    await loadData();
  }

  async function resolveDispatch(dispatchId: string) {
    const confirmed = window.confirm(
      'Deseja marcar este despacho como resolvido?',
    );

    if (!confirmed) {
      return;
    }

    await api.patch(`/dispatches/${dispatchId}/resolve`, {
      notes: 'Despacho resolvido pela Central Operacional.',
    });

    await loadData();
  }

  async function cancelDispatch(dispatchId: string) {
    const confirmed = window.confirm(
      'Deseja realmente cancelar este despacho?',
    );

    if (!confirmed) {
      return;
    }

    await api.patch(`/dispatches/${dispatchId}/cancel`, {
      notes: 'Despacho cancelado pela Central Operacional.',
    });

    await loadData();
  }

  function openAssignModal(dispatch: Dispatch) {
    setAssigningDispatch(dispatch);
    setSelectedPoliceOfficerId(dispatch.policeOfficer?.id ?? '');
    setAssignmentNotes(dispatch.notes ?? '');
  }

  function closeAssignModal() {
    if (savingAssignment) {
      return;
    }

    setAssigningDispatch(null);
    setSelectedPoliceOfficerId('');
    setAssignmentNotes('');
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
        notes: assignmentNotes || undefined,
      });

      await loadData();
      closeAssignModal();
      alert('Policial designado com sucesso.');
    } finally {
      setSavingAssignment(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Carregando ocorrências...</p>;
  }

  const openReports = reports.filter((item) => item.status === 'OPEN');

  const investigatingReports = reports.filter(
    (item) => item.status === 'INVESTIGATING',
  );

  const recoveredReports = reports.filter(
    (item) => item.status === 'RECOVERED',
  );

  const closedReports = reports.filter(
    (item) => item.status === 'CLOSED' || item.status === 'CANCELLED',
  );

  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === 'CRITICAL',
  );

  const activeDispatches = dispatches.filter(
    (dispatch) =>
      dispatch.status === 'OPEN' ||
      dispatch.status === 'ASSIGNED' ||
      dispatch.status === 'IN_PROGRESS',
  );

  const completedDispatches = dispatches.filter(
    (dispatch) =>
      dispatch.status === 'RESOLVED' || dispatch.status === 'CANCELLED',
  );

  return (
  <>
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Ocorrências
          </h1>

          <p className="text-slate-500">
            Painel operacional para acompanhar alertas, roubos, furtos e
            despachos.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Metric
          title="Alertas críticos"
          value={criticalAlerts.length}
          tone="red"
        />

        <Metric
          title="Abertas"
          value={openReports.length}
          tone="amber"
        />

        <Metric
          title="Em investigação"
          value={investigatingReports.length}
          tone="blue"
        />

        <Metric
          title="Despachos ativos"
          value={activeDispatches.length}
          tone="purple"
        />

        <Metric
          title="Recuperadas"
          value={recoveredReports.length}
          tone="green"
        />

        <Metric
          title="Encerradas"
          value={closedReports.length + completedDispatches.length}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Column
          title="Novos alertas"
          icon={<ShieldAlert size={18} className="text-red-600" />}
          empty="Nenhum alerta crítico aberto."
        >
          {criticalAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </Column>

        <Column
          title="Ocorrências abertas"
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          empty="Nenhuma ocorrência aberta."
        >
          {openReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDispatch={createDispatchFromReport}
              creatingDispatch={creatingDispatchId === report.id}
            />
          ))}
        </Column>

        <Column
          title="Em investigação"
          icon={<Clock size={18} className="text-blue-600" />}
          empty="Nenhuma ocorrência em investigação."
        >
          {investigatingReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDispatch={createDispatchFromReport}
              creatingDispatch={creatingDispatchId === report.id}
            />
          ))}
        </Column>

        <Column
          title="Despachos ativos"
          icon={<Truck size={18} className="text-purple-600" />}
          empty="Nenhum despacho ativo."
        >
          {activeDispatches.map((dispatch) => (
            <DispatchCard
              key={dispatch.id}
              dispatch={dispatch}
              onAssign={openAssignModal}
              onStart={startDispatch}
              onResolve={resolveDispatch}
              onCancel={cancelDispatch}
            />
          ))}
        </Column>

        <Column
          title="Finalizadas"
          icon={<CheckCircle size={18} className="text-green-600" />}
          empty="Nenhuma ocorrência finalizada."
        >
          {[...recoveredReports, ...closedReports].map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDispatch={createDispatchFromReport}
              creatingDispatch={creatingDispatchId === report.id}
            />
          ))}

          {completedDispatches.map((dispatch) => (
            <DispatchCard
              key={dispatch.id}
              dispatch={dispatch}
              onAssign={openAssignModal}
              onStart={startDispatch}
              onResolve={resolveDispatch}
              onCancel={cancelDispatch}
            />
          ))}
        </Column>
      </div>
    </div>

    {assigningDispatch && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
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

              <select
                value={selectedPoliceOfficerId}
                onChange={(event) =>
                  setSelectedPoliceOfficerId(event.target.value)
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Selecione um policial</option>

                {policeOfficers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.user?.fullName ??
                      officer.user?.name ??
                      'Policial sem nome'}

                    {officer.badgeNumber
                      ? ` — Matrícula ${officer.badgeNumber}`
                      : ''}

                    {officer.unit ? ` — ${officer.unit}` : ''}
                  </option>
                ))}
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
                Observações para a patrulha
              </label>

              <textarea
                value={assignmentNotes}
                onChange={(event) =>
                  setAssignmentNotes(event.target.value)
                }
                rows={4}
                placeholder="Exemplo: verificar a última localização GPS e entrar em contato com a central."
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
  </>
);
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'red' | 'amber' | 'blue' | 'purple' | 'green' | 'slate';
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-red-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-700'
          : tone === 'purple'
            ? 'bg-purple-50 text-purple-700'
            : tone === 'green'
              ? 'bg-green-50 text-green-700'
              : 'bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm">{title}</p>
      <h2 className="text-3xl font-bold mt-1">{value}</h2>
    </div>
  );
}

function Column({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  children: ReactNode;
}) {
  const childrenArray = Array.isArray(children) ? children : [children];

  const hasItems = childrenArray.some(
    (child) => child !== null && child !== undefined && child !== false,
  );

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b flex items-center gap-2">
        {icon}
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>

      <div className="p-3 space-y-3 min-h-[520px] max-h-[680px] overflow-auto">
        {hasItems ? (
          children
        ) : (
          <p className="text-sm text-slate-500 p-3">{empty}</p>
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const motorcycleId = alert.motorcycle?.id;

  return (
    <div className="border rounded-lg p-3 bg-red-50">
      <div className="flex items-center justify-between gap-2">
        <span className={priorityClass(alert.severity)}>
          {translatePriority(alert.severity)}
        </span>

        <span className="text-[11px] text-slate-500">
          {formatDate(alert.createdAt)}
        </span>
      </div>

      <h3 className="font-bold text-slate-900 mt-2">{alert.title}</h3>

      <p className="text-sm text-slate-600 mt-1">{alert.message}</p>

      <p className="text-xs text-slate-500 mt-2">
        Placa: {alert.motorcycle?.plateNumber ?? '—'}
      </p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button className="bg-red-600 text-white rounded-lg py-2 text-xs hover:bg-red-700">
          Criar ocorrência
        </button>

        {motorcycleId ? (
          <Link
            to={`/motorcycles/${motorcycleId}/360`}
            className="bg-purple-100 text-purple-700 rounded-lg py-2 text-xs text-center hover:bg-purple-200"
          >
            Visão 360°
          </Link>
        ) : (
          <button
            disabled
            className="bg-slate-100 text-slate-400 rounded-lg py-2 text-xs"
          >
            Visão 360°
          </button>
        )}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onDispatch,
  creatingDispatch,
}: {
  report: TheftReport;
  onDispatch: (report: TheftReport) => void;
  creatingDispatch: boolean;
}) {
  const motorcycleId = report.motorcycle?.id;

  return (
    <div className="border rounded-lg p-3 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-2">
        <span className={reportStatusClass(report.status)}>
          {translateReportStatus(report.status)}
        </span>

        <span className="text-[11px] text-slate-500">
          {formatDate(report.createdAt)}
        </span>
      </div>

      <h3 className="font-bold text-slate-900 mt-2">
        {report.motorcycle?.plateNumber ?? 'Sem placa'}
      </h3>

      <p className="text-sm text-slate-600">
        {report.motorcycle?.brand} {report.motorcycle?.model}
      </p>

      <p className="text-sm text-slate-500 mt-2">
        {report.description ?? 'Sem descrição.'}
      </p>

      <p className="text-xs text-slate-500 mt-2">
        Local: {report.location ?? '—'}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {motorcycleId ? (
          <>
            <Link
              to={`/playback?motorcycleId=${motorcycleId}`}
              className="bg-blue-50 text-blue-700 rounded-lg py-2 text-xs hover:bg-blue-100 text-center"
            >
              Playback
            </Link>

            <Link
              to={`/motorcycles/${motorcycleId}/360`}
              className="bg-purple-50 text-purple-700 rounded-lg py-2 text-xs hover:bg-purple-100 text-center"
            >
              360°
            </Link>
          </>
        ) : (
          <>
            <button
              disabled
              className="bg-slate-100 text-slate-400 rounded-lg py-2 text-xs"
            >
              Playback
            </button>

            <button
              disabled
              className="bg-slate-100 text-slate-400 rounded-lg py-2 text-xs"
            >
              360°
            </button>
          </>
        )}

        <button
          onClick={() => onDispatch(report)}
          disabled={creatingDispatch || !motorcycleId}
          className="bg-green-50 text-green-700 rounded-lg py-2 text-xs hover:bg-green-100 disabled:opacity-50"
        >
          {creatingDispatch ? 'Criando...' : 'Despachar'}
        </button>
      </div>
    </div>
  );
}

function DispatchCard({
  dispatch,
  onAssign,
  onStart,
  onResolve,
  onCancel,
}: {
  dispatch: Dispatch;
  onAssign: (dispatch: Dispatch) => void;
  onStart: (dispatchId: string) => void;
  onResolve: (dispatchId: string) => void;
  onCancel: (dispatchId: string) => void;
}) {
  const motorcycleId = dispatch.motorcycle?.id;

  return (
    <div className="border rounded-lg p-3 bg-purple-50">
      <div className="flex items-center justify-between gap-2">
        <span className={dispatchStatusClass(dispatch.status)}>
          {translateDispatchStatus(dispatch.status)}
        </span>

        <span className={priorityClass(dispatch.priority)}>
          {translatePriority(dispatch.priority)}
        </span>
      </div>

      <p className="text-xs font-semibold text-purple-700 mt-2">
        {dispatch.code}
      </p>

      <h3 className="font-bold text-slate-900 mt-1">{dispatch.title}</h3>

      <p className="text-sm text-slate-600 mt-1">
        {dispatch.description ?? 'Sem descrição.'}
      </p>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>
          Placa: {dispatch.motorcycle?.plateNumber ?? '—'}
        </p>

        <p>
          Mota: {dispatch.motorcycle?.brand ?? ''}{' '}
          {dispatch.motorcycle?.model ?? ''}
        </p>

        <p>
          Proprietário:{' '}
          {dispatch.motorcycle?.owner?.fullName ?? '—'}
        </p>

        <p>
          Policial:{' '}
          {dispatch.policeOfficer?.user?.fullName ??
            dispatch.policeOfficer?.user?.name ??
            'Não designado'}
        </p>

        <p>Criado: {formatDate(dispatch.createdAt)}</p>
      </div>

      {motorcycleId && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link
            to={`/motorcycles/${motorcycleId}/360`}
            className="bg-purple-100 text-purple-700 rounded-lg py-2 text-xs text-center hover:bg-purple-200"
          >
            Visão 360°
          </Link>

          <Link
            to={`/playback?motorcycleId=${motorcycleId}`}
            className="bg-blue-50 text-blue-700 rounded-lg py-2 text-xs text-center hover:bg-blue-100"
          >
            Playback
          </Link>
        </div>
      )}

      {dispatch.status !== 'RESOLVED' &&
        dispatch.status !== 'CANCELLED' && (
          <button
            onClick={() => onAssign(dispatch)}
            className="w-full mt-3 bg-purple-600 text-white rounded-lg py-2 text-xs hover:bg-purple-700"
          >
            {dispatch.policeOfficer
              ? 'Alterar policial'
              : 'Designar policial'}
          </button>
        )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        {(dispatch.status === 'OPEN' ||
          dispatch.status === 'ASSIGNED') && (
          <button
            onClick={() => onStart(dispatch.id)}
            className="bg-blue-600 text-white rounded-lg py-2 text-xs hover:bg-blue-700"
          >
            Iniciar atendimento
          </button>
        )}

        {dispatch.status === 'IN_PROGRESS' && (
          <button
            onClick={() => onResolve(dispatch.id)}
            className="bg-green-600 text-white rounded-lg py-2 text-xs hover:bg-green-700"
          >
            Resolver
          </button>
        )}

        {dispatch.status !== 'RESOLVED' &&
          dispatch.status !== 'CANCELLED' && (
            <button
              onClick={() => onCancel(dispatch.id)}
              className="bg-red-50 text-red-700 rounded-lg py-2 text-xs hover:bg-red-100"
            >
              Cancelar
            </button>
          )}
      </div>
    </div>
  );
}

function priorityClass(priority: string) {
  const base = 'px-2 py-1 rounded-full text-[10px] font-bold';

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

function reportStatusClass(status: string) {
  const base = 'px-2 py-1 rounded-full text-[10px] font-bold';

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
  const base = 'px-2 py-1 rounded-full text-[10px] font-bold';

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

function ModalInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border rounded-lg p-3 bg-slate-50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">
        {value}
      </p>
    </div>
  );
}

function translatePriority(priority: string) {
  if (priority === 'CRITICAL') return 'CRÍTICA';
  if (priority === 'HIGH') return 'ALTA';
  if (priority === 'MEDIUM') return 'MÉDIA';
  if (priority === 'LOW') return 'BAIXA';

  return priority;
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
  if (status === 'IN_PROGRESS') return 'EM ATENDIMENTO';
  if (status === 'RESOLVED') return 'RESOLVIDO';
  if (status === 'CANCELLED') return 'CANCELADO';

  return status;
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}