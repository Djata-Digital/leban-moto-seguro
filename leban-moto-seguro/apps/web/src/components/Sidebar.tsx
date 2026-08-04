import {
  Bike,
  CircleDot,
  Home,
  Map,
  MapPinned,
  RadioTower,
  Route,
  Satellite,
  Shield,
  Smartphone,
  Users,
  UserRound,
} from 'lucide-react';

import { NavLink } from 'react-router-dom';

const items = [
  {
    to: '/',
    label: 'Dashboard',
    icon: Home,
  },
  {
    to: '/noc',
    label: 'Central Operacional',
    icon: RadioTower,
  },
  {
    to: '/monitoring',
    label: 'Monitoramento',
    icon: MapPinned,
  },
  {
    to: '/playback',
    label: 'Playback',
    icon: Route,
  },
  {
    to: '/geofences',
    label: 'Geofences',
    icon: CircleDot,
  },
  {
    to: '/gps',
    label: 'GPS',
    icon: Map,
  },
  {
    to: '/gps-simulator',
    label: 'Simulador GPS',
    icon: Satellite,
  },
  {
    to: '/motorcycles',
    label: 'Motas',
    icon: Bike,
  },
  {
    to: '/owners',
    label: 'Proprietários',
    icon: UserRound,
  },
  {
    to: '/drivers',
    label: 'Motoristas',
    icon: Users,
  },
  {
    to: '/police',
    label: 'Gestão da Polícia',
    icon: Shield,
  },
  {
    to: '/police-mobile',
    label: 'Aplicativo Policial',
    icon: Smartphone,
  },
  {
    to: '/users',
    label: 'Usuários',
    icon: Users,
  },
];

export function Sidebar() {
  return (
    <aside className="relative min-h-screen w-64 bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-5">
        <h1 className="text-xl font-bold">
          LEBAN
        </h1>

        <p className="text-sm text-slate-400">
          Moto Seguro
        </p>
      </div>

      <nav className="space-y-1 p-3 pb-20">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 text-xs text-slate-500">
        Sistema de segurança e fiscalização
      </div>
    </aside>
  );
}