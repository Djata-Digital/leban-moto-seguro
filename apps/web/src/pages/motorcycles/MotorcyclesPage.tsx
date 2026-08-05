import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ChangeEvent,
  FormEvent,
} from 'react';

import { Link } from 'react-router-dom';

import {
  MOTORCYCLE_STATUS_LABELS,
  MOTORCYCLE_TYPE_LABELS,
} from '@leban/shared';

import { api } from '../../api/api';
import { ClickableImage } from '../../components/common/ClickableImage';

import { MotorcycleQrActions } from '../../components/motorcycles/MotorcycleQrActions';

type Owner = {
  id: string;
  fullName: string;
};

type Driver = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  user?: {
    fullName?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    status?: string | null;
  };
};

type DriverMotorcycleLink = {
  id: string;
  driverId: string;
  motorcycleId: string;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  driver: Driver;
};

type MotorcycleDocument = {
  id: string;
  fileUrl: string;
  type: string;
  verified: boolean;
};

type Motorcycle = {
  id: string;
  nationalCode: string;
  qrToken: string;
  brand: string;
  model?: string;
  color?: string;
  plateNumber: string;
  chassisNumber: string;
  engineNumber?: string;
  photoUrl?: string;
  type: string;
  status: string;
  ownerId?: string;

  owner?: {
    fullName: string;
    phone?: string;
  };

  documents?: MotorcycleDocument[];
  driverLinks?: DriverMotorcycleLink[];
  routes?: unknown[];
  gpsDevices?: unknown[];
  theftReports?: unknown[];
};

type MotorcycleForm = {
  ownerId: string;
  type: string;
  brand: string;
  model: string;
  color: string;
  chassisNumber: string;
  engineNumber: string;
  plateNumber: string;
};

const initialForm: MotorcycleForm = {
  ownerId: '',
  type: 'MOTO_TAXI',
  brand: '',
  model: '',
  color: '',
  chassisNumber: '',
  engineNumber: '',
  plateNumber: '',
};

