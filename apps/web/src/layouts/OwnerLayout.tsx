import {
  Bell,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import {
  Outlet,
  useNavigate,
} from 'react-router-dom';

import {
  clearAuth,
  getStoredUser,
} from '../auth/auth';

import {
  OwnerDesktopNavigation,
  OwnerMobileBottomNavigation,
  OwnerMobileMenu,
} from '../components/owner/OwnerNavigation';

export function OwnerLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const refreshUser = () => setUser(getStoredUser());
    window.addEventListener('owner-profile-updated', refreshUser);
    return () => window.removeEventListener('owner-profile-updated', refreshUser);
  }, []);

  function logout() {
    clearAuth();

    navigate('/login', {
      replace: true,
    });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed bottom-0 left-0 top-0 hidden w-72 border-r bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck size={25} />
              </div>

              <div>
                <h1 className="font-bold text-slate-900">
                  LEBAN
                </h1>

                <p className="text-xs text-slate-500">
                  Moto Seguro
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Portal do proprietário
            </p>

            <OwnerDesktopNavigation />
          </div>

          <div className="border-t p-4">
            <div className="mb-3 rounded-xl bg-slate-50 p-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.fullName ??
                  user?.name ??
                  'Proprietário'}
              </p>

              <p className="truncate text-xs text-slate-500">
                {user?.email ??
                  user?.phone ??
                  'Conta do proprietário'}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                Portal do Proprietário
              </h2>

              <p className="hidden text-xs text-slate-500 sm:block">
                Segurança e acompanhamento das suas
                motas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate('/owner/alerts')
                }
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Alertas"
              >
                <Bell size={20} />
              </button>

              <OwnerMobileMenu />

              <button
                type="button"
                onClick={logout}
                className="hidden items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 sm:flex lg:hidden"
              >
                <LogOut size={17} />
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <OwnerMobileBottomNavigation />
    </div>
  );
}