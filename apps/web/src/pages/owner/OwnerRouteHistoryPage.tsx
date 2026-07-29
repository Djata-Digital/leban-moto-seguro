import { Icon } from 'leaflet';
import {
  AlertTriangle,
  Bike,
  CalendarDays,
  Clock3,
  Download,
  Gauge,
  MapPin,
  Navigation,
  Printer,
  RefreshCw,
  Route,
  Timer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { api } from '../../api/api';

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Motorcycle = {
  id: string;
  plateNumber: string;
  nationalCode: string;
  brand: string;
  model?: string | null;
};

type Point = {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  battery?: number | null;
  ignitionOn?: boolean | null;
  signalLevel?: number | null;
  recordedAt: string;
};

type Trip = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  movingSeconds: number;
  stoppedSeconds: number;
  distanceKm: number;
  averageSpeed: number;
  maxSpeed: number;
  startLocation: { latitude: number; longitude: number };
  endLocation: { latitude: number; longitude: number };
  pointCount: number;
  events: Array<{
    type: string;
    title: string;
    recordedAt: string;
    latitude: number;
    longitude: number;
  }>;
  points: Point[];
};

type HistoryResponse = {
  motorcycle: Motorcycle;
  period: { start: string; end: string };
  summary: {
    trips: number;
    distanceKm: number;
    movingSeconds: number;
    stoppedSeconds: number;
    averageSpeed: number;
    maxSpeed: number;
  };
  trips: Trip[];
};

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function coordinates(point: { latitude: number; longitude: number }) {
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export function OwnerRouteHistoryPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [motorcycleId, setMotorcycleId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return toInputDate(date);
  });
  const [endDate, setEndDate] = useState(() => toInputDate(new Date()));
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMotorcycles = useCallback(async () => {
    const response = await api.get('/owner/motorcycles');
    const data = response.data?.data ?? response.data ?? [];
    const items: Motorcycle[] = data.map((item: any) => ({
      id: item.id,
      plateNumber: item.plateNumber,
      nationalCode: item.nationalCode,
      brand: item.brand,
      model: item.model,
    }));
    setMotorcycles(items);
    setMotorcycleId((current) => current || items[0]?.id || '');
  }, []);

  const loadHistory = useCallback(async (silent = false, selectedId?: string) => {
    const id = selectedId ?? motorcycleId;
    if (!id) return;
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError('');
      const start = new Date(`${startDate}T00:00:00`).toISOString();
      const end = new Date(`${endDate}T23:59:59.999`).toISOString();
      const response = await api.get(`/owner/motorcycles/${id}/routes`, { params: { start, end } });
      const data: HistoryResponse = response.data?.data ?? response.data;
      setHistory(data);
      setSelectedTripId((current) => data.trips.some((trip) => trip.id === current) ? current : data.trips[0]?.id ?? '');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Não foi possível carregar o histórico de trajetos.');
      setHistory(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endDate, motorcycleId, startDate]);

  useEffect(() => {
    void (async () => {
      try {
        await loadMotorcycles();
      } catch (requestError: any) {
        setError(requestError?.response?.data?.message ?? 'Não foi possível carregar suas motas.');
        setLoading(false);
      }
    })();
  }, [loadMotorcycles]);

  useEffect(() => {
    if (motorcycleId) void loadHistory(false, motorcycleId);
  }, [motorcycleId]);

  const selectedTrip = useMemo(
    () => history?.trips.find((trip) => trip.id === selectedTripId) ?? history?.trips[0],
    [history, selectedTripId],
  );

  const setQuickPeriod = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
  };

  const exportCsv = () => {
    if (!history) return;
    const rows = [
      ['Placa', 'Início', 'Fim', 'Distância (km)', 'Duração', 'Velocidade média', 'Velocidade máxima', 'Origem', 'Destino'],
      ...history.trips.map((trip) => [
        history.motorcycle.plateNumber,
        new Date(trip.startedAt).toLocaleString('pt-BR'),
        new Date(trip.endedAt).toLocaleString('pt-BR'),
        trip.distanceKm.toFixed(2),
        formatDuration(trip.durationSeconds),
        trip.averageSpeed.toFixed(1),
        trip.maxSpeed.toFixed(1),
        coordinates(trip.startLocation),
        coordinates(trip.endLocation),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `historico-${history.motorcycle.plateNumber}-${startDate}-${endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="rounded-3xl border bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Histórico de trajetos</h1>
          <p className="mt-1 text-sm text-slate-500">Consulte percursos, horários, distâncias, velocidades, paradas e eventos do GPS.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!history?.trips.length} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50">
            <Download size={17} /> Exportar Excel/CSV
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <Printer size={17} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {error && <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={20} />{error}</div>}

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
          <label className="text-sm font-semibold text-slate-700">Mota
            <select value={motorcycleId} onChange={(event) => setMotorcycleId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-500">
              {motorcycles.map((item) => <option key={item.id} value={item.id}>{item.plateNumber} — {item.brand} {item.model ?? ''}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Data inicial
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Data final
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-500" />
          </label>
          <button type="button" onClick={() => void loadHistory(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /> Consultar
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setQuickPeriod(1)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Hoje</button>
          <button onClick={() => setQuickPeriod(7)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">7 dias</button>
          <button onClick={() => setQuickPeriod(30)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">30 dias</button>
          <button onClick={() => setQuickPeriod(365)} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">1 ano</button>
        </div>
      </section>

      {history && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Metric icon={Route} label="Viagens" value={String(history.summary.trips)} />
            <Metric icon={Navigation} label="Distância" value={`${history.summary.distanceKm.toFixed(2)} km`} />
            <Metric icon={Timer} label="Em movimento" value={formatDuration(history.summary.movingSeconds)} />
            <Metric icon={Clock3} label="Parado" value={formatDuration(history.summary.stoppedSeconds)} />
            <Metric icon={Gauge} label="Média" value={`${history.summary.averageSpeed.toFixed(1)} km/h`} />
            <Metric icon={Gauge} label="Máxima" value={`${history.summary.maxSpeed.toFixed(1)} km/h`} />
          </div>

          {!history.trips.length ? (
            <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm"><Bike size={42} className="mx-auto text-slate-300" /><h2 className="mt-4 text-xl font-bold text-slate-900">Nenhum trajeto encontrado</h2><p className="mt-2 text-sm text-slate-500">Não há pontos de GPS suficientes no período selecionado.</p></div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
              <aside className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {history.trips.map((trip, index) => (
                  <button key={trip.id} type="button" onClick={() => setSelectedTripId(trip.id)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedTrip?.id === trip.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between"><span className="font-bold text-slate-900">Viagem {history.trips.length - index}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-blue-700">{trip.distanceKm.toFixed(2)} km</span></div>
                    <div className="mt-3 space-y-2 text-xs text-slate-600"><p className="flex items-center gap-2"><CalendarDays size={14} />{new Date(trip.startedAt).toLocaleDateString('pt-BR')}</p><p className="flex items-center gap-2"><Clock3 size={14} />{new Date(trip.startedAt).toLocaleTimeString('pt-BR')} até {new Date(trip.endedAt).toLocaleTimeString('pt-BR')}</p><p className="flex items-center gap-2"><Gauge size={14} />Média {trip.averageSpeed.toFixed(1)} km/h • Máx. {trip.maxSpeed.toFixed(1)} km/h</p></div>
                  </button>
                ))}
              </aside>

              {selectedTrip && (
                <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
                  <div className="border-b p-5"><h2 className="font-bold text-slate-900">Reprodução do percurso</h2><p className="mt-1 text-xs text-slate-500">{selectedTrip.pointCount} pontos GPS • {formatDuration(selectedTrip.durationSeconds)} • {selectedTrip.distanceKm.toFixed(2)} km</p></div>
                  <div className="h-[480px]">
                    <MapContainer key={selectedTrip.id} center={[selectedTrip.startLocation.latitude, selectedTrip.startLocation.longitude]} zoom={14} className="h-full w-full">
                      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Polyline positions={selectedTrip.points.map((point) => [point.latitude, point.longitude])} />
                      <Marker position={[selectedTrip.startLocation.latitude, selectedTrip.startLocation.longitude]} icon={markerIcon}><Popup>Início: {new Date(selectedTrip.startedAt).toLocaleString('pt-BR')}</Popup></Marker>
                      <Marker position={[selectedTrip.endLocation.latitude, selectedTrip.endLocation.longitude]} icon={markerIcon}><Popup>Fim: {new Date(selectedTrip.endedAt).toLocaleString('pt-BR')}</Popup></Marker>
                    </MapContainer>
                  </div>
                  <div className="grid gap-4 border-t p-5 md:grid-cols-2">
                    <LocationCard title="Partida" point={selectedTrip.startLocation} date={selectedTrip.startedAt} />
                    <LocationCard title="Chegada" point={selectedTrip.endLocation} date={selectedTrip.endedAt} />
                  </div>
                  {selectedTrip.events.length > 0 && <div className="border-t p-5"><h3 className="font-bold text-slate-900">Eventos do trajeto</h3><div className="mt-3 space-y-2">{selectedTrip.events.slice(0, 20).map((event, index) => <div key={`${event.recordedAt}-${index}`} className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{event.title}</p><p className="text-xs opacity-75">{new Date(event.recordedAt).toLocaleString('pt-BR')}</p></div></div>)}</div></div>}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ icon: IconComponent, label, value }: { icon: typeof Route; label: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><IconComponent size={20} className="text-blue-600" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>;
}

function LocationCard({ title, point, date }: { title: string; point: { latitude: number; longitude: number }; date: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin size={16} className="text-blue-600" />{title}</p><p className="mt-2 text-sm text-slate-600">{coordinates(point)}</p><p className="mt-1 text-xs text-slate-500">{new Date(date).toLocaleString('pt-BR')}</p></div>;
}
