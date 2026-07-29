import {
  useEffect,
  useMemo,
  useRef,
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
  status: string;
  createdAt: string;
};

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  alternativePhone: string;
  password: string;
  confirmPassword: string;
  role: string;
};

type UploadResponse = {
  url?: string;
  fileUrl?: string;

  data?: {
    url?: string;
    fileUrl?: string;
  };
};

const initialForm: UserForm = {
  fullName: '',
  email: '',
  phone: '',
  alternativePhone: '',
  password: '',
  confirmPassword: '',
  role: 'PROPRIETARIO',
};

const acceptedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const maximumImageSize = 5 * 1024 * 1024;

export function UsersPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserForm>(initialForm);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/users');

      const responseUsers = Array.isArray(response.data)
        ? response.data
        : response.data?.data;

      setUsers(Array.isArray(responseUsers) ? responseUsers : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const normalizedPhone = useMemo(
    () => normalizePhone(form.phone),
    [form.phone],
  );

  function updateForm<K extends keyof UserForm>(
    field: K,
    value: UserForm[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setError('');
    setSuccessMessage('');
  }

  function openForm() {
    setShowForm(true);
    setError('');
    setSuccessMessage('');
  }

  function closeForm() {
    if (saving) {
      return;
    }

    resetForm();
    setShowForm(false);
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedPhoto(null);

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setSuccessMessage('');

    if (!acceptedImageTypes.includes(file.type)) {
      setError(
        'Selecione uma imagem JPG, PNG ou WEBP.',
      );

      event.target.value = '';
      return;
    }

    if (file.size > maximumImageSize) {
      setError('A imagem deve ter no máximo 5 MB.');

      event.target.value = '';
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhoto(null);
    setPhotoPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      return 'Informe o nome completo.';
    }

    if (!form.phone.trim()) {
      return 'Informe o número de telefone usado para login.';
    }

    if (normalizedPhone.length < 8) {
      return 'Informe um número de telefone válido.';
    }

    if (!form.password) {
      return 'Informe a senha inicial.';
    }

    if (form.password.length < 6) {
      return 'A senha deve possuir pelo menos 6 caracteres.';
    }

    if (form.password !== form.confirmPassword) {
      return 'A confirmação da senha está diferente da senha.';
    }

    if (
      form.email.trim() &&
      !isValidEmail(form.email.trim())
    ) {
      return 'Informe um endereço de e-mail válido.';
    }

    if (
      form.alternativePhone.trim() &&
      normalizePhone(form.alternativePhone).length < 8
    ) {
      return 'Informe um telefone alternativo válido.';
    }

    return null;
  }

  async function uploadProfilePhoto() {
    if (!selectedPhoto) {
      return undefined;
    }

    const uploadData = new FormData();
    uploadData.append('file', selectedPhoto);

    const response = await api.post<UploadResponse>(
      '/uploads/users/profile',
      uploadData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    console.log('RESPOSTA DO UPLOAD:', response.data);

    const uploadedUrl =
      response.data?.data?.url ??
      response.data?.data?.fileUrl ??
      response.data?.url ??
      response.data?.fileUrl;

    if (!uploadedUrl) {
      throw new Error(
        'A foto foi enviada, mas o servidor não retornou a URL do arquivo.',
      );
    }

    return uploadedUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const photoUrl = await uploadProfilePhoto();

      await api.post('/users', {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,

        /*
         * O telefone é enviado sem espaços, parênteses ou hífens.
         * O sinal "+" é preservado quando informado.
         */
        phone: normalizedPhone,

        alternativePhone:
          normalizePhone(form.alternativePhone) || undefined,

        password: form.password,
        role: form.role,
        photoUrl,
      });

      resetForm();
      setShowForm(false);

      setSuccessMessage('Usuário cadastrado com sucesso.');

      await loadUsers();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Carregando usuários...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Usuários
          </h1>

          <p className="mt-1 max-w-2xl text-slate-500">
            Cadastre as contas que poderão acessar o sistema.
            O número de celular será utilizado como login.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              openForm();
            }
          }}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showForm ? 'Fechar formulário' : 'Novo usuário'}
        </button>
      </header>

      {successMessage && (
        <AlertMessage
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Cadastro de usuário
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Os campos marcados com asterisco são obrigatórios.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[220px_1fr]">
            <ProfilePhotoField
              preview={photoPreview}
              fileName={selectedPhoto?.name}
              inputRef={fileInputRef}
              disabled={saving}
              onChange={handlePhotoChange}
              onRemove={removePhoto}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                label="Nome completo"
                value={form.fullName}
                onChange={(value) =>
                  updateForm('fullName', value)
                }
                placeholder="Nome e sobrenome"
                autoComplete="name"
                required
              />

              <PhoneInput
                label="Telefone usado para login"
                value={form.phone}
                onChange={(value) =>
                  updateForm('phone', value)
                }
                placeholder="+245 955 123 456"
                helperText="Use o código do país, por exemplo +245 ou +55."
                required
              />

              <PhoneInput
                label="Telefone alternativo"
                value={form.alternativePhone}
                onChange={(value) =>
                  updateForm('alternativePhone', value)
                }
                placeholder="+245 966 123 456"
                helperText="Campo opcional."
              />

              <TextInput
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateForm('email', value)
                }
                placeholder="usuario@exemplo.com"
                autoComplete="email"
                helperText="Campo opcional."
              />

              <TextInput
                label="Senha inicial"
                type="password"
                value={form.password}
                onChange={(value) =>
                  updateForm('password', value)
                }
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
                required
              />

              <TextInput
                label="Confirmar senha"
                type="password"
                value={form.confirmPassword}
                onChange={(value) =>
                  updateForm('confirmPassword', value)
                }
                placeholder="Digite novamente a senha"
                autoComplete="new-password"
                required
              />

              <div className="md:col-span-2">
                <label
                  htmlFor="user-role"
                  className="text-sm font-medium text-slate-700"
                >
                  Perfil <span className="text-red-500">*</span>
                </label>

                <select
                  id="user-role"
                  value={form.role}
                  onChange={(event) =>
                    updateForm('role', event.target.value)
                  }
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="ADMIN">
                    Administrador
                  </option>

                  <option value="OPERADOR">
                    Operador
                  </option>

                  <option value="PROPRIETARIO">
                    Proprietário
                  </option>

                  <option value="MOTORISTA">
                    Motorista
                  </option>

                  <option value="POLICIA">
                    Polícia de fiscalização
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-40 items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Salvando...
                </>
              ) : (
                'Salvar usuário'
              )}
            </button>
          </div>
        </form>
      )}

      <UsersTable users={users} />
    </div>
  );
}