export function MotorcyclesPage() {
  const [
    motorcycles,
    setMotorcycles,
  ] = useState<Motorcycle[]>([]);

  const [
    owners,
    setOwners,
  ] = useState<Owner[]>([]);

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);

  const [
    selectedMotorcycle,
    setSelectedMotorcycle,
  ] = useState<Motorcycle | null>(null);

  const [
    selectedDriverId,
    setSelectedDriverId,
  ] = useState('');

  const [
    savingLink,
    setSavingLink,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingMotorcycleId,
    setEditingMotorcycleId,
  ] = useState<string | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    form,
    setForm,
  ] = useState<MotorcycleForm>(
    initialForm,
  );

  const [
    photoFile,
    setPhotoFile,
  ] = useState<File | null>(null);

  const [
    documentFile,
    setDocumentFile,
  ] = useState<File | null>(null);

  const photoPreview = useMemo(() => {
    if (!photoFile) {
      return '';
    }

    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  async function loadData() {
    try {
      const [
        motorcyclesResponse,
        ownersResponse,
        driversResponse,
      ] = await Promise.all([
        api.get('/motorcycles'),
        api.get('/owners'),
        api.get('/drivers'),
      ]);

      setMotorcycles(
        motorcyclesResponse.data.data ?? [],
      );

      setOwners(
        ownersResponse.data.data ?? [],
      );

      setDrivers(
        driversResponse.data.data ?? [],
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        'Não foi possível carregar as motas.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setErrorMessage('');

    if (!file) {
      setPhotoFile(null);
      return;
    }

    const acceptedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!acceptedTypes.includes(file.type)) {
      event.target.value = '';

      setPhotoFile(null);

      setErrorMessage(
        'A foto deve estar em formato JPG, PNG ou WEBP.',
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      event.target.value = '';

      setPhotoFile(null);

      setErrorMessage(
        'A foto não pode ultrapassar 10 MB.',
      );

      return;
    }

    setPhotoFile(file);
  }

  function handleDocumentChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setErrorMessage('');

    if (!file) {
      setDocumentFile(null);
      return;
    }

    const acceptedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!acceptedTypes.includes(file.type)) {
      event.target.value = '';

      setDocumentFile(null);

      setErrorMessage(
        'O documento deve estar em formato PDF, JPG, PNG ou WEBP.',
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      event.target.value = '';

      setDocumentFile(null);

      setErrorMessage(
        'O documento não pode ultrapassar 10 MB.',
      );

      return;
    }

    setDocumentFile(file);
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!editingMotorcycleId && !photoFile) {
      setErrorMessage(
        'Selecione uma foto da mota.',
      );

      return;
    }

    if (!editingMotorcycleId && !documentFile) {
      setErrorMessage(
        'Selecione o documento da mota.',
      );

      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        ownerId: form.ownerId,
        type: form.type,
        brand: form.brand,
        model:
          form.model.trim() ||
          undefined,
        color:
          form.color.trim() ||
          undefined,
        chassisNumber:
          form.chassisNumber,
        engineNumber:
          form.engineNumber.trim() ||
          undefined,
        plateNumber:
          form.plateNumber,
      };

      const motorcycleResponse =
        editingMotorcycleId
          ? await api.patch(
              `/motorcycles/${editingMotorcycleId}`,
              payload,
            )
          : await api.post(
              '/motorcycles',
              payload,
            );

      const motorcycle =
        motorcycleResponse.data.data ??
        motorcycleResponse.data;

      const motorcycleId =
        editingMotorcycleId ??
        motorcycle?.id;

      if (!motorcycleId) {
        throw new Error(
          'A API não devolveu o ID da mota.',
        );
      }

      if (photoFile || documentFile) {
        const filesFormData =
          new FormData();

        if (photoFile) {
          filesFormData.append(
            'photo',
            photoFile,
          );
        }

        if (documentFile) {
          filesFormData.append(
            'document',
            documentFile,
          );
        }

        await api.post(
          `/motorcycles/${motorcycleId}/files`,
          filesFormData,
        );
      }

      setSuccessMessage(
        editingMotorcycleId
          ? 'Mota atualizada com sucesso.'
          : 'Mota cadastrada com sucesso.',
      );

      closeForm();
      await loadData();
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message;

      const formattedMessage =
        Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage;

      setErrorMessage(
        formattedMessage ||
          (editingMotorcycleId
            ? 'Não foi possível atualizar a mota.'
            : 'Não foi possível cadastrar a mota.'),
      );
    } finally {
      setSubmitting(false);
    }
  }


  function getDriverName(driver?: Driver) {
    return (
      driver?.user?.fullName ??
      driver?.fullName ??
      'Motorista sem nome'
    );
  }

  function openDriverLink(motorcycle: Motorcycle) {
    const activeLink = motorcycle.driverLinks?.find(
      (link) => link.isActive,
    );

    setSelectedMotorcycle(motorcycle);
    setSelectedDriverId(activeLink?.driverId ?? '');
    setErrorMessage('');
    setSuccessMessage('');
  }

  function closeDriverLink() {
    setSelectedMotorcycle(null);
    setSelectedDriverId('');
  }

  async function saveDriverLink() {
    if (!selectedMotorcycle || !selectedDriverId) {
      setErrorMessage('Selecione um motorista.');
      return;
    }

    setSavingLink(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.post('/driver-motorcycle-links', {
        driverId: selectedDriverId,
        motorcycleId: selectedMotorcycle.id,
      });

      setSuccessMessage('Motorista vinculado à mota com sucesso.');
      closeDriverLink();
      await loadData();
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      setErrorMessage(
        Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ?? 'Não foi possível vincular o motorista.',
      );
    } finally {
      setSavingLink(false);
    }
  }

  async function deactivateDriverLink() {
    const activeLink = selectedMotorcycle?.driverLinks?.find(
      (link) => link.isActive,
    );

    if (!activeLink) {
      return;
    }

    setSavingLink(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.patch(
        `/driver-motorcycle-links/${activeLink.id}/deactivate`,
      );

      setSuccessMessage('Motorista desvinculado da mota com sucesso.');
      closeDriverLink();
      await loadData();
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      setErrorMessage(
        Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ?? 'Não foi possível desvincular o motorista.',
      );
    } finally {
      setSavingLink(false);
    }
  }

  function openEditForm(
    motorcycle: Motorcycle,
  ) {
    setEditingMotorcycleId(
      motorcycle.id,
    );

    setForm({
      ownerId:
        motorcycle.ownerId ?? '',
      type: motorcycle.type,
      brand: motorcycle.brand ?? '',
      model: motorcycle.model ?? '',
      color: motorcycle.color ?? '',
      chassisNumber:
        motorcycle.chassisNumber ?? '',
      engineNumber:
        motorcycle.engineNumber ?? '',
      plateNumber:
        motorcycle.plateNumber ?? '',
    });

    setPhotoFile(null);
    setDocumentFile(null);
    setErrorMessage('');
    setSuccessMessage('');
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditingMotorcycleId(null);
    setForm(initialForm);
    setPhotoFile(null);
    setDocumentFile(null);
    setErrorMessage('');
  }

  if (loading) {
    return (
      <p className="text-slate-500">
        Carregando motas...
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Motas
          </h1>

          <p className="text-slate-500">
            Cadastro e gestão das motas do
            sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              setEditingMotorcycleId(null);
              setForm(initialForm);
              setPhotoFile(null);
              setDocumentFile(null);
              setShowForm(true);
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          {showForm
            ? 'Fechar'
            : 'Nova Mota'}
        </button>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div className="md:col-span-2 xl:col-span-3">
            <h2 className="text-xl font-bold text-slate-900">
              {editingMotorcycleId
                ? 'Editar mota'
                : 'Cadastrar nova mota'}
            </h2>

            {editingMotorcycleId && (
              <p className="mt-1 text-sm text-slate-500">
                Foto e documento são opcionais. Selecione novos arquivos somente para substituí-los.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              Proprietário
            </label>

            <select
              value={form.ownerId}
              onChange={(event) =>
                setForm({
                  ...form,
                  ownerId:
                    event.target.value,
                })
              }
              required
              disabled={submitting}
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
            >
              <option value="">
                Selecione
              </option>

              {owners.map((owner) => (
                <option
                  key={owner.id}
                  value={owner.id}
                >
                  {owner.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Tipo
            </label>

            <select
              value={form.type}
              onChange={(event) =>
                setForm({
                  ...form,
                  type: event.target.value,
                })
              }
              disabled={submitting}
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
            >
              <option value="MOTO_TAXI">
                Moto-táxi
              </option>

              <option value="PARTICULAR">
                Particular
              </option>
            </select>
          </div>

          <Input
            label="Marca"
            value={form.brand}
            onChange={(value) =>
              setForm({
                ...form,
                brand: value,
              })
            }
            required
            disabled={submitting}
          />

          <Input
            label="Modelo"
            value={form.model}
            onChange={(value) =>
              setForm({
                ...form,
                model: value,
              })
            }
            disabled={submitting}
          />

          <Input
            label="Cor"
            value={form.color}
            onChange={(value) =>
              setForm({
                ...form,
                color: value,
              })
            }
            disabled={submitting}
          />

          <Input
            label="Placa"
            value={form.plateNumber}
            onChange={(value) =>
              setForm({
                ...form,
                plateNumber: value,
              })
            }
            required
            disabled={submitting}
          />

          <Input
            label="Chassi"
            value={form.chassisNumber}
            onChange={(value) =>
              setForm({
                ...form,
                chassisNumber: value,
              })
            }
            required
            disabled={submitting}
          />

          <Input
            label="Número do motor"
            value={form.engineNumber}
            onChange={(value) =>
              setForm({
                ...form,
                engineNumber: value,
              })
            }
            disabled={submitting}
          />

          <div className="md:col-span-1">
            <label className="text-sm font-medium">
              Foto da mota
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              required={!editingMotorcycleId}
              disabled={submitting}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              JPG, PNG ou WEBP. Máximo:
              10 MB.
            </p>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">
              Documento da mota
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={
                handleDocumentChange
              }
              required={!editingMotorcycleId}
              disabled={submitting}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-purple-700 hover:file:bg-purple-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              PDF, JPG, PNG ou WEBP.
              Máximo: 10 MB.
            </p>

            {documentFile && (
              <p className="mt-2 break-all text-sm font-medium text-slate-700">
                {documentFile.name}
              </p>
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            {photoPreview && (
              <div className="w-full max-w-xs">
                <p className="mb-2 text-sm font-medium">
                  Pré-visualização da foto
                </p>

                <ClickableImage
                  src={photoPreview}
                  alt="Pré-visualização da mota"
                  title="Pré-visualização da foto da mota"
                  className="h-48 w-full rounded-xl border object-cover"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForm}
              disabled={submitting}
              className="border px-5 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Salvando...'
                : editingMotorcycleId
                  ? 'Atualizar mota'
                  : 'Salvar mota'}
            </button>
          </div>
        </form>
      )}


      {selectedMotorcycle && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                Vincular motorista
              </h2>
              <p className="text-sm text-slate-500">
                {selectedMotorcycle.brand} {selectedMotorcycle.model ?? ''} — placa {selectedMotorcycle.plateNumber}
              </p>

              <label className="mt-4 block text-sm font-medium">
                Motorista
              </label>
              <select
                value={selectedDriverId}
                onChange={(event) => setSelectedDriverId(event.target.value)}
                disabled={savingLink}
                className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
              >
                <option value="">Selecione um motorista</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {getDriverName(driver)}
                    {driver.user?.phone || driver.phone
                      ? ` — ${driver.user?.phone ?? driver.phone}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={closeDriverLink}
                disabled={savingLink}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              {selectedMotorcycle.driverLinks?.some((link) => link.isActive) && (
                <button
                  type="button"
                  onClick={() => void deactivateDriverLink()}
                  disabled={savingLink}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Desvincular atual
                </button>
              )}

              <button
                type="button"
                onClick={() => void saveDriverLink()}
                disabled={savingLink || !selectedDriverId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingLink ? 'Salvando...' : 'Salvar vínculo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b text-left text-slate-500">
              <th className="p-3">
                Foto
              </th>

              <th>Placa</th>
              <th>Código</th>
              <th>Marca/Modelo</th>
              <th>Cor</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Dono</th>
              <th>Documento</th>
              <th>Motoristas</th>
              <th>GPS</th>
              <th>Ocorrências</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {motorcycles.map((moto) => (
              <tr
                key={moto.id}
                className="border-b"
              >
                <td className="p-3">
                  {moto.photoUrl ? (
                    <ClickableImage
                      src={getFileUrl(
                        moto.photoUrl,
                      )}
                      alt={`${moto.brand} ${moto.model ?? ''}`}
                      title={`Foto da mota ${moto.plateNumber}`}
                      className="h-12 w-16 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                      Sem foto
                    </div>
                  )}
                </td>

                <td className="font-bold">
                  {moto.plateNumber}
                </td>

                <td>
                  {moto.nationalCode ?? '—'}
                </td>

                <td>
                  {moto.brand}{' '}
                  {moto.model}
                </td>

                <td>
                  {moto.color ?? '—'}
                </td>

                <td>
                  {MOTORCYCLE_TYPE_LABELS[
                    moto.type as keyof typeof MOTORCYCLE_TYPE_LABELS
                  ] ?? moto.type}
                </td>

                <td>
                  <span
                    className={statusClass(
                      moto.status,
                    )}
                  >
                    {MOTORCYCLE_STATUS_LABELS[
                      moto.status as keyof typeof MOTORCYCLE_STATUS_LABELS
                    ] ?? moto.status}
                  </span>
                </td>

                <td>
                  {moto.owner?.fullName ??
                    '—'}
                </td>

                <td>
                  {moto.documents?.[0]
                    ?.fileUrl ? (
                    <a
                      href={getFileUrl(
                        moto.documents[0]
                          .fileUrl,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Abrir
                    </a>
                  ) : (
                    '—'
                  )}
                </td>

                <td>
                  {moto.driverLinks?.find((link) => link.isActive) ? (
                    <div>
                      <p className="font-medium text-slate-900">
                        {getDriverName(
                          moto.driverLinks.find((link) => link.isActive)?.driver,
                        )}
                      </p>
                      <p className="text-xs text-green-700">Vinculado</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">Sem motorista</span>
                  )}
                </td>

                <td>
                  {moto.gpsDevices
                    ?.length ?? 0}
                </td>

                <td>
                  {moto.theftReports
                    ?.length ?? 0}
                </td>

                <td className="p-3">
                  <div className="flex min-w-[180px] flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(moto)}
                      className="text-left font-medium text-green-700 hover:underline"
                    >
                      Editar dados
                    </button>

                    <button
                      type="button"
                      onClick={() => openDriverLink(moto)}
                      className="text-left font-medium text-blue-600 hover:underline"
                    >
                      {moto.driverLinks?.some((link) => link.isActive)
                        ? 'Trocar motorista'
                        : 'Vincular motorista'}
                    </button>

                    <Link
                      to={`/motorcycles/${moto.id}/360`}
                      className="font-medium text-purple-600 hover:underline"
                    >
                      Visualização 360°
                    </Link>

                    <MotorcycleQrActions
                      qrToken={moto.qrToken}
                      nationalCode={moto.nationalCode}
                      plateNumber={moto.plateNumber}
                    />
                  </div>
                </td>
              </tr>
            ))}

            {!motorcycles.length && (
              <tr>
                <td
                  colSpan={13}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhuma mota
                  cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        disabled={disabled}
        className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
      />
    </div>
  );
}

function getFileUrl(
  fileUrl: string,
) {
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://')
  ) {
    return fileUrl;
  }

  const apiOrigin =
    api.defaults.baseURL?.replace(
      /\/api\/v1\/?$/,
      '',
    ) ??
    'http://localhost:3000';

  return `${apiOrigin}${fileUrl}`;
}

function statusClass(
  status: string,
) {
  const base =
    'px-2 py-1 rounded-full text-xs font-medium';

  if (status === 'ACTIVE') {
    return `${base} bg-green-50 text-green-700`;
  }

  if (
    status === 'ROBBED' ||
    status === 'STOLEN'
  ) {
    return `${base} bg-red-50 text-red-700`;
  }

  if (status === 'RECOVERED') {
    return `${base} bg-blue-50 text-blue-700`;
  }

  return `${base} bg-amber-50 text-amber-700`;
}