import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function AppLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const user = localStorage.getItem('user');
  const parsedUser = user ? JSON.parse(user) : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div>
            <h2 className="font-semibold text-slate-800">
              Painel Administrativo
            </h2>
            <p className="text-xs text-slate-500">
              Gestão, proteção e fiscalização de motas
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {parsedUser?.fullName ?? 'Usuário'}
              </p>
              <p className="text-xs text-slate-500">
                {parsedUser?.role ?? 'Perfil'}
              </p>
            </div>

            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}