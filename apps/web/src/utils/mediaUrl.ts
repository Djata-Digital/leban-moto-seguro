const apiBaseUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api/v1';

const serverBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '');

export function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }

  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${serverBaseUrl}${normalized}`;
}
