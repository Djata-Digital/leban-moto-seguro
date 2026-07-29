import type {
  ReactNode,
} from 'react';

import {
  Navigate,
  useLocation,
} from 'react-router-dom';

import {
  clearAuth,
  getAccessToken,
  getHomeRoute,
  getStoredUser,
  getUserRole,
  isPoliceRole,
  isStoredSessionCompatible,
  normalizeRole,
} from '../auth/auth';

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
  policeAccessTypes?: string[];
};

export function ProtectedRoute({
  children,
  roles,
  policeAccessTypes,
}: ProtectedRouteProps) {
  const location = useLocation();

  const token = getAccessToken();
  const user = getStoredUser();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!isStoredSessionCompatible(user)) {
    clearAuth();

    return (
      <Navigate
        to="/login"
        replace
        state={{
          sessionExpired: true,
        }}
      />
    );
  }

  if (
    roles?.length &&
    !roles
      .map(normalizeRole)
      .includes(getUserRole(user))
  ) {
    return (
      <Navigate
        to={getHomeRoute(user)}
        replace
      />
    );
  }

  const userRole = getUserRole(user);

  if (
    policeAccessTypes?.length &&
    isPoliceRole(userRole) &&
    !policeAccessTypes
      .map(normalizeRole)
      .includes(normalizeRole(user?.policeAccessType))
  ) {
    return (
      <Navigate
        to={getHomeRoute(user)}
        replace
      />
    );
  }

  return children;
}