function UsersTable({
  users,
}: {
  users: User[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">
          Usuários cadastrados
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Total: {users.length}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Telefone de login</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado em</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {user.fullName}
                      </p>

                      {user.alternativePhone && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Alternativo: {user.alternativePhone}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 font-medium text-slate-700">
                  {user.phone ?? '—'}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {user.email ?? '—'}
                </td>

                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}

            {!users.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                    👤
                  </div>

                  <p className="mt-3 font-medium text-slate-700">
                    Nenhum usuário cadastrado
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Clique em “Novo usuário” para fazer o primeiro cadastro.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfilePhotoField({
  preview,
  fileName,
  inputRef,
  disabled,
  onChange,
  onRemove,
}: {
  preview: string | null;
  fileName?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="mb-4 w-full text-sm font-medium text-slate-700">
        Foto de perfil
      </p>

      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow">
        {preview ? (
          <img
            src={preview}
            alt="Pré-visualização da foto"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl text-slate-400">
            👤
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {preview ? 'Trocar foto' : 'Escolher foto'}
      </button>

      {preview && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
        >
          Remover foto
        </button>
      )}

      {fileName && (
        <p
          title={fileName}
          className="mt-3 max-w-full truncate text-xs text-slate-500"
        >
          {fileName}
        </p>
      )}

      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        JPG, PNG ou WEBP.
        <br />
        Tamanho máximo: 5 MB.
      </p>
    </div>
  );
}

function UserAvatar({
  user,
}: {
  user: User;
}) {
  const imageUrl = resolveFileUrl(user.photoUrl);
  const initials = getInitials(user.fullName);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Foto de ${user.fullName}`}
        className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
      {initials}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helperText?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const inputId = label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {helperText && (
        <p className="mt-1 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

function PhoneInput({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}) {
  return (
    <TextInput
      label={label}
      type="tel"
      value={value}
      onChange={(newValue) =>
        onChange(formatPhoneInput(newValue))
      }
      placeholder={placeholder}
      helperText={helperText}
      autoComplete="tel"
      required={required}
    />
  );
}

function AlertMessage({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  const style =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800';

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${style}`}
    >
      <div className="flex items-start gap-2">
        <span>{type === 'success' ? '✓' : '⚠'}</span>
        <p>{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar mensagem"
        className="font-bold opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    OPERADOR: 'Operador',
    PROPRIETARIO: 'Proprietário',
    MOTORISTA: 'Motorista',
    POLICIA: 'Polícia de fiscalização',
    SUPERVISOR_POLICIA: 'Supervisor Polícia',
  };

  const roleStyles: Record<string, string> = {
    ADMIN: 'bg-purple-50 text-purple-700',
    OPERADOR: 'bg-cyan-50 text-cyan-700',
    PROPRIETARIO: 'bg-blue-50 text-blue-700',
    MOTORISTA: 'bg-amber-50 text-amber-700',
    POLICIA: 'bg-indigo-50 text-indigo-700',
    SUPERVISOR_POLICIA: 'bg-violet-50 text-violet-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        roleStyles[role] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {roleLabels[role] ?? role}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toUpperCase();

  const activeStatuses = [
    'ATIVO',
    'ACTIVE',
    'APPROVED',
  ];

  const isActive = activeStatuses.includes(normalizedStatus);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive
          ? 'bg-green-50 text-green-700'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {translateStatus(status)}
    </span>
  );
}

function normalizePhone(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const hasInternationalPrefix = trimmedValue.startsWith('+');
  const digits = trimmedValue.replace(/\D/g, '');

  return hasInternationalPrefix
    ? `+${digits}`
    : digits;
}

function formatPhoneInput(value: string) {
  /*
   * Permite apenas números, espaços, parênteses, hífen e um "+"
   * no início. A normalização definitiva acontece antes do envio.
   */
  const cleanedValue = value.replace(/[^\d+\-()\s]/g, '');

  const plusIndex = cleanedValue.indexOf('+');

  if (plusIndex === -1) {
    return cleanedValue;
  }

  return (
    '+' +
    cleanedValue
      .replace(/\+/g, '')
      .trimStart()
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getInitials(fullName: string) {
  const names = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!names.length) {
    return '?';
  }

  if (names.length === 1) {
    return names[0].slice(0, 2).toUpperCase();
  }

  return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return parsedDate.toLocaleDateString('pt-BR');
}

function translateStatus(status: string) {
  const statusLabels: Record<string, string> = {
    ACTIVE: 'Ativo',
    ATIVO: 'Ativo',
    INACTIVE: 'Inativo',
    INATIVO: 'Inativo',
    BLOCKED: 'Bloqueado',
    BLOQUEADO: 'Bloqueado',
    PENDING: 'Pendente',
    PENDENTE: 'Pendente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
  };

  return statusLabels[status.toUpperCase()] ?? status;
}

function resolveFileUrl(fileUrl?: string | null) {
  if (!fileUrl) {
    return null;
  }

  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://') ||
    fileUrl.startsWith('blob:') ||
    fileUrl.startsWith('data:')
  ) {
    return fileUrl;
  }

  const apiBaseUrl =
    typeof api.defaults.baseURL === 'string'
      ? api.defaults.baseURL
      : '';

  if (!apiBaseUrl) {
    return fileUrl;
  }

  try {
    const apiUrl = new URL(apiBaseUrl, window.location.origin);

    return new URL(fileUrl, apiUrl.origin).toString();
  } catch {
    return fileUrl;
  }
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const responseError = error as {
      response?: {
        data?: {
          message?: string | string[];
          error?: string;
        };
      };
    };

    const message = responseError.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }

    const responseMessage =
      responseError.response?.data?.error;

    if (responseMessage) {
      return responseMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível concluir a operação.';
}