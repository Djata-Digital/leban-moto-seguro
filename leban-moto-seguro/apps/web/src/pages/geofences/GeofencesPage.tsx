import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Circle, MapPin } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { MotorcycleMarker } from '../../components/maps/MotorcycleMarker';
import { useLiveGps } from '../../hooks/useLiveGps';
import { socket } from '../../api/socket';
import {
  Circle as LeafletCircle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet';
import { Icon } from 'leaflet';
import { api } from '../../api/api';

type Motorcycle = {
  id: string;
  plateNumber: string;
  brand: string;
  model?: string;
};

type Geofence = {
  id: string;
  motorcycleId: string;
  name: string;
  type: string;
  shape: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  isActive: boolean;
  motorcycle?: Motorcycle;
};

type OpenAlert = {
  id: string;
  type: string;
  status: string;
  metadata?: {
    geofenceId?: string;
  };
};

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { motorcycles: liveMotorcycles } = useLiveGps();
  const [openAlerts, setOpenAlerts] = useState<OpenAlert[]>([]);

  const [form, setForm] = useState({
    motorcycleId: '',
    name: '',
    type: 'ALLOWED_AREA',
    shape: 'CIRCLE',
    centerLat: '11.8597',
    centerLng: '-15.5982',
    radiusMeters: '500',
    isActive: true,
  });

  async function loadData() {
    try {
      const [geofencesResponse, motorcyclesResponse, alertsResponse] =
        await Promise.all([
          api.get('/geofences'),
          api.get('/motorcycles'),
          api.get('/alerts/open'),
        ]);

      setGeofences(geofencesResponse.data.data);
      setMotorcycles(motorcyclesResponse.data.data);
      setOpenAlerts(alertsResponse.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function handleRealtimeUpdate() {
      loadData();
    }

    socket.on('alert.created', handleRealtimeUpdate);
    socket.on('alert.updated', handleRealtimeUpdate);
    socket.on('dashboard.updated', handleRealtimeUpdate);

    return () => {
      socket.off('alert.created', handleRealtimeUpdate);
      socket.off('alert.updated', handleRealtimeUpdate);
      socket.off('dashboard.updated', handleRealtimeUpdate);
    };
  }, []);

  function editGeofence(geofence: Geofence) {
    setEditingId(geofence.id);

    setForm({
      motorcycleId: geofence.motorcycleId,
      name: geofence.name,
      type: geofence.type,
      shape: geofence.shape,
      centerLat: String(geofence.centerLat),
      centerLng: String(geofence.centerLng),
      radiusMeters: String(geofence.radiusMeters),
      isActive: geofence.isActive,
    });

    setShowForm(true);
  }

  async function deleteGeofence(id: string) {
    if (!confirm('Deseja realmente excluir esta geofence?')) {
      return;
    }

    await api.delete(`/geofences/${id}`);

    await loadData();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload = {
      motorcycleId: form.motorcycleId,
      name: form.name,
      type: form.type,
      shape: form.shape,
      centerLat: Number(form.centerLat),
      centerLng: Number(form.centerLng),
      radiusMeters: Number(form.radiusMeters),
      isActive: form.isActive,
    };

    if (editingId) {
      await api.patch(`/geofences/${editingId}`, payload);
    } else {
      await api.post('/geofences', payload);
    }

    setForm({
      motorcycleId: '',
      name: '',
      type: 'ALLOWED_AREA',
      shape: 'CIRCLE',
      centerLat: '11.8597',
      centerLng: '-15.5982',
      radiusMeters: '500',
      isActive: true,
    });

    setShowForm(false);
    setEditingId(null);
    await loadData();
  }

  const center: [number, number] =
    geofences.length > 0
      ? [geofences[0].centerLat, geofences[0].centerLng]
      : [11.8597, -15.5982];

  if (loading) {
    return <p className="text-slate-500">Carregando geofences...</p>;
  }

  const previewLat = Number(form.centerLat);
  const previewLng = Number(form.centerLng);
  const previewRadius = Number(form.radiusMeters);

  const violatedGeofenceIds = openAlerts
    .filter((alert) => alert.type === 'MOTORCYCLE_OUT_OF_ROUTE')
    .map((alert) => alert.metadata?.geofenceId)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Geofences</h1>
          <p className="text-slate-500">
            Clique no mapa para escolher o centro da cerca virtual.
          </p>
        </div>

        <button
          onClick={() => setShowForm((value) => !value)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm ? 'Fechar' : 'Nova Geofence'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div>
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

          <Input
            label="Nome da cerca"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="ALLOWED_AREA">Área permitida</option>
              <option value="RESTRICTED_AREA">Área proibida</option>
              <option value="WARNING_AREA">Área de atenção</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setForm({
                  ...form,
                  isActive: e.target.value === 'true',
                })
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </div>

          <Input
            label="Latitude central"
            value={form.centerLat}
            onChange={(v) => setForm({ ...form, centerLat: v })}
            required
          />

          <Input
            label="Longitude central"
            value={form.centerLng}
            onChange={(v) => setForm({ ...form, centerLng: v })}
            required
          />

          <Input
            label="Raio em metros"
            value={form.radiusMeters}
            onChange={(v) => setForm({ ...form, radiusMeters: v })}
            required
          />

          <div className="md:col-span-2 xl:col-span-3 text-sm text-blue-600">
            Dica: com o formulário aberto, clique no mapa para preencher
            latitude e longitude automaticamente.
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <button className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700">
              {editingId ? 'Atualizar Geofence' : 'Salvar Geofence'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-3 flex flex-wrap gap-4 text-sm">
        <LegendItem color="bg-green-600" label="Área permitida" />
        <LegendItem color="bg-red-600" label="Área proibida" />
        <LegendItem color="bg-amber-500" label="Área de atenção" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="h-[620px]">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {showForm && (
                <MapClickHandler
                  onClick={(lat, lng) =>
                    setForm((prev) => ({
                      ...prev,
                      centerLat: String(lat),
                      centerLng: String(lng),
                    }))
                  }
                />
              )}

              {showForm && !Number.isNaN(previewLat) && !Number.isNaN(previewLng) && (
                <>
                  <LeafletCircle
                    center={[previewLat, previewLng]}
                    radius={previewRadius || 500}
                    pathOptions={{
                      color: geofenceColor(form.type),
                      fillColor: geofenceColor(form.type),
                      fillOpacity: 0.15,
                    }}
                    interactive={false}
                  />

                  <Marker
                    position={[previewLat, previewLng]}
                    icon={markerIcon}
                    draggable
                    eventHandlers={{
                      dragend: (event) => {
                        const marker = event.target;
                        const position = marker.getLatLng();

                        setForm((prev) => ({
                          ...prev,
                          centerLat: String(Number(position.lat.toFixed(6))),
                          centerLng: String(Number(position.lng.toFixed(6))),
                        }));
                      },
                    }}
                  >
                  </Marker>
                </>
              )}

              {liveMotorcycles.map((motorcycle) => (
                <MotorcycleMarker
                  key={motorcycle.motorcycleId}
                  motorcycle={motorcycle}
                />
              ))}

              {geofences.map((geofence) => (
                <div key={geofence.id}>
                  <LeafletCircle
                    center={[geofence.centerLat, geofence.centerLng]}
                    radius={geofence.radiusMeters}
                    pathOptions={{
                      color: violatedGeofenceIds.includes(geofence.id)
                        ? '#dc2626'
                        : geofenceColor(geofence.type),
                      fillColor: violatedGeofenceIds.includes(geofence.id)
                        ? '#dc2626'
                        : geofenceColor(geofence.type),
                      fillOpacity: violatedGeofenceIds.includes(geofence.id) ? 0.28 : 0.12,
                      weight: violatedGeofenceIds.includes(geofence.id) ? 5 : 3,
                    }}
                    interactive={false}
                  />

                  <Marker
                    position={[geofence.centerLat, geofence.centerLng]}
                    icon={markerIcon}
                  >
                    <Popup>
                      <strong>{geofence.name}</strong>
                      <p>{translateType(geofence.type)}</p>
                      <p>Raio: {geofence.radiusMeters} m</p>
                      <p>Mota: {geofence.motorcycle?.plateNumber ?? '—'}</p>
                      <p>Status: {geofence.isActive ? 'Ativa' : 'Inativa'}</p>
                      {violatedGeofenceIds.includes(geofence.id) && (
                        <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                          ⚠ Geofence violada
                        </p>
                      )}
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Circle size={18} />
              Cercas cadastradas
            </h2>
          </div>

          <div className="divide-y max-h-[620px] overflow-auto">
            {geofences.map((geofence) => (
              <div key={geofence.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{geofence.name}</h3>

                      <span
                        className={
                          geofence.isActive
                            ? 'px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium'
                            : 'px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium'
                        }
                      >
                        {geofence.isActive ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500">
                      {translateType(geofence.type)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editGeofence(geofence)}
                      className="p-2 rounded hover:bg-blue-100 text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => deleteGeofence(geofence.id)}
                      className="p-2 rounded hover:bg-red-100 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-slate-600">
                  <p>Raio: {geofence.radiusMeters} m</p>
                  <p>Forma: {geofence.shape}</p>
                  <p>Lat: {geofence.centerLat}</p>
                  <p>Lng: {geofence.centerLng}</p>
                </div>

                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                  <MapPin size={14} />
                  {geofence.motorcycle?.plateNumber ?? 'Sem mota'}
                </p>
              </div>
            ))}

            {!geofences.length && (
              <p className="text-sm text-slate-500 text-center p-8">
                Nenhuma geofence cadastrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onClick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });

  return null;
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full border rounded-lg px-3 py-2"
      />
    </div>
  );
}

function translateType(type: string) {
  if (type === 'ALLOWED_AREA') return 'Área permitida';
  if (type === 'RESTRICTED_AREA') return 'Área proibida';
  if (type === 'WARNING_AREA') return 'Área de atenção';
  return type;
}

function geofenceColor(type: string) {
  if (type === 'ALLOWED_AREA') return '#16a34a';
  if (type === 'RESTRICTED_AREA') return '#dc2626';
  if (type === 'WARNING_AREA') return '#f59e0b';

  return '#2563eb';
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}