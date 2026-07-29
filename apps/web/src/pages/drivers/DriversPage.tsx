import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ChangeEvent,
  FormEvent,
} from 'react';

import { api } from '../../api/api';

type User = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  alternativePhone?: string | null;
  photoUrl?: string | null;
  role: string;
  status?: string;
};

type DriverDocument = {
  id: string;
  driverId: string;
  type:
    | 'IDENTITY'
    | 'PURCHASE_PROOF'
    | 'RESIDENCE_PROOF'
    | 'DRIVING_LICENSE'
    | 'MOTORCYCLE_REGISTRATION'
    | 'OTHER';
  fileUrl: string;
  verified: boolean;
  createdAt: string;
};

type Driver = {
  id: string;
  userId: string;

  birthDate?: string | null;
  identityNumber?: string | null;
  drivingLicenseNumber?: string | null;
  nationality?: string | null;
  country?: string | null;
  address?: string | null;

  createdAt: string;
  updatedAt?: string;

  user: User;

  documents?: DriverDocument[];
  motorcycleLinks?: unknown[];
  authorizations?: unknown[];
};

type UploadResponse = {
  url?: string;
  fileUrl?: string;
  data?: {
    url?: string;
    fileUrl?: string;
  };
};

const initialForm = {
  userId: '',
  birthDate: '',
  identityNumber: '',
  drivingLicenseNumber: '',
  nationality: 'Guineense',
  country: 'Guiné-Bissau',
  address: '',
};

function getResponseData<T>(
  response: any,
): T {
  return response?.data?.data ?? response?.data;
}

function getUploadUrl(
  response: any,
): string | undefined {
  const data = response?.data as UploadResponse;

  return (
    data?.data?.url ??
    data?.data?.fileUrl ??
    data?.url ??
    data?.fileUrl
  );
}

function getFileUrl(
  path?: string | null,
) {
  if (!path) {
    return '';
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const baseUrl = String(
    api.defaults.baseURL ?? '',
  )
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/$/, '');

  return `${baseUrl}${
    path.startsWith('/') ? path : `/${path}`
  }`;
}

