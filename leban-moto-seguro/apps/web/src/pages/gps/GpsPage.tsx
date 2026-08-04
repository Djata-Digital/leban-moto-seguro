import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  BatteryCharging,
  Cpu,
  Pencil,
  Plus,
  Radio,
  Router,
  Search,
  Signal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../../api/api';

type Owner = {
  id: string;
  fullName: string;
  phone?: string;
};

type Motorcycle = {
  id: string;
  plateNumber: string;
  nationalCode: string;
  brand: string;
  model?: string;
  owner?: Owner;
};

type GpsLocation = {
  id: string;
  recordedAt: string;
  battery?: number | null;
  signalLevel?: number | null;
};

type GpsDevice = {
  id: string;
  motorcycleId: string;
  imei: string;
  simNumber?: string | null;
  iccid?: string | null;
  provider?: string | null;
  apn?: string | null;
  deviceModel?: string | null;
  firmwareVersion?: string | null;
  isActive: boolean;
  hasBackupBattery: boolean;
  lastCommunicationAt?: string | null;
  batteryLevel?: number | null;
  signalStrength?: number | null;
  motorcycle: Motorcycle;
  locations?: GpsLocation[];
};

type DeviceForm = {
  motorcycleId: string;
  imei: string;
  simNumber: string;
  iccid: string;
  provider: string;
  apn: string;
  deviceModel: string;
  firmwareVersion: string;
  hasBackupBattery: boolean;
};

const emptyForm: DeviceForm = {
  motorcycleId: '',
  imei: '',
  simNumber: '',
  iccid: '',
  provider: '',
  apn: '',
  deviceModel: '',
  firmwareVersion: '',
  hasBackupBattery: true,
};

function extractData<T>(response: { data: any }): T {
  return (response.data?.data ?? response.data) as T;
}

function errorMessage(error: any) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? 'Não foi possível concluir a operação.';
}

function isOnline(device: GpsDevice) {
  if (!device.isActive || !device.lastCommunicationAt) return false;
  const elapsed = Date.now() - new Date(device.lastCommunicationAt).getTime();
  return elapsed <= 10 * 60 * 1000;
}

