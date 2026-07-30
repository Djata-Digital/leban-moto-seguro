import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  Bike,
  FileText,
  Gauge,
  History,
  MapPin,
  Navigation,
  Radio,
  ShieldAlert,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api';
import { ClickableImage } from '../../components/images/ClickableImage';
import { ImageViewer, type ViewerImage } from '../../components/images/ImageViewer';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { IgnitionControlPanel } from '../../components/ignition/IgnitionControlPanel';

type MotorcycleDetails = {
  id: string;
  nationalCode: string;
  plateNumber: string;
  chassisNumber: string;
  engineNumber?: string | null;
  brand: string;
  model?: string | null;
  color?: string | null;
  type: string;
  status: string;
  photoUrl?: string | null;
  createdAt: string;
  documents: Array<{
    id: string;
    type: string;
    fileUrl: string;
    verified: boolean;
    createdAt: string;
  }>;
  gpsDevice?: {
    imei: string;
    simNumber?: string | null;
    provider?: string | null;
    deviceModel?: string | null;
    isActive: boolean;
    hasBackupBattery: boolean;
    lastLocation?: {
      latitude: number;
      longitude: number;
      speed?: number | null;
      battery?: number | null;
      ignitionOn?: boolean | null;
      signalLevel?: number | null;
      recordedAt: string;
    } | null;
  } | null;
  driverLinks: Array<{
    id: string;
    isActive: boolean;
    startDate: string;
    endDate?: string | null;
    driver: {
      id: string;
      fullName: string;
      phone?: string | null;
      photoUrl?: string | null;
      drivingLicenseNumber?: string | null;
    };
  }>;
  theftReports: Array<{
    id: string;
    type: string;
    status: string;
    reportNumber?: string | null;
    reportedAt: string;
    locationText?: string | null;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  policeChecks: Array<{
    id: string;
    result?: string | null;
    locationText?: string | null;
    createdAt: string;
  }>;
};

export function OwnerMotorcycleDetailsPage() {
  const { id } = useParams();
  const [motorcycle, setMotorcycle] = useState<MotorcycleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const response = await api.get(`/owner/motorcycles/${id}`);
        setMotorcycle(response.data?.data ?? response.data);
      } catch (requestError: any) {
        setError(
          requestError?.response?.data?.message ??
            'Não foi possível carregar os dados da mota.',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const images = useMemo<ViewerImage[]>(() => {
    if (!motorcycle) return [];
    const items: ViewerImage[] = [];
    const photo = resolveMediaUrl(motorcycle.photoUrl);
    if (photo) {
      items.push({ src: photo, title: `Mota ${motorcycle.plateNumber}`, description: 'Foto principal' });
    }
    motorcycle.documents.forEach((document) => {
      const url = resolveMediaUrl(document.fileUrl);
      if (url && !url.toLowerCase().endsWith('.pdf')) {
        items.push({ src: url, title: document.type, description: 'Documento da mota' });
      }
    });
    return items;
  }, [motorcycle]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-white" />;
  }

  if (error || !motorcycle) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        <AlertTriangle className="mx-auto" size={34} />
        <p className="mt-3 font-semibold">{error || 'Mota não encontrada.'}</p>
        <Link to="/owner/motorcycles" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm">
          Voltar
        </Link>
      </div>
    );
  }

  const location = motorcycle.gpsDevice?.lastLocation ?? null;
  const activeDriver = motorcycle.driverLinks.find((link) => link.isActive)?.driver ?? null;
  const photoUrl = resolveMediaUrl(motorcycle.photoUrl);

  function openImage(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/owner/motorcycles" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft size={18} />
          Minhas motas
        </Link>

        <Link to="/owner/reports/new" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700">
          <ShieldAlert size={18} />
          Comunicar roubo ou furto
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid lg:grid-cols-[360px_1fr]">
          <div className="min-h-72 bg-slate-100">
            {photoUrl ? (
              <ClickableImage
                src={photoUrl}
                alt={`Mota ${motorcycle.plateNumber}`}
                label="Toque para ampliar"
                className="h-full min-h-72 rounded-none border-0"
                onClick={() => openImage(0)}
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center text-slate-400">
                <Bike size={72} />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                  {motorcycle.nationalCode}
                </p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  {motorcycle.plateNumber}
                </h1>
                <p className="mt-1 text-slate-500">
                  {[motorcycle.brand, motorcycle.model].filter(Boolean).join(' ')}
                  {motorcycle.color ? ` • ${motorcycle.color}` : ''}
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {motorcycle.status}
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric icon={Gauge} label="Velocidade" value={location ? `${Math.round(location.speed ?? 0)} km/h` : 'Sem dados'} />
              <Metric icon={Battery} label="Bateria" value={location?.battery != null ? `${Math.round(location.battery)}%` : 'Sem dados'} />
              <Metric icon={Radio} label="GPS" value={motorcycle.gpsDevice?.isActive ? 'Ativo' : 'Inativo'} />
              <Metric icon={Navigation} label="Ignição" value={location?.ignitionOn == null ? 'Sem dados' : location.ignitionOn ? 'Ligada' : 'Desligada'} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/owner/tracking" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                <MapPin size={18} />
                Ver localização
              </Link>
              <Link to="/owner/history" className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <History size={18} />
                Histórico de trajetos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <IgnitionControlPanel motorcycleId={motorcycle.id} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Dados da mota" icon={Bike}>
          <DataGrid items={[
            ['Marca', motorcycle.brand],
            ['Modelo', motorcycle.model ?? '—'],
            ['Cor', motorcycle.color ?? '—'],
            ['Tipo', motorcycle.type],
            ['Chassi', motorcycle.chassisNumber],
            ['Motor', motorcycle.engineNumber ?? '—'],
          ]} />
        </Section>

        <Section title="Rastreador e última posição" icon={Smartphone}>
          {motorcycle.gpsDevice ? (
            <DataGrid items={[
              ['IMEI', motorcycle.gpsDevice.imei],
              ['Operadora', motorcycle.gpsDevice.provider ?? '—'],
              ['Modelo', motorcycle.gpsDevice.deviceModel ?? '—'],
              ['Sinal', location?.signalLevel != null ? `${location.signalLevel}` : '—'],
              ['Latitude', location ? String(location.latitude) : '—'],
              ['Longitude', location ? String(location.longitude) : '—'],
              ['Última comunicação', location ? new Date(location.recordedAt).toLocaleString('pt-BR') : 'Nunca'],
            ]} />
          ) : (
            <EmptyText text="Esta mota ainda não possui rastreador cadastrado." />
          )}
        </Section>

        <Section title="Motorista atual" icon={UserRound}>
          {activeDriver ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                {resolveMediaUrl(activeDriver.photoUrl) ? (
                  <img src={resolveMediaUrl(activeDriver.photoUrl)!} alt={activeDriver.fullName} className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={26} />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900">{activeDriver.fullName}</p>
                <p className="text-sm text-slate-500">{activeDriver.phone ?? 'Telefone não informado'}</p>
                <p className="text-sm text-slate-500">Carta: {activeDriver.drivingLicenseNumber ?? '—'}</p>
              </div>
            </div>
          ) : (
            <EmptyText text="Nenhum motorista está atualmente vinculado à mota." />
          )}
        </Section>

        <Section title="Documentos" icon={FileText}>
          {motorcycle.documents.length ? (
            <div className="space-y-3">
              {motorcycle.documents.map((document) => {
                const url = resolveMediaUrl(document.fileUrl);
                return (
                  <a key={document.id} href={url ?? '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-3 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{document.type}</p>
                      <p className="text-xs text-slate-500">{document.verified ? 'Verificado' : 'Aguardando verificação'}</p>
                    </div>
                    <FileText size={20} className="text-blue-600" />
                  </a>
                );
              })}
            </div>
          ) : (
            <EmptyText text="Nenhum documento cadastrado para esta mota." />
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Ocorrências" icon={ShieldAlert}>
          {motorcycle.theftReports.length ? (
            <Timeline items={motorcycle.theftReports.map((report) => ({
              id: report.id,
              title: `${report.type} • ${report.status}`,
              description: report.reportNumber ?? report.locationText ?? 'Ocorrência registrada',
              date: report.reportedAt,
            }))} />
          ) : (
            <EmptyText text="Nenhuma ocorrência registrada." />
          )}
        </Section>

        <Section title="Atividade recente" icon={AlertTriangle}>
          {motorcycle.alerts.length || motorcycle.policeChecks.length ? (
            <Timeline items={[
              ...motorcycle.alerts.map((alert) => ({ id: alert.id, title: alert.title, description: alert.message, date: alert.createdAt })),
              ...motorcycle.policeChecks.map((check) => ({ id: check.id, title: 'Consulta policial', description: check.result ?? check.locationText ?? 'Consulta registrada', date: check.createdAt })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)} />
          ) : (
            <EmptyText text="Ainda não existe atividade registrada." />
          )}
        </Section>
      </div>

      <ImageViewer images={images} initialIndex={viewerIndex} open={viewerOpen} onClose={() => setViewerOpen(false)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><Icon size={20} className="text-blue-600" /><p className="mt-2 text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Bike; children: React.ReactNode }) {
  return <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={20} /></div><h2 className="font-bold text-slate-900">{title}</h2></div>{children}</section>;
}

function DataGrid({ items }: { items: Array<[string, string]> }) {
  return <div className="grid grid-cols-2 gap-3">{items.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p></div>)}</div>;
}

function Timeline({ items }: { items: Array<{ id: string; title: string; description: string; date: string }> }) {
  return <div className="space-y-4">{items.map((item) => <div key={item.id} className="border-l-2 border-blue-200 pl-4"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.description}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.date).toLocaleString('pt-BR')}</p></div>)}</div>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>;
}
