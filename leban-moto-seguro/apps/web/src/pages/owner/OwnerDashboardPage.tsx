import {
  AlertTriangle,
  Bike,
  ChevronRight,
  History,
  MapPin,
  Navigation,
  ShieldCheck,
  Siren,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  api,
} from '../../api/api';

type OwnerDashboardData = {
  totals?: {
    motorcycles?: number;
    movingMotorcycles?: number;
    stoppedMotorcycles?: number;
    openAlerts?: number;
    openReports?: number;
  };
  motorcycles?: OwnerMotorcycleSummary[];
  recentAlerts?: OwnerAlertSummary[];
};

type OwnerMotorcycleSummary = {
  id: string;
  plateNumber?: string;
  nationalCode?: string;
  brand?: string;
  model?: string;
  color?: string;
  status?: string;
  photoUrl?: string;
  lastLocation?: {
    latitude?: number;
    longitude?: number;
    speed?: number;
    batteryLevel?: number;
    recordedAt?: string;
    address?: string;
  } | null;
};

type OwnerAlertSummary = {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  createdAt?: string;
  motorcycle?: {
    plateNumber?: string;
  };
};

export function OwnerDashboardPage() {
  const [data, setData] =
    useState<OwnerDashboardData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/owner/dashboard',
      );

      setData(
        response.data?.data ??
          response.data ??
          null,
      );
    } catch {
      /*
       * Enquanto o endpoint específico do
       * proprietário ainda não existir, a página
       * continua funcionando com valores vazios.
       */
      setData({
        totals: {
          motorcycles: 0,
          movingMotorcycles: 0,
          stoppedMotorcycles: 0,
          openAlerts: 0,
          openReports: 0,
        },
        motorcycles: [],
        recentAlerts: [],
      });

      setError(
        'O painel foi carregado, mas os dados do proprietário ainda não foram disponibilizados pela API.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <OwnerDashboardSkeleton />;
  }

  const totals = data?.totals;

  const cards = [
    {
      title: 'Minhas motas',
      value: totals?.motorcycles ?? 0,
      icon: Bike,
      path: '/owner/motorcycles',
    },
    {
      title: 'Em movimento',
      value:
        totals?.movingMotorcycles ?? 0,
      icon: Navigation,
      path: '/owner/tracking',
    },
    {
      title: 'Paradas',
      value:
        totals?.stoppedMotorcycles ?? 0,
      icon: MapPin,
      path: '/owner/tracking',
    },
    {
      title: 'Alertas abertos',
      value: totals?.openAlerts ?? 0,
      icon: AlertTriangle,
      path: '/owner/alerts',
    },
    {
      title: 'Ocorrências abertas',
      value: totals?.openReports ?? 0,
      icon: Siren,
      path: '/owner/reports',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-blue-950 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ShieldCheck size={25} />
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">
            Suas motas protegidas e sempre
            acompanhadas
          </h1>

          <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
            Consulte a localização em tempo real,
            acompanhe trajetos e comunique rapidamente
            uma ocorrência.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/owner/tracking"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <MapPin size={18} />
              Ver localização
            </Link>

            <Link
              to="/owner/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-red-300/50 bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              <Siren size={18} />
              Comunicar roubo ou furto
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                to={card.path}
                className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={22} />
                </div>

                <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">
                  {card.title}
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {card.value}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Minhas motas
              </h2>

              <p className="text-sm text-slate-500">
                Última situação registrada
              </p>
            </div>

            <Link
              to="/owner/motorcycles"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas
            </Link>
          </div>

          <div className="divide-y">
            {data?.motorcycles?.length ? (
              data.motorcycles
                .slice(0, 4)
                .map((motorcycle) => (
                  <MotorcycleRow
                    key={motorcycle.id}
                    motorcycle={motorcycle}
                  />
                ))
            ) : (
              <EmptyState
                icon={Bike}
                title="Nenhuma mota encontrada"
                description="As motas vinculadas à sua conta aparecerão aqui."
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Alertas recentes
              </h2>

              <p className="text-sm text-slate-500">
                Eventos que precisam da sua atenção
              </p>
            </div>

            <Link
              to="/owner/alerts"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todos
            </Link>
          </div>

          <div className="divide-y">
            {data?.recentAlerts?.length ? (
              data.recentAlerts
                .slice(0, 5)
                .map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                  />
                ))
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="Nenhum alerta recente"
                description="Quando surgir um evento importante, ele aparecerá aqui."
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          title="Localização atual"
          description="Veja onde sua mota está agora."
          path="/owner/tracking"
          icon={MapPin}
        />

        <QuickAction
          title="Histórico de trajetos"
          description="Filtre trajetos por data e mês."
          path="/owner/history"
          icon={History}
        />

        <QuickAction
          title="Minhas ocorrências"
          description="Acompanhe roubo ou furto comunicado."
          path="/owner/reports"
          icon={Siren}
        />

        <QuickAction
          title="Alertas de segurança"
          description="Consulte eventos e notificações."
          path="/owner/alerts"
          icon={AlertTriangle}
        />
      </section>
    </div>
  );
}

function MotorcycleRow({
  motorcycle,
}: {
  motorcycle: OwnerMotorcycleSummary;
}) {
  const lastUpdate =
    motorcycle.lastLocation?.recordedAt
      ? new Date(
          motorcycle.lastLocation.recordedAt,
        ).toLocaleString()
      : 'Sem localização recente';

  return (
    <Link
      to={`/owner/motorcycles/${motorcycle.id}`}
      className="flex items-center gap-4 p-4 transition hover:bg-slate-50"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">
        {motorcycle.photoUrl ? (
          <img
            src={motorcycle.photoUrl}
            alt="Mota"
            className="h-full w-full object-cover"
          />
        ) : (
          <Bike size={25} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900">
            {motorcycle.plateNumber ??
              motorcycle.nationalCode ??
              'Mota'}
          </p>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
            {motorcycle.status ?? 'Ativa'}
          </span>
        </div>

        <p className="truncate text-sm text-slate-500">
          {[motorcycle.brand, motorcycle.model]
            .filter(Boolean)
            .join(' ') || 'Modelo não informado'}
        </p>

        <p className="mt-1 truncate text-xs text-slate-400">
          Última atualização: {lastUpdate}
        </p>
      </div>

      <ChevronRight
        size={19}
        className="shrink-0 text-slate-400"
      />
    </Link>
  );
}

function AlertRow({
  alert,
}: {
  alert: OwnerAlertSummary;
}) {
  return (
    <div className="flex gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <AlertTriangle size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">
            {alert.title ?? 'Alerta'}
          </p>

          <span className="text-xs text-slate-400">
            {alert.createdAt
              ? new Date(
                  alert.createdAt,
                ).toLocaleString()
              : ''}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-600">
          {alert.message ??
            'Novo evento registrado.'}
        </p>

        {alert.motorcycle?.plateNumber && (
          <p className="mt-1 text-xs font-medium text-slate-500">
            Mota: {alert.motorcycle.plateNumber}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  path,
  icon: Icon,
}: {
  title: string;
  description: string;
  path: string;
  icon: typeof MapPin;
}) {
  return (
    <Link
      to={path}
      className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={22} />
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-600">
        Abrir
        <ChevronRight
          size={17}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Bike;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={25} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function OwnerDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-64 rounded-3xl bg-slate-300" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-2xl bg-white"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-2xl bg-white" />
        <div className="h-96 rounded-2xl bg-white" />
      </div>
    </div>
  );
}