import { useEffect, useState } from 'react';
import { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { api } from '../../api/api';

type MapMotorcycle = {
  motorcycleId: string;
  plateNumber: string;
  brand: string;
  model?: string;
  color?: string;
  type: string;
  status: string;
  ownerName: string;
  mapStatus: 'NORMAL' | 'WARNING' | 'ALERT' | string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  recordedAt: string;
};

const normalIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function MonitoringMapPage() {
  const [items, setItems] = useState<MapMotorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  async function loadMapData() {
    try {
      const response = await api.get('/dashboard/security-map');
      setItems(response.data.data);
      setLastUpdate(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMapData();

    const interval = setInterval(() => {
      loadMapData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const center: [number, number] =
    items.length > 0
      ? [items[0].latitude, items[0].longitude]
      : [11.8597, -15.5982];

  const totalAlerts = items.filter((item) => item.mapStatus === 'ALERT').length;
  const totalWarnings = items.filter(
    (item) => item.mapStatus === 'WARNING',
  ).length;
  const totalNormal = items.filter((item) => item.mapStatus === 'NORMAL').length;

  if (loading) {
    return <p className="text-slate-500">Carregando mapa...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Monitoramento em Tempo Real
          </h1>
          <p className="text-slate-500">
            Visualização das motas com rastreador GPS ativo.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Última atualização: {lastUpdate || '—'}
          </p>
        </div>

        <button
          onClick={loadMapData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Atualizar agora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="Total no mapa" value={items.length} />
        <StatusCard title="Normal" value={totalNormal} />
        <StatusCard title="Atenção" value={totalWarnings} />
        <StatusCard title="Alerta crítico" value={totalAlerts} />
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="h-[620px]">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {items.map((item) => (
              <Marker
                key={item.motorcycleId}
                position={[item.latitude, item.longitude]}
                icon={normalIcon}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <strong>{item.plateNumber}</strong>
                    <p>
                      {item.brand} {item.model}
                    </p>
                    <p>Dono: {item.ownerName}</p>
                    <p>Status: {item.status}</p>
                    <p>Alerta: {translateMapStatus(item.mapStatus)}</p>
                    <p>Velocidade: {item.speed ?? 0} km/h</p>
                    <p>Bateria GPS: {item.battery ?? '—'}%</p>
                    <p>
                      Ignição:{' '}
                      {item.ignitionOn === true
                        ? 'Ligada'
                        : item.ignitionOn === false
                          ? 'Desligada'
                          : '—'}
                    </p>
                    <p>
                      Data:{' '}
                      {item.recordedAt
                        ? new Date(item.recordedAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">Lista de motas no mapa</h2>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Placa</th>
                <th>Marca/Modelo</th>
                <th>Dono</th>
                <th>Status</th>
                <th>Alerta</th>
                <th>Velocidade</th>
                <th>Bateria</th>
                <th>Último sinal</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.motorcycleId} className="border-b">
                  <td className="py-2 font-medium">{item.plateNumber}</td>
                  <td>
                    {item.brand} {item.model}
                  </td>
                  <td>{item.ownerName}</td>
                  <td>{item.status}</td>
                  <td>{translateMapStatus(item.mapStatus)}</td>
                  <td>{item.speed ?? 0} km/h</td>
                  <td>{item.battery ?? '—'}%</td>
                  <td>
                    {item.recordedAt
                      ? new Date(item.recordedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    Nenhuma mota com localização GPS encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold text-slate-900 mt-1">{value}</h2>
    </div>
  );
}

function translateMapStatus(status: string) {
  if (status === 'ALERT') return 'Crítico';
  if (status === 'WARNING') return 'Atenção';
  if (status === 'NORMAL') return 'Normal';
  return status;
}