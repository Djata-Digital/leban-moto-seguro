import { useEffect, useRef, useState } from 'react';
import { Play, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import { api } from '../../api/api';

type GpsDevice = {
  id: string;
  imei: string;
  simNumber?: string;
  provider?: string;
  deviceModel?: string;
  isActive: boolean;
  motorcycle?: {
    id: string;
    plateNumber: string;
    brand: string;
    model?: string;
  };
};

type RoutePoint = {
  latitude: number;
  longitude: number;
};

export function GpsSimulatorPage() {
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    gpsDeviceId: '',
    speed: '35',
    battery: '90',
    signalLevel: '90',
    intervalSeconds: '2',
  });

  async function loadDevices() {
    try {
      const response = await api.get('/gps/devices');
      setDevices(response.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, []);

  async function sendPoint(point: RoutePoint, index: number) {
    await api.post('/gps/locations', {
      gpsDeviceId: form.gpsDeviceId,
      latitude: point.latitude,
      longitude: point.longitude,
      speed: Number(form.speed),
      battery: Math.max(Number(form.battery) - index, 1),
      ignitionOn: true,
      signalLevel: Number(form.signalLevel),
    });
  }

  function startSimulation() {
    if (!form.gpsDeviceId || !routePoints.length) {
      alert('Selecione um GPS e adicione pontos no mapa.');
      return;
    }

    stopSimulation();
    setIsRunning(true);
    setCurrentIndex(0);

    let index = 0;

    intervalRef.current = window.setInterval(async () => {
      if (index >= routePoints.length) {
        stopSimulation();
        return;
      }

      await sendPoint(routePoints[index], index);
      setCurrentIndex(index + 1);
      index += 1;
    }, Number(form.intervalSeconds) * 1000);
  }

  function stopSimulation() {
    setIsRunning(false);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function clearRoute() {
    stopSimulation();
    setRoutePoints([]);
    setCurrentIndex(0);
  }

  const center: [number, number] =
    routePoints.length > 0
      ? [routePoints[0].latitude, routePoints[0].longitude]
      : [11.8597, -15.5982];

  const pathPositions = routePoints.map((point) => [
    point.latitude,
    point.longitude,
  ]) as [number, number][];

  if (loading) {
    return <p className="text-slate-500">Carregando simulador GPS...</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Simulador GPS</h1>
        <p className="text-slate-500">
          Clique no mapa para montar uma rota e enviar posições como se fosse um rastreador real.
        </p>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2">
          <label className="text-sm font-medium">Rastreador GPS</label>
          <select
            value={form.gpsDeviceId}
            onChange={(e) =>
              setForm({ ...form, gpsDeviceId: e.target.value })
            }
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            <option value="">Selecione</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.motorcycle?.plateNumber ?? 'Sem mota'} — {device.imei}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Velocidade km/h"
          value={form.speed}
          onChange={(value) => setForm({ ...form, speed: value })}
        />

        <Input
          label="Bateria inicial %"
          value={form.battery}
          onChange={(value) => setForm({ ...form, battery: value })}
        />

        <Input
          label="Intervalo segundos"
          value={form.intervalSeconds}
          onChange={(value) => setForm({ ...form, intervalSeconds: value })}
        />

        <Input
          label="Sinal GPS %"
          value={form.signalLevel}
          onChange={(value) => setForm({ ...form, signalLevel: value })}
        />

        <div className="xl:col-span-5 flex flex-wrap justify-end gap-2">
          <button
            onClick={startSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            <Play size={16} />
            Iniciar simulação
          </button>

          <button
            onClick={stopSimulation}
            disabled={!isRunning}
            className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
          >
            Parar
          </button>

          <button
            onClick={clearRoute}
            className="flex items-center gap-2 bg-red-50 text-red-700 px-5 py-2 rounded-lg text-sm hover:bg-red-100"
          >
            <Trash2 size={16} />
            Limpar rota
          </button>

          <button
            onClick={loadDevices}
            className="flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-2 rounded-lg text-sm hover:bg-blue-100"
          >
            <RefreshCcw size={16} />
            Atualizar GPS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="h-[640px]">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler
                onClick={(latitude, longitude) =>
                  setRoutePoints((previous) => [
                    ...previous,
                    { latitude, longitude },
                  ])
                }
              />

              {pathPositions.length > 1 && (
                <Polyline
                  positions={pathPositions}
                  pathOptions={{ weight: 5 }}
                />
              )}

              {routePoints.map((point, index) => (
                <CircleMarker
                  key={`${point.latitude}-${point.longitude}-${index}`}
                  center={[point.latitude, point.longitude]}
                  radius={index + 1 === currentIndex ? 8 : 5}
                >
                  <Popup>
                    <strong>Ponto {index + 1}</strong>
                    <p>Lat: {point.latitude}</p>
                    <p>Lng: {point.longitude}</p>
                    <p>
                      Status:{' '}
                      {index + 1 < currentIndex
                        ? 'Enviado'
                        : index + 1 === currentIndex
                          ? 'Atual'
                          : 'Pendente'}
                    </p>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <aside className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              Rota simulada
            </h2>
          </div>

          <div className="p-4 space-y-4">
            <Info label="Pontos criados" value={String(routePoints.length)} />
            <Info label="Pontos enviados" value={String(currentIndex)} />
            <Info
              label="Status"
              value={isRunning ? 'Simulação em andamento' : 'Parada'}
            />

            <div className="border rounded-xl p-3 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-3">
                Pontos da rota
              </h3>

              <div className="space-y-2 max-h-[420px] overflow-auto">
                {routePoints.map((point, index) => (
                  <div key={index} className="border-b pb-2 text-sm">
                    <p className="font-medium">Ponto {index + 1}</p>
                    <p className="text-xs text-slate-500">
                      Lat: {point.latitude}
                    </p>
                    <p className="text-xs text-slate-500">
                      Lng: {point.longitude}
                    </p>
                  </div>
                ))}

                {!routePoints.length && (
                  <p className="text-sm text-slate-500">
                    Clique no mapa para adicionar pontos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MapClickHandler({
  onClick,
}: {
  onClick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onClick(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    },
  });

  return null;
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2"
      />
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