function formatDate(value?: string | null) {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatLevel(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

export function GpsPage() {
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [devicesResponse, motorcyclesResponse] = await Promise.all([
        api.get('/gps/devices'),
        api.get('/motorcycles'),
      ]);
      setDevices(extractData<GpsDevice[]>(devicesResponse));
      setMotorcycles(extractData<Motorcycle[]>(motorcyclesResponse));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredDevices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return devices;
    return devices.filter((device) =>
      [
        device.imei,
        device.iccid,
        device.simNumber,
        device.provider,
        device.deviceModel,
        device.motorcycle?.plateNumber,
        device.motorcycle?.nationalCode,
        device.motorcycle?.owner?.fullName,
      ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [devices, search]);

  const summary = useMemo(() => ({
    total: devices.length,
    active: devices.filter((item) => item.isActive).length,
    online: devices.filter(isOnline).length,
    offline: devices.filter((item) => item.isActive && !isOnline(item)).length,
  }), [devices]);

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function startEdit(device: GpsDevice) {
    setEditingId(device.id);
    setForm({
      motorcycleId: device.motorcycleId,
      imei: device.imei,
      simNumber: device.simNumber ?? '',
      iccid: device.iccid ?? '',
      provider: device.provider ?? '',
      apn: device.apn ?? '',
      deviceModel: device.deviceModel ?? '',
      firmwareVersion: device.firmwareVersion ?? '',
      hasBackupBattery: device.hasBackupBattery,
    });
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        imei: form.imei.trim(),
        simNumber: form.simNumber.trim(),
        iccid: form.iccid.trim(),
        provider: form.provider.trim(),
        apn: form.apn.trim(),
        deviceModel: form.deviceModel.trim(),
        firmwareVersion: form.firmwareVersion.trim(),
      };

      if (editingId) {
        await api.patch(`/gps/devices/${editingId}`, payload);
      } else {
        await api.post('/gps/devices', payload);
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(device: GpsDevice) {
    const verb = device.isActive ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${verb} o GPS IMEI ${device.imei}?`)) return;

    setActionId(device.id);
    setError('');
    try {
      await api.patch(
        `/gps/devices/${device.id}/${device.isActive ? 'deactivate' : 'activate'}`,
      );
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dispositivos GPS</h1>
          <p className="text-slate-500">
            Cadastro, instalação e acompanhamento dos rastreadores das motas.
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : startCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Fechar' : 'Novo dispositivo'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Cadastrados" value={summary.total} icon={<Router size={20} />} />
        <SummaryCard label="Ativos" value={summary.active} icon={<Radio size={20} />} />
        <SummaryCard label="Online" value={summary.online} icon={<Wifi size={20} />} />
        <SummaryCard label="Offline" value={summary.offline} icon={<WifiOff size={20} />} />
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? 'Editar dispositivo GPS' : 'Cadastrar dispositivo GPS'}
            </h2>
            <p className="text-sm text-slate-500">
              Informe os dados do equipamento, chip e mota onde será instalado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Mota vinculada" required>
              <select
                value={form.motorcycleId}
                onChange={(e) => setForm({ ...form, motorcycleId: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Selecione uma mota</option>
                {motorcycles.map((moto) => (
                  <option key={moto.id} value={moto.id}>
                    {moto.plateNumber} — {moto.brand} {moto.model ?? ''}
                  </option>
                ))}
              </select>
            </Field>
            <TextField label="IMEI" value={form.imei} required placeholder="Ex.: 864895060123456" onChange={(imei) => setForm({ ...form, imei })} />
            <TextField label="Modelo do GPS" value={form.deviceModel} placeholder="Ex.: GT06N" onChange={(deviceModel) => setForm({ ...form, deviceModel })} />
            <TextField label="Operadora" value={form.provider} placeholder="Ex.: Orange" onChange={(provider) => setForm({ ...form, provider })} />
            <TextField label="Número do chip" value={form.simNumber} placeholder="Ex.: +245 955 000 000" onChange={(simNumber) => setForm({ ...form, simNumber })} />
            <TextField label="ICCID do chip" value={form.iccid} placeholder="Número impresso no SIM" onChange={(iccid) => setForm({ ...form, iccid })} />
            <TextField label="APN" value={form.apn} placeholder="Ex.: internet" onChange={(apn) => setForm({ ...form, apn })} />
            <TextField label="Versão do firmware" value={form.firmwareVersion} placeholder="Ex.: 1.0.3" onChange={(firmwareVersion) => setForm({ ...form, firmwareVersion })} />
            <Field label="Bateria de reserva">
              <label className="mt-2 flex h-10 items-center gap-3 rounded-lg border px-3">
                <input
                  type="checkbox"
                  checked={form.hasBackupBattery}
                  onChange={(e) => setForm({ ...form, hasBackupBattery: e.target.checked })}
                />
                <span className="text-sm">O equipamento possui bateria interna</span>
              </label>
            </Field>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar GPS'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Equipamentos cadastrados</h2>
            <p className="text-sm text-slate-500">Online considera comunicação recebida nos últimos 10 minutos.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar IMEI, mota ou proprietário"
              className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-500">Carregando dispositivos...</p>
        ) : filteredDevices.length === 0 ? (
          <div className="p-10 text-center">
            <Router className="mx-auto mb-3 text-slate-300" size={42} />
            <p className="font-medium text-slate-700">Nenhum dispositivo encontrado</p>
            <p className="text-sm text-slate-500">Cadastre o primeiro GPS para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">Chip / rede</th>
                  <th className="px-4 py-3">Mota e proprietário</th>
                  <th className="px-4 py-3">Telemetria</th>
                  <th className="px-4 py-3">Última comunicação</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDevices.map((device) => {
                  const online = isOnline(device);
                  return (
                    <tr key={device.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${online ? 'bg-green-100 text-green-700' : device.isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                          <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : device.isActive ? 'bg-amber-500' : 'bg-slate-500'}`} />
                          {online ? 'Online' : device.isActive ? 'Offline' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{device.deviceModel || 'Modelo não informado'}</p>
                        <p className="font-mono text-xs text-slate-600">IMEI: {device.imei}</p>
                        <p className="text-xs text-slate-500">Firmware: {device.firmwareVersion || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">{device.provider || 'Operadora não informada'}</p>
                        <p className="text-xs text-slate-600">Chip: {device.simNumber || '—'}</p>
                        <p className="text-xs text-slate-500">ICCID: {device.iccid || '—'}</p>
                        <p className="text-xs text-slate-500">APN: {device.apn || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{device.motorcycle?.plateNumber}</p>
                        <p className="text-xs text-slate-600">{device.motorcycle?.brand} {device.motorcycle?.model}</p>
                        <p className="mt-1 text-xs text-slate-500">{device.motorcycle?.owner?.fullName || 'Proprietário não informado'}</p>
                      </td>
                      <td className="px-4 py-4 space-y-1">
                        <p className="flex items-center gap-2"><BatteryCharging size={15} className="text-slate-400" /> Bateria: {formatLevel(device.batteryLevel)}</p>
                        <p className="flex items-center gap-2"><Signal size={15} className="text-slate-400" /> Sinal: {formatLevel(device.signalStrength)}</p>
                        <p className="flex items-center gap-2"><Cpu size={15} className="text-slate-400" /> Reserva: {device.hasBackupBattery ? 'Sim' : 'Não'}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(device.lastCommunicationAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-32 flex-col gap-2">
                          <button onClick={() => startEdit(device)} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
                            <Pencil size={15} /> Editar
                          </button>
                          <button
                            disabled={actionId === device.id}
                            onClick={() => toggleStatus(device)}
                            className={device.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                          >
                            {actionId === device.id ? 'Aguarde...' : device.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <Field label={label} required={required}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </Field>
  );
}
