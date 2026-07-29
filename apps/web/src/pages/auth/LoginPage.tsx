import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  clearAuth,
  getAccessToken,
  getHomeRoute,
  getStoredUser,
  isStoredSessionCompatible,
} from '../../auth/auth';

import {
  api,
} from '../../api/api';

import {
  enableNotifications,
} from '../../utils/notificationManager';

type LoginLocationState = {
  from?: string;
  sessionExpired?: boolean;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [login, setLogin] = useState(
    'admin@leban.com',
  );

  const [password, setPassword] =
    useState('123456');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const existingToken = getAccessToken();
  const existingUser = getStoredUser();
  const locationState =
    location.state as LoginLocationState | null;

  if (
    existingToken &&
    !isStoredSessionCompatible(existingUser)
  ) {
    clearAuth();
  }

  if (
    existingToken &&
    isStoredSessionCompatible(existingUser)
  ) {
    return (
      <Navigate
        to={getHomeRoute(existingUser)}
        replace
      />
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !login.trim() ||
      !password.trim()
    ) {
      setError(
        'Informe o email ou telefone e a senha.',
      );

      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(
        '/auth/login',
        {
          login: login.trim(),
          password,
        },
      );

      const payload =
        response.data?.data ??
        response.data;

      if (!payload?.accessToken) {
        throw new Error(
          'Token de acesso não recebido.',
        );
      }

      localStorage.setItem(
        'accessToken',
        payload.accessToken,
      );

      localStorage.setItem(
        'user',
        JSON.stringify(payload.user),
      );

      try {
        await enableNotifications();
      } catch (notificationError) {
        console.warn(
          'Login realizado, mas as notificações não foram ativadas:',
          notificationError,
        );
      }

      const state =
        location.state as
          | LoginLocationState
          | null;

      const requestedRoute =
        state?.from;

      const homeRoute =
        getHomeRoute(payload.user);

      const destination =
        requestedRoute &&
        requestedRoute !== '/login'
          ? requestedRoute
          : homeRoute;

      navigate(destination, {
        replace: true,
      });
    } catch (err: unknown) {
      const message = isApiError(err)
        ? extractApiErrorMessage(err)
        : 'Erro ao fazer login. Verifique os dados.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      <section className="hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-900 to-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            LEBAN Moto Seguro
          </div>

          <h1 className="mt-10 max-w-xl text-5xl font-bold leading-tight">
            Proteção, rastreamento e resposta rápida.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
            Um sistema integrado para proprietários,
            Central de Monitoramento e forças
            policiais.
          </p>
        </div>

        <p className="text-sm text-blue-200">
          Segurança inteligente para cada mota.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">
              Entrar no sistema
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Utilize seu email ou telefone e a sua
              senha.
            </p>
          </div>

          {locationState?.sessionExpired && !error && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Sua sessão antiga foi encerrada. Entre novamente para atualizar o perfil de acesso.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="login"
                className="text-sm font-semibold text-slate-700"
              >
                Email ou telefone
              </label>

              <input
                id="login"
                value={login}
                onChange={(event) =>
                  setLogin(
                    event.target.value,
                  )
                }
                disabled={loading}
                autoComplete="username"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="usuario@leban.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Senha
              </label>

              <input
                id="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                type="password"
                disabled={loading}
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="Digite sua senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Entrando...'
                : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Ao entrar, o sistema poderá solicitar
            permissão para enviar notificações de
            segurança e ocorrências.
          </p>
        </div>
      </section>
    </div>
  );
}

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

function isApiError(
  error: unknown,
): error is ApiErrorLike {
  return (
    typeof error === 'object' &&
    error !== null
  );
}

function extractApiErrorMessage(
  error: ApiErrorLike,
) {
  const message =
    error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'Erro ao fazer login. Verifique os dados.';
}