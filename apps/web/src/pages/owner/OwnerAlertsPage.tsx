import {
  AlertTriangle,
  Bell,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
} from '@leban/shared';
import { api } from '../../api/api';
import { socket } from '../../api/socket';

type OwnerAlert = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  motorcycle?: {
    id: string;
    plateNumber: string;
    nationalCode: string;
    brand: string;
    model?: string | null;
    color?: string | null;
    status: string;
    photoUrl?: string | null;
  } | null;
  gpsDevice?: {
    id: string;
    imei: string;
    provider?: string | null;
    deviceModel?: string | null;
  } | null;
  theftReport?: {
    id: string;
    type: string;
    status: string;
    reportNumber?: string | null;
  } | null;
};

type FilterValue = 'ALL' | string;

function unwrap<T>(response: { data?: { data?: T } | T }): T {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function OwnerAlertsPage() {
  const [alerts, setAlerts] = useState<OwnerAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterValue>('ALL');
  const [severity, setSeverity] = useState<FilterValue>('ALL');
  const [motorcycleId, setMotorcycleId] = useState<FilterValue>('ALL');
  const [selected, setSelected] = useState<OwnerAlert | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState('');

  const loadAlerts = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      const response = await api.get('/owner/alerts');
      setAlerts(unwrap<OwnerAlert[]>(response) ?? []);
    } catch {
      setError('Não foi possível carregar os alertas. Confirme se a API está em execução.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const refresh = () => void loadAlerts(true);
    socket.on('alert.created', refresh);
    socket.on('alert.updated', refresh);
    return () => {
      socket.off('alert.created', refresh);
      socket.off('alert.updated', refresh);
    };
  }, [loadAlerts]);

  const motorcycles = useMemo(() => {
    const unique = new Map<string, NonNullable<OwnerAlert['motorcycle']>>();
    alerts.forEach((alert) => {
      if (alert.motorcycle) unique.set(alert.motorcycle.id, alert.motorcycle);
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.plateNumber.localeCompare(b.plateNumber),
    );
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (status !== 'ALL' && alert.status !== status) return false;
      if (severity !== 'ALL' && alert.severity !== severity) return false;
      if (motorcycleId !== 'ALL' && alert.motorcycle?.id !== motorcycleId) return false;
      if (!normalized) return true;
      return [
        alert.title,
        alert.message,
        alert.motorcycle?.plateNumber,
        alert.motorcycle?.nationalCode,
        alert.motorcycle?.brand,
        alert.motorcycle?.model,
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [alerts, motorcycleId, search, severity, status]);

  const totals = useMemo(
    () => ({
      open: alerts.filter((alert) => alert.status === 'OPEN').length,
      critical: alerts.filter(
        (alert) => alert.status === 'OPEN' && alert.severity === 'CRITICAL',
      ).length,
      acknowledged: alerts.filter((alert) => alert.status === 'ACKNOWLEDGED').length,
      resolved: alerts.filter((alert) =>
        ['RESOLVED', 'DISMISSED'].includes(alert.status),
      ).length,
    }),
    [alerts],
  );

  async function acknowledge(alert: OwnerAlert) {
    try {
      setAcknowledgingId(alert.id);
      const response = await api.patch(`/owner/alerts/${alert.id}/acknowledge`);
      const updated = unwrap<OwnerAlert>(response);
      setAlerts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected((current) => (current?.id === updated.id ? updated : current));
    } catch {
      setError('Não foi possível reconhecer o alerta. Tente novamente.');
    } finally {
      setAcknowledgingId('');
    }
  }

  function clearFilters() {
    setSearch('');
    setStatus('ALL');
    setSeverity('ALL');
    setMotorcycleId('ALL');
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-3xl border bg-white">
        <div className="text-center text-slate-500">
          <LoaderCircle className="mx-auto animate-spin" size={30} />
          <p className="mt-3 text-sm">Carregando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Alertas</h1>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe eventos de segurança, GPS, bateria e circulação das suas motas.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Abertos" value={totals.open} icon={ShieldAlert} tone="red" />
        <SummaryCard title="Críticos" value={totals.critical} icon={AlertTriangle} tone="orange" />
        <SummaryCard title="Reconhecidos" value={totals.acknowledged} icon={Clock3} tone="blue" />
        <SummaryCard title="Resolvidos" value={totals.resolved} icon={CheckCircle2} tone="green" />
      </section>

      <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter size={18} />
          Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por placa, código ou texto"
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <FilterSelect value={status} onChange={setStatus} label="Todos os status" options={ALERT_STATUS_LABELS} />
          <FilterSelect value={severity} onChange={setSeverity} label="Todas as gravidades" options={ALERT_SEVERITY_LABELS} />
          <select
            value={motorcycleId}
            onChange={(event) => setMotorcycleId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">Todas as motas</option>
            {motorcycles.map((motorcycle) => (
              <option key={motorcycle.id} value={motorcycle.id}>
                {motorcycle.plateNumber} — {motorcycle.brand} {motorcycle.model ?? ''}
              </option>
            ))}
          </select>
        </div>
        {(search || status !== 'ALL' || severity !== 'ALL' || motorcycleId !== 'ALL') && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <X size={16} /> Limpar filtros
          </button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">
            {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alerta encontrado' : 'alertas encontrados'}
          </h2>
        </div>

        {filteredAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            acknowledging={acknowledgingId === alert.id}
            onAcknowledge={() => void acknowledge(alert)}
            onOpen={() => setSelected(alert)}
          />
        ))}

        {!filteredAlerts.length && (
          <div className="rounded-3xl border bg-white px-6 py-14 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-500" size={42} />
            <h3 className="mt-4 text-lg font-bold text-slate-900">Nenhum alerta encontrado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Não há alertas que correspondam aos filtros selecionados.
            </p>
          </div>
        )}
      </section>

      {selected && (
        <AlertDetailsModal
          alert={selected}
          acknowledging={acknowledgingId === selected.id}
          onAcknowledge={() => void acknowledge(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: typeof Bell;
  tone: 'red' | 'orange' | 'blue' | 'green';
}) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="ALL">{label}</option>
      {Object.entries(options).map(([key, text]) => (
        <option key={key} value={key}>{text}</option>
      ))}
    </select>
  );
}

function AlertCard({
  alert,
  acknowledging,
  onAcknowledge,
  onOpen,
}: {
  alert: OwnerAlert;
  acknowledging: boolean;
  onAcknowledge: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge text={ALERT_SEVERITY_LABELS[alert.severity] ?? alert.severity} className={severityClass(alert.severity)} />
            <Badge text={ALERT_STATUS_LABELS[alert.status] ?? alert.status} className={statusClass(alert.status)} />
            <span className="text-xs text-slate-400">{formatDate(alert.createdAt)}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-slate-900">{alert.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{alert.message}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2"><Bike size={16} />{alert.motorcycle?.plateNumber ?? 'Mota não identificada'}</span>
            <span>{ALERT_TYPE_LABELS[alert.type] ?? alert.type}</span>
            {alert.latitude != null && alert.longitude != null && (
              <span className="inline-flex items-center gap-2"><MapPin size={16} />Localização disponível</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {alert.status === 'OPEN' && (
            <button
              type="button"
              onClick={onAcknowledge}
              disabled={acknowledging}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {acknowledging ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              Reconhecer
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver detalhes <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

function AlertDetailsModal({
  alert,
  acknowledging,
  onAcknowledge,
  onClose,
}: {
  alert: OwnerAlert;
  acknowledging: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
}) {
  const hasLocation = alert.latitude != null && alert.longitude != null;
  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
    : '';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge text={ALERT_SEVERITY_LABELS[alert.severity] ?? alert.severity} className={severityClass(alert.severity)} />
              <Badge text={ALERT_STATUS_LABELS[alert.status] ?? alert.status} className={statusClass(alert.status)} />
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">{alert.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={21} /></button>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-sm leading-6 text-slate-600">{alert.message}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Tipo" value={ALERT_TYPE_LABELS[alert.type] ?? alert.type} />
            <Detail label="Criado em" value={formatDate(alert.createdAt)} />
            <Detail label="Mota" value={alert.motorcycle ? `${alert.motorcycle.brand} ${alert.motorcycle.model ?? ''}` : '—'} />
            <Detail label="Placa" value={alert.motorcycle?.plateNumber ?? '—'} />
            <Detail label="Código nacional" value={alert.motorcycle?.nationalCode ?? '—'} />
            <Detail label="Dispositivo GPS" value={alert.gpsDevice?.imei ?? '—'} />
          </div>
          <div className="flex flex-wrap gap-3 border-t pt-5">
            {alert.status === 'OPEN' && (
              <button type="button" onClick={onAcknowledge} disabled={acknowledging} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {acknowledging ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} Reconhecer alerta
              </button>
            )}
            {alert.motorcycle?.id && (
              <Link to={`/owner/motorcycles/${alert.motorcycle.id}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Bike size={17} /> Abrir mota
              </Link>
            )}
            {hasLocation && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <MapPin size={17} /> Ver no mapa <ExternalLink size={15} />
              </a>
            )}
            {alert.theftReport?.id && (
              <Link to={`/owner/reports/${alert.theftReport.id}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <ShieldAlert size={17} /> Abrir ocorrência
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}
function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{text}</span>;
}
function severityClass(value: string) {
  if (value === 'CRITICAL') return 'bg-red-100 text-red-700';
  if (value === 'HIGH') return 'bg-orange-100 text-orange-700';
  if (value === 'MEDIUM') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}
function statusClass(value: string) {
  if (value === 'OPEN') return 'bg-red-50 text-red-700';
  if (value === 'ACKNOWLEDGED') return 'bg-blue-50 text-blue-700';
  if (value === 'RESOLVED') return 'bg-green-50 text-green-700';
  return 'bg-slate-100 text-slate-600';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}
