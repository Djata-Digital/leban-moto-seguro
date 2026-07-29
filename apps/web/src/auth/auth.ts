export type AuthUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  userType?: string;
  type?: string;
  ownerId?: string;
  policeAccessType?: string;
  policeOfficerId?: string;
};

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getStoredUser(): AuthUser | null {
  const value = localStorage.getItem('user');

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

export function normalizeRole(
  role?: string | null,
) {
  return String(role ?? '')
    .trim()
    .toUpperCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_');
}

export function getUserRole(
  user?: AuthUser | null,
) {
  return normalizeRole(
    user?.role ??
      user?.userType ??
      user?.type,
  );
}

export function isOwnerRole(
  role?: string | null,
) {
  const normalized = normalizeRole(role);

  return [
    'OWNER',
    'PROPRIETARIO',
    'PROPRIETÁRIO',
    'MOTORCYCLE_OWNER',
  ].includes(normalized);
}

export function isPoliceRole(
  role?: string | null,
) {
  const normalized = normalizeRole(role);

  return [
    'POLICE',
    'POLICE_OFFICER',
    'POLICIA',
    'POLÍCIA',
  ].includes(normalized);
}

export function isDriverRole(
  role?: string | null,
) {
  const normalized = normalizeRole(role);

  return [
    'DRIVER',
    'MOTORISTA',
  ].includes(normalized);
}

export function isAdminRole(
  role?: string | null,
) {
  const normalized = normalizeRole(role);

  return [
    'ADMIN',
    'GLOBAL_ADMIN',
    'SUPER_ADMIN',
    'OPERATOR',
    'OPERADOR',
    'CENTRAL',
    'NOC',
  ].includes(normalized);
}


export function isStoredSessionCompatible(
  user?: AuthUser | null,
) {
  if (!user || !getUserRole(user)) {
    return false;
  }

  if (
    isPoliceRole(getUserRole(user)) &&
    !normalizeRole(user.policeAccessType)
  ) {
    return false;
  }

  return true;
}

export function getHomeRoute(
  user?: AuthUser | null,
) {
  const role = getUserRole(user);

  if (isOwnerRole(role)) {
    return '/owner';
  }

  if (isPoliceRole(role)) {
    return normalizeRole(user?.policeAccessType) === 'OPERATIONS'
      ? '/police-operations'
      : '/police-mobile';
  }

  if (isDriverRole(role)) {
    return '/driver';
  }

  return '/';
}