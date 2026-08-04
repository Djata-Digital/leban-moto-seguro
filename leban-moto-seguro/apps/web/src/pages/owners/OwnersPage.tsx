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

type OwnerDocument = {
  id: string;
  ownerId: string;
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

type Owner = {
  id: string;
  userId: string;
  birthDate?: string | null;
  identityNumber?: string | null;
  nationality?: string | null;
  country?: string | null;
  address?: string | null;
  createdAt: string;
  user: User;
  motorcycles?: unknown[];
  documents?: OwnerDocument[];
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
  nationality: 'Guineense',
  country: 'Guiné-Bissau',
  address: '',
};

function getResponseData<T>(response: any): T {
  return response?.data?.data ?? response?.data;
}

function getUploadUrl(response: any): string | undefined {
  const data = response?.data as UploadResponse;

  return (
    data?.data?.url ??
    data?.data?.fileUrl ??
    data?.url ??
    data?.fileUrl
  );
}

function getFileUrl(path?: string | null) {
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

  const baseUrl =
    String(api.defaults.baseURL ?? '')
      .replace(/\/api\/v1\/?$/, '')
      .replace(/\/$/, '');

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOwnerId, setEditingOwnerId] =
    useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState(initialForm);

  const [identityFile, setIdentityFile] =
    useState<File | null>(null);

  const [purchaseFile, setPurchaseFile] =
    useState<File | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === form.userId),
    [form.userId, users],
  );

  const availableUsers = useMemo(() => {
    const ownerUserIds = new Set(
      owners.map((owner) => owner.userId),
    );

    return users.filter(
      (user) =>
        !ownerUserIds.has(user.id) ||
        user.id === form.userId,
    );
  }, [form.userId, owners, users]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [ownersResponse, usersResponse] =
        await Promise.all([
          api.get('/owners'),
          api.get('/users'),
        ]);

      const ownersData =
        getResponseData<Owner[]>(ownersResponse) ?? [];

      const usersData =
        getResponseData<User[]>(usersResponse) ?? [];

      setOwners(
        Array.isArray(ownersData) ? ownersData : [],
      );

      setUsers(
        Array.isArray(usersData) ? usersData : [],
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          'Não foi possível carregar os proprietários.',
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
    setPurchaseFile(null);
    setEditingOwnerId(null);
  }

  function startEdit(owner: Owner) {
    setForm({
      userId: owner.userId,
      birthDate: owner.birthDate
        ? owner.birthDate.slice(0, 10)
        : '',
      identityNumber: owner.identityNumber ?? '',
      nationality: owner.nationality ?? '',
      country: owner.country ?? '',
      address: owner.address ?? '',
    });

    setIdentityFile(null);
    setPurchaseFile(null);
    setEditingOwnerId(owner.id);
    setShowForm(true);
    setError('');
    setSuccess('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleIdentityFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setIdentityFile(file);
  }

  function handlePurchaseFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setPurchaseFile(file);
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
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    const uploadedUrl = getUploadUrl(response);

    if (!uploadedUrl) {
      throw new Error(
        'O arquivo foi enviado, mas a API não retornou sua URL.',
      );
    }

    return uploadedUrl;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!form.userId) {
      setError('Selecione o usuário proprietário.');
      return;
    }

    setSaving(true);

    try {
      let identityDocumentUrl: string | undefined;
      let purchaseDocumentUrl: string | undefined;

      if (identityFile) {
        identityDocumentUrl = await uploadFile(
          identityFile,
          '/uploads/owners/identity',
        );
      }

      if (purchaseFile) {
        purchaseDocumentUrl = await uploadFile(
          purchaseFile,
          '/uploads/owners/purchase',
        );
      }

      const payload = {
        birthDate: form.birthDate || undefined,
        identityNumber: form.identityNumber.trim(),
        nationality: form.nationality.trim(),
        country: form.country.trim(),
        address: form.address.trim(),
        identityDocumentUrl,
        purchaseDocumentUrl,
      };

      if (editingOwnerId) {
        await api.patch(
          `/owners/${editingOwnerId}`,
          payload,
        );
      } else {
        await api.post('/owners', {
          userId: form.userId,
          ...payload,
        });
      }

      const wasEditing = Boolean(editingOwnerId);

      resetForm();
      setShowForm(false);

      setSuccess(
        wasEditing
          ? 'Proprietário atualizado com sucesso.'
          : 'Proprietário cadastrado com sucesso.',
      );

      await loadData();
    } catch (err: any) {
      const message = err.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message ??
              err.message ??
              'Erro ao salvar proprietário.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-slate-500">
        Carregando proprietários...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Proprietários
          </h1>

          <p className="mt-1 text-slate-500">
            Cadastro e gestão dos proprietários das motas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }

            setError('');
            setSuccess('');
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm
            ? editingOwnerId
              ? 'Fechar edição'
              : 'Fechar cadastro'
            : 'Novo proprietário'}
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
              {editingOwnerId
                ? 'Editar proprietário'
                : 'Novo proprietário'}
            </h2>

            <p className="text-sm text-slate-500">
              {editingOwnerId
                ? 'Atualize os dados cadastrais e, se necessário, substitua os documentos.'
                : 'Os dados pessoais principais serão obtidos da conta de usuário selecionada.'}
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
                    userId: event.target.value,
                  })
                }
                required
                disabled={Boolean(editingOwnerId)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="">
                  Selecione um usuário
                </option>

                {availableUsers.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.fullName} — {user.role}
                  </option>
                ))}
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
                  photoUrl={selectedUser.photoUrl}
                  name={selectedUser.fullName}
                  size="large"
                />

                <div className="grid flex-1 grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <p>
                    <span className="text-slate-500">
                      Nome:
                    </span>{' '}
                    <strong>
                      {selectedUser.fullName}
                    </strong>
                  </p>

                  <p>
                    <span className="text-slate-500">
                      Telefone:
                    </span>{' '}
                    {selectedUser.phone ?? '—'}
                  </p>

                  <p>
                    <span className="text-slate-500">
                      E-mail:
                    </span>{' '}
                    {selectedUser.email ?? '—'}
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
              onChange={handleIdentityFile}
            />

            <FileInput
              label="Comprovante de compra"
              description="Imagem ou PDF do comprovante."
              accept="image/jpeg,image/png,image/webp,application/pdf"
              file={purchaseFile}
              onChange={handlePurchaseFile}
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
                ? editingOwnerId
                  ? 'Atualizando...'
                  : 'Salvando...'
                : editingOwnerId
                  ? 'Atualizar proprietário'
                  : 'Salvar proprietário'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-4">Proprietário</th>
                <th className="p-4">BI</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">País</th>
                <th className="p-4">Documentos</th>
                <th className="p-4">Motas</th>
                <th className="p-4">Criado em</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {owners.map((owner) => (
                <tr
                  key={owner.id}
                  className="border-b last:border-b-0 hover:bg-slate-50"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        photoUrl={owner.user?.photoUrl}
                        name={
                          owner.user?.fullName ??
                          'Proprietário'
                        }
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {owner.user?.fullName ?? '—'}
                        </p>

                        <p className="text-xs text-slate-500">
                          {owner.user?.email ?? 'Sem e-mail'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {owner.identityNumber ?? '—'}
                  </td>

                  <td className="p-4">
                    {owner.user?.phone ?? '—'}
                  </td>

                  <td className="p-4">
                    {owner.country ?? '—'}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-wrap gap-2">
                        {owner.documents?.map((document) => (
                          <DocumentLink
                            key={document.id}
                            url={document.fileUrl}
                            label={
                              document.type === 'IDENTITY'
                                ? 'Identidade'
                                : document.type === 'PURCHASE_PROOF'
                                  ? 'Compra'
                                  : document.type === 'RESIDENCE_PROOF'
                                    ? 'Residência'
                                    : 'Documento'
                            }
                          />
                        ))}

                        {!owner.documents?.length && (
                          <span className="text-slate-400">
                            Nenhum
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {owner.motorcycles?.length ?? 0}
                    </span>
                  </td>

                  <td className="p-4 text-slate-600">
                    {new Date(
                      owner.createdAt,
                    ).toLocaleDateString('pt-BR')}
                  </td>

                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(owner)}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Editar dados
                    </button>
                  </td>
                </tr>
              ))}

              {!owners.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center text-slate-500"
                  >
                    Nenhum proprietário cadastrado.
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
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (photoUrl) {
    return (
      <img
        src={getFileUrl(photoUrl)}
        alt={name}
        className={`${dimensions} rounded-full border object-cover`}
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