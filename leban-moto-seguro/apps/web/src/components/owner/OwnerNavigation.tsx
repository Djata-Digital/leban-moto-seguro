import {
  AlertTriangle,
  Bell,
  Bike,
  CircleUserRound,
  Gauge,
  History,
  MapPin,
  Menu,
  ShieldCheck,
  Siren,
  UsersRound,
  X,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  NavLink,
  useLocation,
} from 'react-router-dom';

type NavigationItem = {
  label: string;
  path: string;
  icon: typeof Gauge;
  mobile?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    label: 'Início',
    path: '/owner',
    icon: Gauge,
    mobile: true,
  },
  {
    label: 'Minhas motas',
    path: '/owner/motorcycles',
    icon: Bike,
    mobile: true,
  },
  {
    label: 'Localização',
    path: '/owner/tracking',
    icon: MapPin,
    mobile: true,
  },
  {
    label: 'Histórico',
    path: '/owner/history',
    icon: History,
    mobile: true,
  },
  {
    label: 'Motoristas',
    path: '/owner/drivers',
    icon: UsersRound,
  },
  {
    label: 'Ocorrências',
    path: '/owner/reports',
    icon: Siren,
    mobile: true,
  },
  {
    label: 'Cercas virtuais',
    path: '/owner/geofences',
    icon: ShieldCheck,
  },
  {
    label: 'Alertas',
    path: '/owner/alerts',
    icon: Bell,
  },
  {
    label: 'Perfil',
    path: '/owner/profile',
    icon: CircleUserRound,
  },
];

function navigationClassName({
  isActive,
}: {
  isActive: boolean;
}) {
  return [
    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export function OwnerDesktopNavigation() {
  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/owner'}
            className={navigationClassName}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function OwnerMobileBottomNavigation() {
  const mobileItems =
    navigationItems.filter(
      (item) => item.mobile,
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(15,23,42,0.08)] lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/owner'}
            className={({
              isActive,
            }) =>
              [
                'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium',
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-500',
              ].join(' ')
            }
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function OwnerMobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-slate-700 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={21} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />

          <aside className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  LEBAN Moto Seguro
                </h2>

                <p className="text-xs text-slate-500">
                  Portal do proprietário
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <OwnerDesktopNavigation />

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Emergência
                  </p>

                  <p className="mt-1 text-xs text-amber-800">
                    Em caso de roubo ou furto,
                    comunique imediatamente uma
                    ocorrência.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}