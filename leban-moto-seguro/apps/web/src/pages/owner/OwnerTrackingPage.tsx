import { Icon } from 'leaflet';
import {
  AlertTriangle,
  Battery,
  Bike,
  Clock3,
  ExternalLink,
  Gauge,
  LocateFixed,
  MapPin,
  Navigation,
  Power,
  Radio,
  RefreshCw,
  Satellite,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { api } from '../../api/api';
import { socket } from '../../api/socket';

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type GpsLocation = {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  battery?: number | null;
  ignitionOn?: boolean | null;
  signalLevel?: number | null;
  recordedAt: string;
};

type TrackingMotorcycle = {
  id: string;
  nationalCode: string;
  plateNumber: string;
  brand: string;
  model?: string | null;
  color?: string | null;
  status: string;
  photoUrl?: string | null;
  gpsDevice?: {
    id: string;
    imei: string;
    provider?: string | null;
    deviceModel?: string | null;
    isActive: boolean;
    online: boolean;
    lastLocation?: GpsLocation | null;
  } | null;
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  STOLEN: 'Furtada',
  ROBBED: 'Roubada',
  RECOVERED: 'Recuperada',
  INVESTIGATION: 'Em investigação',
  BLOCKED: 'Bloqueada',
};

function MapFocus({ motorcycle }: { motorcycle?: TrackingMotorcycle }) {
  const map = useMap();
  const location = motorcycle?.gpsDevice?.lastLocation;

  useEffect(() => {
    if (location) {
      map.flyTo([location.latitude, location.longitude], 16, {
        duration: 0.8,
      });
    }
  }, [location, map]);

  return null;
}

export function OwnerTrackingPage() {
  const [motorcycles, setMotorcycles] = useState<TrackingMotorcycle[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadTracking = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError('');
      const response = await api.get('/owner/tracking');
      const data: TrackingMotorcycle[] = response.data?.data ?? response.data ?? [];
      setMotorcycles(data);
      setSelectedId((current) => {
        if (current && data.some((item) => item.id === current)) return current;
        return data.find((item) => item.gpsDevice?.lastLocation)?.id ?? data[0]?.id ?? '';
      });
      setLastRefresh(new Date());
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ??
          'Não foi possível carregar a localização das suas motas.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTracking();

    const handleGpsUpdate = () => void loadTracking(true);
    socket.on('gps.location.created', handleGpsUpdate);
    socket.on('dashboard.updated', handleGpsUpdate);

    return () => {
      socket.off('gps.location.created', handleGpsUpdate);
      socket.off('dashboard.updated', handleGpsUpdate);
    };
  }, [loadTracking]);

  const selected = useMemo(
    () => motorcycles.find((item) => item.id === selectedId) ?? motorcycles[0],
    [motorcycles, selectedId],
  );

  const locatedMotorcycles = motorcycles.filter(
    (item) => item.gpsDevice?.lastLocation,
  );

  const defaultCenter: [number, number] = selected?.gpsDevice?.lastLocation
    ? [
        selected.gpsDevice.lastLocation.latitude,
        selected.gpsDevice.lastLocation.longitude,
      ]
    : [11.8636, -15.5977];

  if (loading) return <TrackingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Localização em tempo real
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe posição, velocidade, bateria, ignição e comunicação do GPS.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadTracking(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Atualizar agora
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!motorcycles.length ? (
        <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
          <Bike size={44} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Nenhuma mota vinculada
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            As motas vinculadas ao seu perfil aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mota selecionada
              </label>
              <select
                value={selected?.id ?? ''}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
              >
                {motorcycles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.plateNumber} — {item.brand} {item.model ?? ''}
                  </option>
                ))}
              </select>
            </div>

            {selected && <MotorcycleTelemetry motorcycle={selected} />}
          </aside>

          <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">Mapa ao vivo</h2>
                <p className="text-xs text-slate-500">
                  {locatedMotorcycles.length} de {motorcycles.length} mota(s) com posição disponível
                </p>
              </div>

              {selected?.gpsDevice?.lastLocation && (
                <a
                  href={`https://www.google.com/maps?q=${selected.gpsDevice.lastLocation.latitude},${selected.gpsDevice.lastLocation.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Abrir no Google Maps
                  <ExternalLink size={16} />
                </a>
              )}
            </div>

            <div className="h-[560px] min-h-[420px]">
              <MapContainer
                center={defaultCenter}
                zoom={selected?.gpsDevice?.lastLocation ? 16 : 12}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFocus motorcycle={selected} />

                {locatedMotorcycles.map((item) => {
                  const location = item.gpsDevice!.lastLocation!;
                  return (
                    <Marker
                      key={item.id}
                      position={[location.latitude, location.longitude]}
                      icon={markerIcon}
                      eventHandlers={{ click: () => setSelectedId(item.id) }}
                    >
                      <Popup>
                        <strong>{item.plateNumber}</strong>
                        <br />
                        {item.brand} {item.model ?? ''}
                        <br />
                        Velocidade: {Math.round(location.speed ?? 0)} km/h
                        <br />
                        GPS: {item.gpsDevice?.online ? 'online' : 'offline'}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MotorcycleTelemetry({ motorcycle }: { motorcycle: TrackingMotorcycle }) {
  const device = motorcycle.gpsDevice;
  const location = device?.lastLocation;
  const dangerous = ['STOLEN', 'ROBBED', 'BLOCKED', 'INVESTIGATION'].includes(
    motorcycle.status,
  );

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {motorcycle.nationalCode}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {motorcycle.plateNumber}
          </h2>
          <p className="text-sm text-slate-500">
            {motorcycle.brand} {motorcycle.model ?? ''}
            {motorcycle.color ? ` • ${motorcycle.color}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            dangerous
              ? 'bg-red-100 text-red-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {statusLabels[motorcycle.status] ?? motorcycle.status}
        </span>
      </div>

      {!device ? (
        <EmptyGps message="Esta mota ainda não possui rastreador GPS ativo." />
      ) : !location ? (
        <EmptyGps message="O rastreador está cadastrado, mas ainda não enviou uma posição." />
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  device.online
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Satellite size={21} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Comunicação do GPS</p>
                <p className="font-bold text-slate-900">
                  {device.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <span
              className={`h-3 w-3 rounded-full ${
                device.online ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric icon={Gauge} label="Velocidade" value={`${Math.round(location.speed ?? 0)} km/h`} />
            <Metric icon={Battery} label="Bateria" value={location.battery == null ? 'Sem dados' : `${Math.round(location.battery)}%`} />
            <Metric icon={Power} label="Ignição" value={location.ignitionOn == null ? 'Sem dados' : location.ignitionOn ? 'Ligada' : 'Desligada'} />
            <Metric icon={Radio} label="Sinal" value={location.signalLevel == null ? 'Sem dados' : `${Math.round(location.signalLevel)}%`} />
          </div>

          <div className="mt-4 space-y-3 border-t pt-4 text-sm">
            <DetailRow icon={Clock3} label="Última comunicação" value={new Date(location.recordedAt).toLocaleString('pt-BR')} />
            <DetailRow icon={MapPin} label="Latitude" value={location.latitude.toFixed(6)} />
            <DetailRow icon={Navigation} label="Longitude" value={location.longitude.toFixed(6)} />
          </div>
        </>
      )}
    </div>
  );
}

function EmptyGps({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-5 text-center">
      <LocateFixed size={30} className="mx-auto text-slate-300" />
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function Metric({ icon: IconComponent, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3">
      <IconComponent size={17} className="text-blue-600" />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DetailRow({ icon: IconComponent, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconComponent size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-words font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-72 rounded bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="h-[520px] rounded-3xl bg-slate-200" />
        <div className="h-[620px] rounded-3xl bg-slate-200" />
      </div>
    </div>
  );
}
