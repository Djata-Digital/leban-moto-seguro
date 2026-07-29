import {
  AlertTriangle,
  Bike,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  Siren,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api';

type ApiResponse<T> = { data: T };

type Motorcycle = {
  id: string;
  plateNumber: string;
  nationalCode?: string | null;
  brand: string;
  model: string;
  color?: string | null;
  photoUrl?: string | null;
  status: string;
};

type IncidentEvent = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

type Incident = {
  id: string;
  type: 'FURTO' | 'ROUBO' | 'DESAPARECIDA';
  status: 'OPEN' | 'INVESTIGATING' | 'RECOVERED' | 'CLOSED';
  description?: string | null;
  reportNumber?: string | null;
  locationText?: string | null;
  occurredAt?: string | null;
  reportedAt: string;
  contactPhone?: string | null;
  driverName?: string | null;
  motorcycle: Motorcycle & {
    gpsDevices?: Array<{
      locations: Array<{
        latitude: number;
        longitude: number;
        speed?: number | null;
        battery?: number | null;
        recordedAt: string;
      }>;
    }>;
  };
  events: IncidentEvent[];
  attachments?: Array<{
    id: string;
    fileUrl: string;
    fileName?: string | null;
  }>;
  _count?: { attachments: number; events: number };
};

const statusText: Record<string, string> = {
  OPEN: 'Aberta',
  INVESTIGATING: 'Em investigação',
  RECOVERED: 'Mota recuperada',
  CLOSED: 'Encerrada',
};

const typeText: Record<string, string> = {
  FURTO: 'Furto',
  ROUBO: 'Roubo',
  DESAPARECIDA: 'Desaparecimento',
};

function formatDate(value?: string | null) {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'RECOVERED' || status === 'CLOSED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (status === 'INVESTIGATING') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  return 'bg-red-50 text-red-700 ring-red-200';
}

export function OwnerReportsPage() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ApiResponse<Incident[]>>('/owner/incidents')
      .then((response) => setItems(response.data.data))
      .catch(() => setError('Não foi possível carregar suas ocorrências.'))
      .finally(() => setLoading(false));
  }, []);

  const active = items.filter((item) => ['OPEN', 'INVESTIGATING'].includes(item.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ocorrências</h1>
          <p className="mt-1 text-sm text-slate-500">Comunique roubo ou furto e acompanhe o atendimento da Central.</p>
        </div>
        <Link to="/owner/reports/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700">
          <Plus size={18} /> Comunicar ocorrência
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Total" value={items.length} icon={FileText} />
        <Summary label="Ativas" value={active} icon={ShieldAlert} />
        <Summary label="Resolvidas" value={items.length - active} icon={CircleCheck} />
      </div>

      {loading && <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Carregando ocorrências...</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
          <Siren className="mx-auto text-slate-400" size={42} />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Nenhuma ocorrência registrada</h2>
          <p className="mt-2 text-sm text-slate-500">Esperamos que continue assim. Em uma emergência, use o botão acima.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Link key={item.id} to={`/owner/reports/${item.id}`} className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle size={23} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{typeText[item.type]} — {item.motorcycle.plateNumber}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(item.status)}`}>{statusText[item.status]}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.motorcycle.brand} {item.motorcycle.model}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><CalendarClock size={15} /> {formatDate(item.occurredAt ?? item.reportedAt)}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {item.locationText || 'Local não informado'}</span>
                </div>
              </div>
              <ChevronRight className="shrink-0 text-slate-400" size={20} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileText }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-slate-600"><Icon size={22} /></div></div></div>;
}

export function OwnerCreateReportPage() {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    motorcycleId: '', type: 'ROUBO', occurredAt: new Date().toISOString().slice(0, 16),
    locationText: '', description: '', driverName: '', contactPhone: '', reportNumber: '',
  });

  useEffect(() => {
    api.get<ApiResponse<Motorcycle[]>>('/owner/motorcycles')
      .then((response) => {
        setMotorcycles(response.data.data);
        if (response.data.data[0]) setForm((current) => ({ ...current, motorcycleId: response.data.data[0].id }));
      })
      .catch(() => setError('Não foi possível carregar suas motas.'));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadResponse = await api.post<ApiResponse<{
            url: string;
            originalName: string;
            mimetype: string;
          }>>('/uploads/theft-reports', uploadData);
          return {
            fileUrl: uploadResponse.data.data.url,
            fileName: uploadResponse.data.data.originalName,
            mimeType: uploadResponse.data.data.mimetype,
          };
        }),
      );

      const response = await api.post<ApiResponse<Incident>>('/owner/incidents', {
        ...form,
        occurredAt: new Date(form.occurredAt).toISOString(),
        attachments,
      });
      navigate(`/owner/reports/${response.data.data.id}`);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Não foi possível registrar a ocorrência.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Comunicar roubo ou furto</h1><p className="mt-1 text-sm text-slate-500">A Central será avisada imediatamente e a situação da mota será atualizada.</p></div>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Importante:</strong> em situação de risco, preserve sua segurança e procure a autoridade policial.</div>
      <form onSubmit={submit} className="space-y-5 rounded-3xl border bg-white p-6 shadow-sm">
        <Field label="Mota"><select required value={form.motorcycleId} onChange={(e) => setForm({ ...form, motorcycleId: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Selecione</option>{motorcycles.map((m) => <option key={m.id} value={m.id}>{m.plateNumber} — {m.brand} {m.model}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="ROUBO">Roubo</option><option value="FURTO">Furto</option><option value="DESAPARECIDA">Desaparecimento</option></select></Field><Field label="Data e hora"><input required type="datetime-local" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field></div>
        <Field label="Local da ocorrência"><input value={form.locationText} onChange={(e) => setForm({ ...form, locationText: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Bairro, rua ou ponto de referência" /></Field>
        <Field label="Descrição"><textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Explique o que aconteceu" /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Condutor no momento"><input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field><Field label="Telefone para contato"><input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field></div>
        <Field label="Fotos ou documentos (opcional)"><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-4 text-sm text-slate-600" />{files.length > 0 && <p className="mt-2 text-xs text-slate-500">{files.length} arquivo(s) selecionado(s). Limite de 10 MB por arquivo.</p>}</Field>
        <Field label="Número do boletim policial (opcional)"><input value={form.reportNumber} onChange={(e) => setForm({ ...form, reportNumber: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/owner/reports" className="rounded-xl border px-5 py-3 text-center text-sm font-semibold text-slate-700">Cancelar</Link><button disabled={submitting || !form.motorcycleId} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Registrando...' : 'Confirmar ocorrência'}</button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}

export function OwnerReportDetailsPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ApiResponse<Incident>>(`/owner/incidents/${id}`)
      .then((response) => setIncident(response.data.data))
      .catch(() => setError('Ocorrência não encontrada.'));
  }, [id]);

  const latest = incident?.motorcycle.gpsDevices?.[0]?.locations?.[0];
  const mapUrl = useMemo(() => latest ? `https://www.google.com/maps?q=${latest.latitude},${latest.longitude}` : '', [latest]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;
  if (!incident) return <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Carregando ocorrência...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Link to="/owner/reports" className="text-sm font-semibold text-blue-600">← Voltar para ocorrências</Link><h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{typeText[incident.type]} — {incident.motorcycle.plateNumber}</h1><p className="mt-1 text-sm text-slate-500">Comunicada em {formatDate(incident.reportedAt)}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${statusClass(incident.status)}`}>{statusText[incident.status]}</span></div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Informações da ocorrência</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Info icon={CalendarClock} label="Data e hora" value={formatDate(incident.occurredAt ?? incident.reportedAt)} /><Info icon={MapPin} label="Local" value={incident.locationText || 'Não informado'} /><Info icon={Bike} label="Mota" value={`${incident.motorcycle.brand} ${incident.motorcycle.model}`} /><Info icon={FileText} label="Boletim policial" value={incident.reportNumber || 'Ainda não informado'} /></dl>{incident.description && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{incident.description}</div>}</section>
          {incident.attachments && incident.attachments.length > 0 && <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Anexos</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{incident.attachments.map((attachment) => <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"><FileText size={18} /><span className="truncate">{attachment.fileName || 'Abrir anexo'}</span></a>)}</div></section>}
          <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Linha do tempo</h2><div className="mt-5 space-y-0">{incident.events.map((event, index) => <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0"><div className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-100" />{index < incident.events.length - 1 && <div className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}<div><p className="font-semibold text-slate-900">{event.title}</p>{event.description && <p className="mt-1 text-sm text-slate-600">{event.description}</p>}<p className="mt-1 text-xs text-slate-400">{formatDate(event.createdAt)}</p></div></div>)}</div></section>
        </div>
        <div className="space-y-5">
          <section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="font-bold text-slate-900">Última localização GPS</h2>{latest ? <><div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm"><p><strong>Latitude:</strong> {latest.latitude.toFixed(6)}</p><p className="mt-1"><strong>Longitude:</strong> {latest.longitude.toFixed(6)}</p><p className="mt-1"><strong>Atualização:</strong> {formatDate(latest.recordedAt)}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"><MapPin size={18} /> Abrir no mapa</a></> : <p className="mt-4 text-sm text-slate-500">O rastreador ainda não enviou uma posição.</p>}</section>
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><Clock3 className="mt-0.5 shrink-0 text-amber-600" size={20} /><div><p className="font-semibold text-amber-900">Acompanhamento ativo</p><p className="mt-1 text-sm leading-6 text-amber-800">As atualizações da Central aparecerão nesta linha do tempo.</p></div></div></section>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Bike; label: string; value: string }) {
  return <div className="flex gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Icon size={18} /></div><div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd></div></div>;
}
