import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bike,
  Circle,
  Play,
  RefreshCcw,
  Satellite,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Icon } from 'leaflet';
import { api } from '../../api/api';
import { socket } from '../../api/socket';

type Motorcycle = {
  id: string;
  plateNumber: string;
  brand: string;
  model?: string;
  color?: string;
  type: string;
  status: string;
  owner?: {
    fullName?: string;
    phone?: string;
  };
};

type LastLocation = {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  signalLevel?: number;
  recordedAt: string;
};

type Alert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  createdAt: string;
};

type Geofence = {
  id: string;
  name: string;
  type: string;
  radiusMeters: number;
  isActive: boolean;
};

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function Motorcycle360Page() {
  const { id } = useParams();
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [lastLocation, setLastLocation] = useState<LastLocation | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!id) return;

    try {
      const [motorcycleResponse, locationResponse, alertsResponse, geofencesResponse] =
        await Promise.allSettled([
          api.get(`/motorcycles/${id}`),
          api.get(`/gps/motorcycle/${id}/last-location`),
          api.get(`/alerts/motorcycle/${id}`),
          api.get(`/geofences/motorcycle/${id}`),
        ]);

      if (motorcycleResponse.status === 'fulfilled') {
        setMotorcycle(motorcycleResponse.value.data.data);
      }

      if (locationResponse.status === 'fulfilled') {
        setLastLocation(locationResponse.value.data.data);
      }

      if (alertsResponse.status === 'fulfilled') {
        setAlerts(alertsResponse.value.data.data);
      }

      if (geofencesResponse.status === 'fulfilled') {
        setGeofences(geofencesResponse.value.data.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    function handleRealtimeUpdate() {
      loadData();
    }

    socket.on('gps.location.created', handleRealtimeUpdate);
    socket.on('alert.created', handleRealtimeUpdate);
    socket.on('alert.updated', handleRealtimeUpdate);
    socket.on('dashboard.updated', handleRealtimeUpdate);

    return () => {
      socket.off('gps.location.created', handleRealtimeUpdate);
      socket.off('alert.created', handleRealtimeUpdate);
      socket.off('alert.updated', handleRealtimeUpdate);
      socket.off('dashboard.updated', handleRealtimeUpdate);
    };
  }, [id]);

  if (loading) {
    return <p className="text-slate-500">Carregando visão 360°...</p>;
  }

  if (!motorcycle) {
    return <p className="text-red-600">Motocicleta não encontrada.</p>;
  }

  const hasValidLocation =
    typeof lastLocation?.latitude === 'number' &&
    typeof lastLocation?.longitude === 'number';

  const center: [number, number] = hasValidLocation
    ? [lastLocation.latitude, lastLocation.longitude]
    : [11.8597, -15.5982];

  const openAlerts = alerts.filter((alert) => alert.severity === 'CRITICAL' || alert.severity === 'HIGH');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {motorcycle.plateNumber}
          </h1>
          <p className="text-slate-500">
            Visão 360° da motocicleta: localização, GPS, alertas, geofences e histórico.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Status" value={motorcycle.status} icon={Bike} />
        <Card title="Alertas" value={String(openAlerts.length)} icon={AlertTriangle} />
        <Card
          title="Bateria GPS"
          value={lastLocation ? `${lastLocation.battery ?? '—'}%` : '—'}
          icon={Satellite}
        />
        <Card
          title="Geofences"
          value={String(geofences.length)}
          icon={Circle}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="h-[520px]">
            <MapContainer
              key={`${center[0]}-${center[1]}`}
              center={center}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {hasValidLocation && lastLocation && (
                <Marker
                  position={[lastLocation.latitude, lastLocation.longitude]}
                  icon={markerIcon}
                >
                  <Popup>
                    <strong>{motorcycle.plateNumber}</strong>
                    <p>
                      {motorcycle.brand} {motorcycle.model ?? ''}
                    </p>
                    <p>Velocidade: {lastLocation.speed ?? 0} km/h</p>
                    <p>Bateria: {lastLocation.battery ?? '—'}%</p>
                    <p>
                      Atualizado:{' '}
                      {new Date(lastLocation.recordedAt).toLocaleString()}
                    </p>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        <aside className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900">Dados da motocicleta</h2>
          </div>

          <div className="p-4 space-y-4">
            <Info label="Placa" value={motorcycle.plateNumber} />
            <Info label="Marca" value={motorcycle.brand} />
            <Info label="Modelo" value={motorcycle.model ?? '—'} />
            <Info label="Cor" value={motorcycle.color ?? '—'} />
            <Info label="Tipo" value={motorcycle.type} />
            <Info label="Status" value={motorcycle.status} />

            <div className="border rounded-xl p-3 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-2">Proprietário</h3>
              <Info label="Nome" value={motorcycle.owner?.fullName ?? '—'} />
              <Info label="Telefone" value={motorcycle.owner?.phone ?? '—'} />
            </div>

            <div className="border rounded-xl p-3 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-2">Última localização</h3>
              <Info
                label="Latitude"
                value={lastLocation ? String(lastLocation.latitude) : '—'}
              />
              <Info
                label="Longitude"
                value={lastLocation ? String(lastLocation.longitude) : '—'}
              />
              <Info
                label="Velocidade"
                value={lastLocation ? `${lastLocation.speed ?? 0} km/h` : '—'}
              />
              <Info
                label="Ignição"
                value={
                  lastLocation
                    ? lastLocation.ignitionOn
                      ? 'Ligada'
                      : 'Desligada'
                    : '—'
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/playback?motorcycleId=${motorcycle.id}`}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700"
              >
                <Play size={16} />
                Playback
              </Link>

              <Link
                to="/noc"
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-200"
              >
                Central
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900">Alertas da motocicleta</h2>
          </div>

          <div className="p-4 space-y-3 max-h-[360px] overflow-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-600">
                    {alert.severity}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mt-2">{alert.title}</h3>
                <p className="text-sm text-slate-600">{alert.message}</p>
              </div>
            ))}

            {!alerts.length && (
              <p className="text-sm text-slate-500">Nenhum alerta encontrado.</p>
            )}
          </div>
        </section>

        <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900">Geofences da motocicleta</h2>
          </div>

          <div className="p-4 space-y-3 max-h-[360px] overflow-auto">
            {geofences.map((geofence) => (
              <div key={geofence.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{geofence.name}</h3>
                  <span
                    className={
                      geofence.isActive
                        ? 'text-xs text-green-600 font-bold'
                        : 'text-xs text-red-600 font-bold'
                    }
                  >
                    {geofence.isActive ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>

                <p className="text-sm text-slate-500">{geofence.type}</p>
                <p className="text-sm text-slate-500">
                  Raio: {geofence.radiusMeters} m
                </p>
              </div>
            ))}

            {!geofences.length && (
              <p className="text-sm text-slate-500">Nenhuma geofence cadastrada.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{value}</h2>
        </div>

        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}