import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bike,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FileText,
  IdCard,
  LoaderCircle,
  Mail,
  Phone,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { api } from '../../api/api';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type Motorcycle = {
  id: string;
  nationalCode: string;
  plateNumber: string;
  brand: string;
  model?: string | null;
  color?: string | null;
  photoUrl?: string | null;
  status: string;
};

type DriverDocument = {
  id: string;
  type: string;
  fileUrl: string;
  verified: boolean;
  createdAt: string;
};

type DriverHistory = {
  linkId: string;
  motorcycle: Motorcycle;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
};

type OwnerDriver = {
  id: string;
  fullName: string;
  birthDate?: string | null;
  identityNumber?: string | null;
  drivingLicenseNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  country?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  accountStatus: string;
  documents: DriverDocument[];
  activeMotorcycles: Array<Motorcycle & { linkId: string; startDate: string }>;
  history: DriverHistory[];
};

type DriversResponse = {
  totals: {
    drivers: number;
    activeDrivers: number;
    inactiveDrivers: number;
    activeLinks: number;
  };
  drivers: OwnerDriver[];
};

function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as { data?: T };
  return body?.data ?? (response.data as T);
}

function messageFrom(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: string | string[] } } };
  const message = value.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message ?? fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    IDENTITY: 'Documento de identidade',
    DRIVING_LICENSE: 'Carta de condução',
    RESIDENCE_PROOF: 'Comprovante de residência',
    OTHER: 'Outro documento',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

export function OwnerDriversPage() {
  const [data, setData] = useState<DriversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadDrivers() {
    setLoading(true);
    setError('');
    try {
      setData(unwrap<DriversResponse>(await api.get('/owner/drivers')));
    } catch (err) {
      setError(messageFrom(err, 'Não foi possível carregar os motoristas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrivers();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return (data?.drivers ?? []).filter((driver) => {
      const isActive = driver.activeMotorcycles.length > 0;
      if (status === 'ACTIVE' && !isActive) return false;
      if (status === 'INACTIVE' && isActive) return false;
      if (!normalized) return true;
      const motorcycleText = driver.history
        .map((item) => `${item.motorcycle.plateNumber} ${item.motorcycle.nationalCode} ${item.motorcycle.brand} ${item.motorcycle.model ?? ''}`)
        .join(' ');
      return `${driver.fullName} ${driver.phone ?? ''} ${driver.email ?? ''} ${driver.identityNumber ?? ''} ${driver.drivingLicenseNumber ?? ''} ${motorcycleText}`
        .toLocaleLowerCase('pt-BR')
        .includes(normalized);
    });
  }, [data, query, status]);

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><LoaderCircle className="animate-spin text-blue-600" size={36} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Motoristas autorizados</h1>
        <p className="mt-1 text-sm text-slate-500">Consulte os motoristas vinculados às suas motas e o histórico de utilização.</p>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={UsersRound} label="Motoristas" value={data?.totals.drivers ?? 0} />
        <Summary icon={BadgeCheck} label="Ativos" value={data?.totals.activeDrivers ?? 0} />
        <Summary icon={UserRound} label="Sem vínculo ativo" value={data?.totals.inactiveDrivers ?? 0} />
        <Summary icon={Bike} label="Vínculos ativos" value={data?.totals.activeLinks ?? 0} />
      </div>

      <section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Pesquisar por nome, telefone, documento ou mota" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-12 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option value="ALL">Todos os vínculos</option>
            <option value="ACTIVE">Com vínculo ativo</option>
            <option value="INACTIVE">Sem vínculo ativo</option>
          </select>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-white px-6 py-16 text-center">
          <UsersRound className="mx-auto text-slate-300" size={44} />
          <h2 className="mt-4 text-lg font-black text-slate-800">Nenhum motorista encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">Não há motoristas correspondentes aos filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((driver) => {
            const active = driver.activeMotorcycles.length > 0;
            const expanded = expandedId === driver.id;
            const photo = driver.photoUrl ? resolveMediaUrl(driver.photoUrl) : undefined;
            return (
              <article key={driver.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 gap-4">
                      {photo ? <img src={photo ?? undefined} alt={driver.fullName} className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><UserRound size={34} /></div>}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-xl font-black text-slate-900">{driver.fullName}</h2>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Autorizado' : 'Sem vínculo ativo'}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          {driver.phone && <span className="flex items-center gap-2"><Phone size={16} />{driver.phone}</span>}
                          {driver.email && <span className="flex items-center gap-2"><Mail size={16} />{driver.email}</span>}
                          {driver.drivingLicenseNumber && <span className="flex items-center gap-2"><IdCard size={16} />Carta: {driver.drivingLicenseNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <button type="button" onClick={() => setExpandedId(expanded ? null : driver.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {active && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {driver.activeMotorcycles.map((motorcycle) => (
                        <div key={motorcycle.linkId} className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="rounded-xl bg-white p-3 text-green-700"><Bike size={21} /></div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900">{motorcycle.plateNumber}</p>
                            <p className="truncate text-sm text-slate-600">{motorcycle.brand} {motorcycle.model ?? ''} · {motorcycle.nationalCode}</p>
                            <p className="mt-1 text-xs font-semibold text-green-700">Vinculado desde {formatDate(motorcycle.startDate)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="border-t bg-slate-50 p-5 sm:p-6">
                    <div className="grid gap-6 xl:grid-cols-3">
                      <section className="rounded-2xl border bg-white p-5">
                        <h3 className="font-black text-slate-900">Dados do motorista</h3>
                        <dl className="mt-4 space-y-3 text-sm">
                          <Info label="Nascimento" value={formatDate(driver.birthDate)} />
                          <Info label="Identidade" value={driver.identityNumber ?? '—'} />
                          <Info label="Carta de condução" value={driver.drivingLicenseNumber ?? '—'} />
                          <Info label="Nacionalidade" value={driver.nationality ?? '—'} />
                          <Info label="País" value={driver.country ?? '—'} />
                          <Info label="Endereço" value={driver.address ?? '—'} />
                        </dl>
                      </section>

                      <section className="rounded-2xl border bg-white p-5">
                        <h3 className="font-black text-slate-900">Documentos</h3>
                        <div className="mt-4 space-y-3">
                          {driver.documents.length === 0 ? <p className="text-sm text-slate-500">Nenhum documento cadastrado.</p> : driver.documents.map((document) => {
                            const href = resolveMediaUrl(document.fileUrl);
                            return <a key={document.id} href={href ?? undefined} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-3 transition hover:bg-slate-50"><span className="flex items-center gap-2 text-sm font-bold text-slate-700"><FileText size={17} className="text-blue-600" />{documentLabel(document.type)}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${document.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{document.verified ? 'Verificado' : 'Em análise'}</span></a>;
                          })}
                        </div>
                      </section>

                      <section className="rounded-2xl border bg-white p-5">
                        <h3 className="font-black text-slate-900">Histórico de vínculos</h3>
                        <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
                          {driver.history.map((item) => <div key={item.linkId} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-800">{item.motorcycle.plateNumber}</p><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Ativo' : 'Encerrado'}</span></div><p className="mt-1 text-xs text-slate-500">{item.motorcycle.brand} {item.motorcycle.model ?? ''}</p><p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-600"><CalendarDays size={14} />{formatDate(item.startDate)} até {item.isActive ? 'hoje' : formatDate(item.endDate)}</p></div>)}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={22} /></div><div><p className="text-2xl font-black text-slate-900">{value}</p><p className="text-sm text-slate-500">{label}</p></div></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-700">{value}</dd></div>;
}