export function DriversPage() {
  const [drivers, setDrivers] =
    useState<Driver[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [form, setForm] =
    useState(initialForm);

  const [
    identityFile,
    setIdentityFile,
  ] = useState<File | null>(null);

  const [
    drivingLicenseFile,
    setDrivingLicenseFile,
  ] = useState<File | null>(null);

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) => user.id === form.userId,
      ),
    [form.userId, users],
  );

  const availableUsers = useMemo(() => {
    const driverUserIds = new Set(
      drivers.map(
        (driver) => driver.userId,
      ),
    );

    return users.filter(
      (user) =>
        !driverUserIds.has(user.id),
    );
  }, [drivers, users]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [
        driversResponse,
        usersResponse,
      ] = await Promise.all([
        api.get('/drivers'),
        api.get('/users'),
      ]);

      const driversData =
        getResponseData<Driver[]>(
          driversResponse,
        ) ?? [];

      const usersData =
        getResponseData<User[]>(
          usersResponse,
        ) ?? [];

      setDrivers(
        Array.isArray(driversData)
          ? driversData
          : [],
      );

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : [],
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message ??
              'Não foi possível carregar os motoristas.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setIdentityFile(null);
    setDrivingLicenseFile(null);
  }

  function handleIdentityFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setIdentityFile(file);
  }

  function handleDrivingLicenseFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setDrivingLicenseFile(file);
  }

  async function uploadFile(
    file: File,
    endpoint: string,
  ) {
    const uploadData = new FormData();

    uploadData.append('file', file);

    const response = await api.post(
      endpoint,
      uploadData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      },
    );

    const uploadedUrl =
      getUploadUrl(response);

    if (!uploadedUrl) {
      throw new Error(
        'O arquivo foi enviado, mas a API não retornou sua URL.',
      );
    }

    return uploadedUrl;
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!form.userId) {
      setError(
        'Selecione o usuário motorista.',
      );

      return;
    }

    setSaving(true);

    try {
      let identityDocumentUrl:
        | string
        | undefined;

      let drivingLicenseDocumentUrl:
        | string
        | undefined;

      if (identityFile) {
        identityDocumentUrl =
          await uploadFile(
            identityFile,
            '/uploads/drivers/identity',
          );
      }

      if (drivingLicenseFile) {
        drivingLicenseDocumentUrl =
          await uploadFile(
            drivingLicenseFile,
            '/uploads/drivers/license',
          );
      }

      await api.post('/drivers', {
        userId: form.userId,

        birthDate:
          form.birthDate || undefined,

        identityNumber:
          form.identityNumber.trim() ||
          undefined,

        drivingLicenseNumber:
          form.drivingLicenseNumber.trim() ||
          undefined,

        nationality:
          form.nationality.trim() ||
          undefined,

        country:
          form.country.trim() ||
          undefined,

        address:
          form.address.trim() ||
          undefined,

        identityDocumentUrl,
        drivingLicenseDocumentUrl,
      });

      resetForm();
      setShowForm(false);

      setSuccess(
        'Motorista cadastrado com sucesso.',
      );

      await loadData();
    } catch (err: any) {
      const message =
        err.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message ??
              err.message ??
              'Erro ao salvar motorista.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-slate-500">
        Carregando motoristas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Motoristas
          </h1>

          <p className="mt-1 text-slate-500">
            Cadastro e gestão dos
            motoristas vinculados às motas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(
              (value) => !value,
            );

            setError('');
            setSuccess('');
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm
            ? 'Fechar cadastro'
            : 'Novo motorista'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Novo motorista
            </h2>

            <p className="text-sm text-slate-500">
              Os dados principais serão
              obtidos da conta de usuário
              selecionada.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Usuário *
              </label>

              <select
                value={form.userId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    userId:
                      event.target.value,
                  })
                }
                required
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="">
                  Selecione um usuário
                </option>

                {availableUsers.map(
                  (user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.fullName} —{' '}
                      {user.role}
                    </option>
                  ),
                )}
              </select>
            </div>

            <Input
              label="Data de nascimento"
              type="date"
              value={form.birthDate}
              onChange={(value) =>
                setForm({
                  ...form,
                  birthDate: value,
                })
              }
            />

            <Input
              label="Número do BI"
              value={form.identityNumber}
              onChange={(value) =>
                setForm({
                  ...form,
                  identityNumber: value,
                })
              }
            />

            <Input
              label="Número da carta de condução"
              value={
                form.drivingLicenseNumber
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  drivingLicenseNumber:
                    value,
                })
              }
            />

            <Input
              label="Nacionalidade"
              value={form.nationality}
              onChange={(value) =>
                setForm({
                  ...form,
                  nationality: value,
                })
              }
            />

            <Input
              label="País"
              value={form.country}
              onChange={(value) =>
                setForm({
                  ...form,
                  country: value,
                })
              }
            />

            <Input
              label="Endereço"
              value={form.address}
              onChange={(value) =>
                setForm({
                  ...form,
                  address: value,
                })
              }
            />
          </div>

          {selectedUser && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Dados da conta selecionada
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar
                  photoUrl={
                    selectedUser.photoUrl
                  }
                  name={
                    selectedUser.fullName
                  }
                  size="large"
                />

                <div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="text-slate-500">
                      Nome:
                    </span>{' '}
                    <strong>
                      {
                        selectedUser.fullName
                      }
                    </strong>
                  </p>

                  <p>
                    <span className="text-slate-500">
                      Telefone:
                    </span>{' '}
                    {selectedUser.phone ??
                      '—'}
                  </p>

                  <p>
                    <span className="text-slate-500">
                      E-mail:
                    </span>{' '}
                    {selectedUser.email ??
                      '—'}
                  </p>

                  <p>
                    <span className="text-slate-500">
                      Perfil:
                    </span>{' '}
                    {selectedUser.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FileInput
              label="Documento de identidade"
              description="Imagem ou PDF do BI/CIN."
              accept="image/jpeg,image/png,image/webp,application/pdf"
              file={identityFile}
              onChange={
                handleIdentityFile
              }
            />

            <FileInput
              label="Carta de condução"
              description="Imagem ou PDF da carta de condução."
              accept="image/jpeg,image/png,image/webp,application/pdf"
              file={drivingLicenseFile}
              onChange={
                handleDrivingLicenseFile
              }
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Salvando...'
                : 'Salvar motorista'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-4">
                  Motorista
                </th>

                <th className="p-4">
                  BI
                </th>

                <th className="p-4">
                  Carta
                </th>

                <th className="p-4">
                  Telefone
                </th>

                <th className="p-4">
                  País
                </th>

                <th className="p-4">
                  Documentos
                </th>

                <th className="p-4">
                  Motas
                </th>

                <th className="p-4">
                  Criado em
                </th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        photoUrl={
                          driver.user
                            ?.photoUrl
                        }
                        name={
                          driver.user
                            ?.fullName ??
                          'Motorista'
                        }
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {driver.user
                            ?.fullName ??
                            '—'}
                        </p>

                        <p className="text-xs text-slate-500">
                          {driver.user
                            ?.email ??
                            'Sem e-mail'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {driver.identityNumber ??
                      '—'}
                  </td>

                  <td className="p-4">
                    {driver.drivingLicenseNumber ??
                      '—'}
                  </td>

                  <td className="p-4">
                    {driver.user?.phone ??
                      '—'}
                  </td>

                  <td className="p-4">
                    {driver.country ?? '—'}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {driver.documents?.map(
                        (document) => (
                          <DocumentLink
                            key={
                              document.id
                            }
                            url={
                              document.fileUrl
                            }
                            label={getDocumentLabel(
                              document.type,
                            )}
                          />
                        ),
                      )}

                      {!driver.documents
                        ?.length && (
                        <span className="text-slate-400">
                          Nenhum
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {driver
                        .motorcycleLinks
                        ?.length ?? 0}
                    </span>
                  </td>

                  <td className="p-4 text-slate-600">
                    {new Date(
                      driver.createdAt,
                    ).toLocaleDateString(
                      'pt-BR',
                    )}
                  </td>
                </tr>
              ))}

              {!drivers.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center text-slate-500"
                  >
                    Nenhum motorista
                    cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getDocumentLabel(
  type: DriverDocument['type'],
) {
  switch (type) {
    case 'IDENTITY':
      return 'Identidade';

    case 'DRIVING_LICENSE':
      return 'Carta';

    case 'RESIDENCE_PROOF':
      return 'Residência';

    case 'PURCHASE_PROOF':
      return 'Compra';

    case 'MOTORCYCLE_REGISTRATION':
      return 'Registro';

    default:
      return 'Documento';
  }
}

function Input({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function FileInput({
  label,
  description,
  accept,
  file,
  onChange,
}: {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed p-4">
      <label className="text-sm font-semibold text-slate-700">
        {label}
      </label>

      <p className="mb-3 text-xs text-slate-500">
        {description}
      </p>

      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
      />

      {file && (
        <p className="mt-2 truncate text-xs text-green-700">
          Selecionado: {file.name}
        </p>
      )}
    </div>
  );
}

function Avatar({
  photoUrl,
  name,
  size = 'normal',
}: {
  photoUrl?: string | null;
  name: string;
  size?: 'normal' | 'large';
}) {
  const dimensions =
    size === 'large'
      ? 'h-20 w-20 text-2xl'
      : 'h-11 w-11 text-sm';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase(),
    )
    .join('');

  if (photoUrl) {
    return (
      <img
        src={getFileUrl(photoUrl)}
        alt={name}
        className={`${dimensions} shrink-0 rounded-full border object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600`}
    >
      {initials || '?'}
    </div>
  );
}

function DocumentLink({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  return (
    <a
      href={getFileUrl(url)}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
    >
      Ver {label}
    </a>
  );
}