import { useEffect, useState } from 'react';
import { AlertTriangle, Bike, MapPin, Shield, Siren, Users } from 'lucide-react';
import { api } from '../../api/api';
import { socket } from '../../api/socket';

type DashboardOverview = {
  totals: {
    users: number;
    owners: number;
    drivers: number;
    motorcycles: number;
    motoTaxi: number;
    particular: number;
    policeOfficers: number;
    gpsDevices: number;
    activeGpsDevices: number;
    openTheftReports: number;
    policeChecks: number;
    pendingAuthorizations: number;
    openAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
  };
  motorcyclesByStatus: Array<{ status: string; total: number }>;
  theftReportsByStatus: Array<{ status: string; total: number }>;
};

type DashboardAlerts = {
  openTheftReports: any[];
  motorcyclesBlocked: any[];
  motorcyclesWithoutGps: any[];
  lowBatteryLocations: any[];
  pendingAuthorizations: any[];
};

type OpenAlert = {
  id: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
  motorcycle?: {
    plateNumber?: string;
  };
};

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [openAlerts, setOpenAlerts] = useState<OpenAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [overviewResponse, alertsResponse, openAlertsResponse] =
        await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/alerts'),
          api.get('/alerts/open'),
        ]);

      setOverview(overviewResponse.data.data);
      setAlerts(alertsResponse.data.data);
      setOpenAlerts(openAlertsResponse.data.data.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    function handleDashboardUpdated() {
      loadDashboard();
    }

    socket.on('dashboard.updated', handleDashboardUpdated);
    socket.on('alert.created', handleDashboardUpdated);
    socket.on('alert.updated', handleDashboardUpdated);

    return () => {
      socket.off('dashboard.updated', handleDashboardUpdated);
      socket.off('alert.created', handleDashboardUpdated);
      socket.off('alert.updated', handleDashboardUpdated);
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const totals = overview?.totals;

  const cards = [
    { title: 'Usuários', value: totals?.users ?? 0, icon: Users },
    { title: 'Motas', value: totals?.motorcycles ?? 0, icon: Bike },
    { title: 'Moto-táxi', value: totals?.motoTaxi ?? 0, icon: Bike },
    { title: 'Polícias', value: totals?.policeOfficers ?? 0, icon: Shield },
    { title: 'GPS ativos', value: totals?.activeGpsDevices ?? 0, icon: MapPin },
    { title: 'Ocorrências abertas', value: totals?.openTheftReports ?? 0, icon: Siren },
    { title: 'Alertas abertos', value: totals?.openAlerts ?? 0, icon: AlertTriangle },
    { title: 'Alertas críticos', value: totals?.criticalAlerts ?? 0, icon: AlertTriangle },
    { title: 'Alertas altos', value: totals?.highAlerts ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">
          Visão geral do sistema LEBAN Moto Seguro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.title} className="bg-white rounded-xl p-5 border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <h2 className="text-3xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </h2>
                </div>

                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Motas por status</h2>

          <div className="space-y-3">
            {overview?.motorcyclesByStatus?.length ? (
              overview.motorcyclesByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-slate-600">{item.status}</span>
                  <span className="font-bold">{item.total}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhum dado encontrado.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Alertas principais</h2>

          <div className="space-y-3">
            <AlertRow title="Ocorrências abertas" value={alerts?.openTheftReports?.length ?? 0} />
            <AlertRow title="Motas bloqueadas/irregulares" value={alerts?.motorcyclesBlocked?.length ?? 0} />
            <AlertRow title="Motas sem GPS ativo" value={alerts?.motorcyclesWithoutGps?.length ?? 0} />
            <AlertRow title="GPS com bateria baixa" value={alerts?.lowBatteryLocations?.length ?? 0} />
            <AlertRow title="Autorizações pendentes" value={alerts?.pendingAuthorizations?.length ?? 0} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">Últimos alertas abertos</h2>

        <div className="space-y-3">
          {openAlerts.map((alert) => (
            <div key={alert.id} className="border-b pb-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-slate-900">{alert.title}</strong>
                <span className="text-xs text-slate-500">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-slate-600 mt-1">{alert.message}</p>

              <p className="text-xs text-slate-500 mt-1">
                Placa: {alert.motorcycle?.plateNumber ?? '—'} | Gravidade: {alert.severity}
              </p>
            </div>
          ))}

          {!openAlerts.length && (
            <p className="text-sm text-slate-500">Nenhum alerta aberto.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ title, value }: { title: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" />
        <span className="text-sm text-slate-600">{title}</span>
      </div>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-60 bg-slate-200 rounded" />
        <div className="h-4 w-80 bg-slate-200 rounded mt-3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex justify-between">
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-8 w-16 bg-slate-200 rounded mt-3" />
              </div>

              <div className="w-12 h-12 rounded-xl bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="h-5 w-48 bg-slate-200 rounded mb-4" />

            {Array.from({ length: 5 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex justify-between border-b pb-3 mb-3">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />

        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b pb-3 mb-3">
            <div className="flex justify-between">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-96 bg-slate-200 rounded mt-2" />
            <div className="h-3 w-56 bg-slate-200 rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}