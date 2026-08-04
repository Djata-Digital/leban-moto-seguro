import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  Edit3,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Upload,
} from 'lucide-react';

import { api } from '../../api/api';

type UserStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'APPROVED'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'INACTIVE';

type PoliceOfficer = {
  id: string;
  userId: string;
  fullName: string;
  identityNumber?: string;
  badgeNumber?: string;
  stationName?: string;
  phone?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;

  user?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    status: UserStatus;
    createdAt?: string;
    photoUrl?: string;
    policeAccessType?: string;
  };

  _count?: {
    checks: number;
    dispatches: number;
  };
};

type PoliceForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  identityNumber: string;
  badgeNumber: string;
  stationName: string;
  photoUrl: string;
};

const initialForm: PoliceForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  identityNumber: '',
  badgeNumber: '',
  stationName: '',
  photoUrl: '',
};

export function PolicePage() {
  const [officers, setOfficers] = useState<PoliceOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOfficer, setEditingOfficer] =
    useState<PoliceOfficer | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PoliceForm>(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function loadOfficers() {
    setLoading(true);

    try {
      const response = await api.get('/police-officers');
      setOfficers(response.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOfficers();
  }, []);

  const filteredOfficers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return officers;
    }

    return officers.filter((officer) => {
      const values = [
        officer.fullName,
        officer.badgeNumber,
        officer.identityNumber,
        officer.stationName,
        officer.phone,
        officer.user?.email,
        officer.user?.status,
      ];

      return values.some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term),
      );
    });
  }, [officers, search]);

  const activeOfficers = officers.filter((officer) =>
    ['ACTIVE', 'APPROVED'].includes(officer.user?.status ?? ''),
  );

  const pendingOfficers = officers.filter(
    (officer) => officer.user?.status === 'PENDING',
  );

  const unavailableOfficers = officers.filter((officer) =>
    ['SUSPENDED', 'BLOCKED', 'INACTIVE'].includes(
      officer.user?.status ?? '',
    ),
  );


  function openCreateForm() {
    setEditingOfficer(null);
    setForm(initialForm);
    setPhotoFile(null);
    setPhotoPreview('');
    setShowForm(true);
  }

  function openEditForm(officer: PoliceOfficer) {
    setEditingOfficer(officer);

    setForm({
      fullName: officer.fullName ?? '',
      email: officer.user?.email ?? '',
      phone: officer.phone ?? officer.user?.phone ?? '',
      password: '',
      identityNumber: officer.identityNumber ?? '',
      badgeNumber: officer.badgeNumber ?? '',
      stationName: officer.stationName ?? '',
      photoUrl: officer.photoUrl ?? '',
    });

    setPhotoFile(null);
    setPhotoPreview(officer.photoUrl ?? officer.user?.photoUrl ?? '');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setEditingOfficer(null);
    setForm(initialForm);
    setPhotoFile(null);
    setPhotoPreview('');
    setShowForm(false);
  }

  async function uploadSelectedPhoto() {
    if (!photoFile) {
      return form.photoUrl.trim() || undefined;
    }

    setUploadingPhoto(true);

    try {
      const data = new FormData();
      data.append('file', photoFile);

      const response = await api.post(
        '/uploads/users/profile',
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const payload = response.data?.data ?? response.data;

      if (!payload?.url) {
        throw new Error('A API não retornou a URL da foto.');
      }

      return String(payload.url);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.fullName.trim()) {
      alert('Informe o nome do policial.');
      return;
    }

    if (!editingOfficer && !form.password.trim()) {
      alert('Informe uma senha para o novo policial.');
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      alert('Informe pelo menos o e-mail ou o telefone.');
      return;
    }

    try {
      setSaving(true);

      const photoUrl = await uploadSelectedPhoto();

      if (editingOfficer) {
        await api.patch(`/police-officers/${editingOfficer.id}`, {
          fullName: form.fullName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          identityNumber: form.identityNumber.trim() || null,
          badgeNumber: form.badgeNumber.trim() || null,
          stationName: form.stationName.trim() || null,
          photoUrl: photoUrl ?? null,
        });
      } else {
        await api.post('/police-officers', {
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          identityNumber: form.identityNumber.trim() || undefined,
          badgeNumber: form.badgeNumber.trim() || undefined,
          stationName: form.stationName.trim() || undefined,
          photoUrl,
        });
      }

      await loadOfficers();

      const wasEditing = Boolean(editingOfficer);
      setEditingOfficer(null);
      setForm(initialForm);
      setPhotoFile(null);
      setPhotoPreview('');
      setShowForm(false);

      alert(
        wasEditing
          ? 'Policial atualizado com sucesso.'
          : 'Policial cadastrado com sucesso.',
      );
    } catch (error: any) {
      alert(
        error?.response?.data?.message ??
          error?.message ??
          'Não foi possível salvar o policial.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    officer: PoliceOfficer,
    status: UserStatus,
  ) {
    await api.patch(`/police-officers/${officer.id}/status`, {
      status,
    });

    await loadOfficers();
  }

  async function removeOfficer(officer: PoliceOfficer) {
    const confirmed = window.confirm(
      `Deseja realmente remover o perfil policial de ${officer.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/police-officers/${officer.id}`);
      await loadOfficers();
      alert('Perfil policial removido com sucesso.');
    } catch {
      alert(
        'Não foi possível remover o policial. Verifique se ele possui despachos ativos.',
      );
    }
  }

  if (loading) {
    return <p className="text-slate-500">Carregando policiais...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Polícia
          </h1>

          <p className="text-slate-500">
            Cadastro, disponibilidade e acompanhamento dos policiais do
            sistema.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">           
          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Shield size={16} />
            Novo policial
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric
          title="Policiais cadastrados"
          value={officers.length}
          icon={Shield}
          tone="blue"
        />

        <Metric
          title="Ativos"
          value={activeOfficers.length}
          icon={UserCheck}
          tone="green"
        />

        <Metric
          title="Pendentes"
          value={pendingOfficers.length}
          icon={BadgeCheck}
          tone="amber"
        />
      </div>

      {unavailableOfficers.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <UserX size={18} />

            <p className="font-semibold">
              {unavailableOfficers.length}{' '}
              {unavailableOfficers.length === 1
                ? 'policial indisponível'
                : 'policiais indisponíveis'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nome, matrícula, unidade, telefone ou e-mail..."
            className="w-full rounded-lg border py-2 pl-10 pr-3"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-3">Policial</th>
                <th>Matrícula</th>
                <th>Unidade</th>
                <th>Contato</th>
                <th>Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredOfficers.map((officer) => (
                <tr
                  key={officer.id}
                  className="border-b align-top hover:bg-slate-50"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {officer.photoUrl ? (
                        <img
                          src={officer.photoUrl}
                          alt={officer.fullName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                          <Shield size={19} />
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-900">
                          {officer.fullName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {officer.user?.email ?? 'Sem e-mail'}
                        </p>

                        {officer.identityNumber && (
                          <p className="text-xs text-slate-400">
                            BI: {officer.identityNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="font-medium text-slate-700">
                      {officer.badgeNumber ?? '—'}
                    </span>
                  </td>

                  <td>{officer.stationName ?? '—'}</td>

                  <td>
                    <p>{officer.phone ?? officer.user?.phone ?? '—'}</p>
                  </td>

                  <td>
                    <StatusBadge status={officer.user?.status} />

                    <select
                      value={officer.user?.status ?? 'PENDING'}
                      onChange={(event) =>
                        updateStatus(
                          officer,
                          event.target.value as UserStatus,
                        )
                      }
                      className="mt-2 block rounded border px-2 py-1 text-xs"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="SUSPENDED">Suspenso</option>
                      <option value="BLOCKED">Bloqueado</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <div className="flex justify-end gap-2">

                      <button
                        type="button"
                        onClick={() => openEditForm(officer)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeOfficer(officer)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredOfficers.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    Nenhum policial encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingOfficer
                    ? 'Editar policial'
                    : 'Cadastrar policial'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Preencha os dados de identificação e acesso.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <Input
                label="Nome completo"
                value={form.fullName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    fullName: value,
                  }))
                }
                required
              />

              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    email: value,
                  }))
                }
              />

              <Input
                label="Telefone"
                value={form.phone}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    phone: value,
                  }))
                }
              />

              {!editingOfficer && (
                <Input
                  label="Senha inicial"
                  type="password"
                  value={form.password}
                  onChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      password: value,
                    }))
                  }
                  required
                />
              )}

              <Input
                label="Número de identidade"
                value={form.identityNumber}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    identityNumber: value,
                  }))
                }
              />

              <Input
                label="Matrícula policial"
                value={form.badgeNumber}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    badgeNumber: value,
                  }))
                }
              />

              <Input
                label="Esquadra / Unidade"
                value={form.stationName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    stationName: value,
                  }))
                }
              />

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Foto do policial
                </label>

                <div className="mt-2 flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Pré-visualização da foto"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Shield size={30} />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                      <Upload size={16} />
                      Escolher foto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setPhotoFile(file);

                          if (file) {
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    <p className="mt-2 text-xs text-slate-500">
                      JPG, PNG ou WEBP. A imagem será guardada na Cloudinary.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving || uploadingPhoto}
                className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving || uploadingPhoto
                  ? 'Salvando...'
                  : editingOfficer
                    ? 'Atualizar policial'
                    : 'Cadastrar policial'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: typeof Shield;
  tone: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-50 text-green-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'purple'
          ? 'bg-purple-50 text-purple-700'
          : 'bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm">{title}</p>
        <Icon size={18} />
      </div>

      <h2 className="mt-1 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status?: UserStatus }) {
  const base = 'inline-flex rounded-full px-2 py-1 text-xs font-semibold';

  if (status === 'ACTIVE' || status === 'APPROVED') {
    return (
      <span className={`${base} bg-green-100 text-green-700`}>
        {translateStatus(status)}
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        Pendente
      </span>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <span className={`${base} bg-orange-100 text-orange-700`}>
        Suspenso
      </span>
    );
  }

  return (
    <span className={`${base} bg-red-100 text-red-700`}>
      {translateStatus(status)}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />
    </div>
  );
}

function translateStatus(status?: UserStatus) {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'APPROVED') return 'Aprovado';
  if (status === 'PENDING') return 'Pendente';
  if (status === 'SUSPENDED') return 'Suspenso';
  if (status === 'BLOCKED') return 'Bloqueado';
  if (status === 'INACTIVE') return 'Inativo';

  return status ?? 'Desconhecido';
}