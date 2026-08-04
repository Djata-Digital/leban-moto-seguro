import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleDot, Play, RefreshCcw, Route } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { DivIcon, Icon } from 'leaflet';
import { api } from '../../api/api';

type Motorcycle = {
  id: string;
  plateNumber: string;
  brand: string;
  model?: string;
};

type GpsLocation = {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  recordedAt: string;
};

type GpsDeviceHistory = {
  id: string;
  imei: string;
  motorcycle: Motorcycle;
  locations: GpsLocation[];
};

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const playbackIcon = new DivIcon({
  className: '',
  html: `
    <div style="
      background: #2563eb;
      color: white;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,.30);
      border: 2px solid white;
      white-space: nowrap;
    ">
      🛵 Playback
    </div>
  `,
  iconSize: [110, 36],
  iconAnchor: [55, 18],
});

export function PlaybackPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [history, setHistory] = useState<GpsDeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    motorcycleId: '',
    startDate: '',
    endDate: '',
    limit: '500',
    playbackSpeed: '1',
    });

    const [searchParams] = useSearchParams();

  async function loadMotorcycles() {
    try {
      const response = await api.get('/motorcycles');
      setMotorcycles(response.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const motorcycleId = searchParams.get('motorcycleId');

    if (motorcycleId) {
        setForm((previous) => ({
        ...previous,
        motorcycleId,
        }));
    }
    }, [searchParams]);

  useEffect(() => {
    loadMotorcycles();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoadingHistory(true);

    try {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      const params = new URLSearchParams();

      if (form.startDate) {
        params.append('startDate', new Date(form.startDate).toISOString());
      }

      if (form.endDate) {
        params.append('endDate', new Date(form.endDate).toISOString());
      }

      if (form.limit) {
        params.append('limit', form.limit);
      }

      const response = await api.get(
        `/gps/motorcycle/${form.motorcycleId}/history?${params.toString()}`,
      );

      setHistory(response.data.data);
      setPlayIndex(0);
      setIsPlaying(false);
    } finally {
      setLoadingHistory(false);
    }
  }

  const locations = useMemo(() => {
    return history
      .flatMap((device) => device.locations)
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() -
          new Date(b.recordedAt).getTime(),
      );
  }, [history]);

  const pathPositions = locations.map((location) => [
    location.latitude,
    location.longitude,
  ]) as [number, number][];

  const traveledPositions = locations
    .slice(0, playIndex + 1)
    .map((location) => [
        location.latitude,
        location.longitude,
    ]) as [number, number][];

  const center: [number, number] =
    pathPositions.length > 0 ? pathPositions[0] : [11.8597, -15.5982];

  const selectedMotorcycle = motorcycles.find(
    (moto) => moto.id === form.motorcycleId,
  );

  const currentPlaybackLocation = locations[playIndex];

  function getPlaybackInterval() {
    const speed = Number(form.playbackSpeed);

    if (speed === 0.5) return 2000;
    if (speed === 1) return 1000;
    if (speed === 2) return 500;
    if (speed === 4) return 250;
    if (speed === 8) return 125;

    return 1000;
    }

  function startPlayback() {
    if (!locations.length) return;

    setIsPlaying(true);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setPlayIndex((current) => {
        if (current >= locations.length - 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
          }

          setIsPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, getPlaybackInterval());
  }

  function pausePlayback() {
    setIsPlaying(false);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
  }

  function resetPlayback() {
    pausePlayback();
    setPlayIndex(0);
  }

  const totalDistanceKm = calculateTotalDistanceKm(locations);
  const averageSpeedValue = averageSpeed(locations);
  const totalDurationValue = totalDuration(locations);

  if (loading) {
    return <p className="text-slate-500">Carregando playback...</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Playback de Rotas
        </h1>
        <p className="text-slate-500">
          Reprodução histórica dos trajetos percorridos pelas motas.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4"
      >
        <div className="xl:col-span-2">
          <label className="text-sm font-medium">Mota</label>
          <select
            value={form.motorcycleId}
            onChange={(e) =>
              setForm({ ...form, motorcycleId: e.target.value })
            }
            required
            className="mt-1 w-full border rounded-lg px-3 py-2"
          >
            <option value="">Selecione</option>
            {motorcycles.map((moto) => (
              <option key={moto.id} value={moto.id}>
                {moto.plateNumber} — {moto.brand} {moto.model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Data inicial</label>
          <input
            type="datetime-local"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Data final</label>
          <input
            type="datetime-local"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Limite</label>
          <input
            value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })}
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="xl:col-span-5 flex justify-end">
          <button
            disabled={loadingHistory}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} />
            {loadingHistory ? 'Carregando...' : 'Carregar trajeto'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="h-[640px]">
            <MapContainer
              key={`${center[0]}-${center[1]}-${locations.length}`}
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {currentPlaybackLocation && (
                <FollowPlaybackMarker location={currentPlaybackLocation} />
                )}

              {pathPositions.length > 1 && (
                <Polyline
                    positions={pathPositions}
                    pathOptions={{
                    weight: 4,
                    opacity: 0.35,
                    }}
                />
                )}

                {traveledPositions.length > 1 && (
                <Polyline
                    positions={traveledPositions}
                    pathOptions={{
                    weight: 7,
                    opacity: 0.95,
                    }}
                />
                )}

              {locations.map((location, index) => (
                <CircleMarker
                  key={location.id ?? index}
                  center={[location.latitude, location.longitude]}
                  radius={index === 0 || index === locations.length - 1 ? 7 : 4}
                >
                  <Popup>
                    <strong>
                      {index === 0
                        ? 'Início'
                        : index === locations.length - 1
                          ? 'Fim'
                          : `Ponto ${index + 1}`}
                    </strong>
                    <p>Velocidade: {location.speed ?? 0} km/h</p>
                    <p>Bateria: {location.battery ?? '—'}%</p>
                    <p>
                      Data:{' '}
                      {location.recordedAt
                        ? new Date(location.recordedAt).toLocaleString()
                        : '—'}
                    </p>
                  </Popup>
                </CircleMarker>
              ))}

              {locations[0] && (
                <Marker
                  position={[locations[0].latitude, locations[0].longitude]}
                  icon={markerIcon}
                >
                  <Popup>
                    <strong>Início do trajeto</strong>
                  </Popup>
                </Marker>
              )}

              {locations[locations.length - 1] && (
                <Marker
                  position={[
                    locations[locations.length - 1].latitude,
                    locations[locations.length - 1].longitude,
                  ]}
                  icon={markerIcon}
                >
                  <Popup>
                    <strong>Fim do trajeto</strong>
                  </Popup>
                </Marker>
              )}

              {currentPlaybackLocation && (
                <Marker
                  position={[
                    currentPlaybackLocation.latitude,
                    currentPlaybackLocation.longitude,
                  ]}
                  icon={playbackIcon}
                >
                  <Popup>
                    <strong>Playback</strong>
                    <p>
                      Ponto: {playIndex + 1} de {locations.length}
                    </p>
                    <p>
                      Velocidade: {currentPlaybackLocation.speed ?? 0} km/h
                    </p>
                    <p>
                      Data:{' '}
                      {new Date(
                        currentPlaybackLocation.recordedAt,
                      ).toLocaleString()}
                    </p>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        <aside className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Route size={18} className="text-blue-600" />
              Resumo do trajeto
            </h2>
          </div>

          <div className="p-4 space-y-4">
            <SummaryItem
              label="Mota"
              value={
                selectedMotorcycle
                  ? `${selectedMotorcycle.plateNumber} — ${selectedMotorcycle.brand} ${selectedMotorcycle.model ?? ''}`
                  : '—'
              }
            />

            <SummaryItem label="Pontos GPS" value={String(locations.length)} />

            <SummaryItem
              label="Início"
              value={
                locations[0]?.recordedAt
                  ? new Date(locations[0].recordedAt).toLocaleString()
                  : '—'
              }
            />

            <SummaryItem
              label="Fim"
              value={
                locations[locations.length - 1]?.recordedAt
                  ? new Date(
                      locations[locations.length - 1].recordedAt,
                    ).toLocaleString()
                  : '—'
              }
            />

            <SummaryItem
              label="Velocidade máxima"
              value={`${maxSpeed(locations)} km/h`}
            />

            <SummaryItem
              label="Velocidade média"
              value={`${averageSpeedValue} km/h`}
            />

            <SummaryItem
              label="Distância percorrida"
              value={`${totalDistanceKm} km`}
            />

            <SummaryItem
              label="Tempo total"
              value={totalDurationValue}
            />

            {currentPlaybackLocation && (
              <div className="border rounded-xl p-3 bg-blue-50">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Ponto atual do Playback
                </h3>

                <p className="text-sm text-blue-800">
                  Ponto {playIndex + 1} de {locations.length}
                </p>
                <p className="text-sm text-blue-800">
                  Velocidade: {currentPlaybackLocation.speed ?? 0} km/h
                </p>
                <p className="text-sm text-blue-800">
                  Distância percorrida:{' '}
                  {calculateTotalDistanceKm(locations.slice(0, playIndex + 1))} km
                </p>
                <p className="text-sm text-blue-800">
                  Data:{' '}
                  {new Date(
                    currentPlaybackLocation.recordedAt,
                  ).toLocaleString()}
                </p>
              </div>
            )}

            <div className="border rounded-xl p-3 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CircleDot size={16} />
                Timeline
              </h3>

              <div className="space-y-3 max-h-[320px] overflow-auto">
                {locations.map((location, index) => (
                  <div
                    key={location.id ?? index}
                    className={
                      index === playIndex
                        ? 'border-b pb-2 bg-blue-50 rounded p-2'
                        : 'border-b pb-2'
                    }
                  >
                    <p className="text-sm font-medium">
                      {index === 0
                        ? 'Início'
                        : index === locations.length - 1
                          ? 'Fim'
                          : `Ponto ${index + 1}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(location.recordedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Velocidade: {location.speed ?? 0} km/h
                    </p>
                  </div>
                ))}

                {!locations.length && (
                  <p className="text-sm text-slate-500">
                    Nenhum trajeto carregado.
                  </p>
                )}
              </div>
            </div>

            <div>
                <label className="text-sm font-medium">Velocidade do playback</label>
                <select
                    value={form.playbackSpeed}
                    onChange={(e) =>
                    setForm({ ...form, playbackSpeed: e.target.value })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                    <option value="8">8x</option>
                </select>
                </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startPlayback}
                disabled={!locations.length || isPlaying}
                className="flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-700 disabled:opacity-50"
              >
                <Play size={16} />
                Play
              </button>

              <button
                type="button"
                onClick={pausePlayback}
                disabled={!locations.length || !isPlaying}
                className="bg-amber-500 text-white rounded-lg py-2 text-sm hover:bg-amber-600 disabled:opacity-50"
              >
                Pausar
              </button>

              <button
                type="button"
                onClick={resetPlayback}
                disabled={!locations.length}
                className="bg-slate-700 text-white rounded-lg py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            {locations.length > 0 && (
              <div>
                <input
                  type="range"
                  min={0}
                  max={locations.length - 1}
                  value={playIndex}
                  onChange={(e) => setPlayIndex(Number(e.target.value))}
                  className="w-full"
                />

                <p className="text-xs text-slate-500 text-center mt-1">
                  Ponto {playIndex + 1} de {locations.length}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function FollowPlaybackMarker({ location }: { location: GpsLocation }) {
  const map = useMap();

  useEffect(() => {
    map.panTo([location.latitude, location.longitude], {
      animate: true,
      duration: 0.6,
    });
  }, [location, map]);

  return null;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function maxSpeed(locations: GpsLocation[]) {
  if (!locations.length) return 0;

  return Math.max(...locations.map((location) => location.speed ?? 0));
}

function averageSpeed(locations: GpsLocation[]) {
  if (!locations.length) return 0;

  const total = locations.reduce(
    (sum, location) => sum + (location.speed ?? 0),
    0,
  );

  return Math.round(total / locations.length);
}

function totalDuration(locations: GpsLocation[]) {
  if (locations.length < 2) return '0 min';

  const start = new Date(locations[0].recordedAt).getTime();
  const end = new Date(locations[locations.length - 1].recordedAt).getTime();

  const diffMinutes = Math.max(Math.round((end - start) / 60000), 0);

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${hours}h ${minutes}min`;
}

function calculateTotalDistanceKm(locations: GpsLocation[]) {
  if (locations.length < 2) return '0.00';

  let totalMeters = 0;

  for (let index = 1; index < locations.length; index += 1) {
    const previous = locations[index - 1];
    const current = locations[index];

    totalMeters += haversineDistanceMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
  }

  return (totalMeters / 1000).toFixed(2);
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusMeters = 6371000;

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}