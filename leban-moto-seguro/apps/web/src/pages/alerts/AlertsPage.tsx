import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS,} from '@leban/shared';
import { socket } from '../../api/socket';

type Alert = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  motorcycle?: {
    plateNumber: string;
    brand: string;
    model?: string;
  };
  gpsDevice?: {
    imei: string;
  };
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAlerts() {
    try {
      const response = await api.get('/alerts/open');
      setAlerts(response.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();

    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleAlertCreated() {
        loadAlerts();
    }

    function handleAlertUpdated() {
        loadAlerts();
    }

    socket.on('alert.created', handleAlertCreated);
    socket.on('alert.updated', handleAlertUpdated);

    return () => {
        socket.off('alert.created', handleAlertCreated);
        socket.off('alert.updated', handleAlertUpdated);
    };
    }, []);

  async function acknowledge(id: string) {
    await api.patch(`/alerts/${id}/acknowledge`, {
      note: 'Alerta reconhecido pelo operador no painel.',
    });
    await loadAlerts();
  }

  async function resolve(id: string) {
    await api.patch(`/alerts/${id}/resolve`, {
      note: 'Alerta resolvido pelo operador no painel.',
    });
    await loadAlerts();
  }

  if (loading) {
    return <p className="text-slate-500">Carregando alertas...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Alertas</h1>
          <p className="text-slate-500">
            Alertas automáticos gerados pelo motor de eventos.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Abertos" value={alerts.length} />
        <Card
          title="Críticos"
          value={alerts.filter((a) => a.severity === 'CRITICAL').length}
        />
        <Card
          title="Alta gravidade"
          value={alerts.filter((a) => a.severity === 'HIGH').length}
        />
        <Card
          title="Média/Baixa"
          value={alerts.filter((a) => ['MEDIUM', 'LOW'].includes(a.severity)).length}
        />
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white border rounded-xl shadow-sm p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={severityClass(alert.severity)}>
                    {translateSeverity(alert.severity)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
                    </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {alert.title}
                </h2>

                <p className="text-sm text-slate-600">{alert.message}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600 pt-2">
                  <p>
                    <strong>Placa:</strong>{' '}
                    {alert.motorcycle?.plateNumber ?? '—'}
                  </p>
                  <p>
                    <strong>Mota:</strong>{' '}
                    {alert.motorcycle
                      ? `${alert.motorcycle.brand} ${alert.motorcycle.model ?? ''}`
                      : '—'}
                  </p>
                  <p>
                    <strong>GPS:</strong> {alert.gpsDevice?.imei ?? '—'}
                  </p>
                  <p>
                    <strong>Latitude:</strong> {alert.latitude ?? '—'}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {alert.longitude ?? '—'}
                  </p>
                  <p>
                    <strong>Criado:</strong>{' '}
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => acknowledge(alert.id)}
                  className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm hover:bg-amber-100"
                >
                  Reconhecer
                </button>

                <button
                  onClick={() => resolve(alert.id)}
                  className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm hover:bg-green-100"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        ))}

        {!alerts.length && (
          <div className="bg-white border rounded-xl shadow-sm p-8 text-center text-slate-500">
            Nenhum alerta aberto no momento.
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-3xl font-bold text-slate-900 mt-1">{value}</h2>
    </div>
  );
}

function severityClass(severity: string) {
  const base = 'px-2 py-1 rounded-full text-xs font-medium';

  if (severity === 'CRITICAL') return `${base} bg-red-100 text-red-700`;
  if (severity === 'HIGH') return `${base} bg-orange-100 text-orange-700`;
  if (severity === 'MEDIUM') return `${base} bg-amber-100 text-amber-700`;

  return `${base} bg-blue-100 text-blue-700`;
}

function translateSeverity(severity: string) {
  return ALERT_SEVERITY_LABELS[severity] ?? severity;
}