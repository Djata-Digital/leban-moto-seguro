import {
  AlertTriangle,
  Battery,
  Bike,
  ChevronRight,
  MapPin,
  Radio,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type LastLocation = {
  latitude: number;
  longitude: number;
  speed?: number | null;
  battery?: number | null;
  ignitionOn?: boolean | null;
  signalLevel?: number | null;
  recordedAt: string;
};

type OwnerMotorcycle = {
  id: string;
  nationalCode: string;
  plateNumber: string;
  brand: string;
  model?: string | null;
  color?: string | null;
  type: string;
  status: string;
  photoUrl?: string | null;
  gpsDevice?: {
    id: string;
    isActive: boolean;
    provider?: string | null;
    deviceModel?: string | null;
    lastLocation?: LastLocation | null;
  } | null;
  currentDriver?: {
    id: string;
    fullName: string;
    phone?: string | null;
    photoUrl?: string | null;
  } | null;
  latestTheftReport?: {
    status: string;
    reportNumber?: string | null;
  } | null;
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  STOLEN: 'Furtada',
  ROBBED: 'Roubada',
  RECOVERED: 'Recuperada',
  INVESTIGATION: 'Em investigação',
  BLOCKED: 'Bloqueada',
};

export function OwnerMotorcyclesPage() {
  const [motorcycles, setMotorcycles] = useState<OwnerMotorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMotorcycles() {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/owner/motorcycles');
      setMotorcycles(response.data?.data ?? response.data ?? []);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ??
          'Não foi possível carregar as suas motas.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMotorcycles();
  }, []);

  if (loading) {
    return <MotorcyclesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Minhas motas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte a situação, o rastreador e a última posição de cada mota.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadMotorcycles()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!motorcycles.length && !error ? (
        <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Bike size={30} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Nenhuma mota vinculada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Quando uma mota for vinculada ao seu perfil, ela aparecerá nesta tela.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {motorcycles.map((motorcycle) => (
            <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} />
          ))}
        </div>
      )}
    </div>
  );
}

function MotorcycleCard({ motorcycle }: { motorcycle: OwnerMotorcycle }) {
  const location = motorcycle.gpsDevice?.lastLocation ?? null;
  const photoUrl = resolveMediaUrl(motorcycle.photoUrl);
  const dangerous = ['STOLEN', 'ROBBED', 'BLOCKED', 'INVESTIGATION'].includes(
    motorcycle.status,
  );

  return (
    <Link
      to={`/owner/motorcycles/${motorcycle.id}`}
      className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="grid sm:grid-cols-[210px_1fr]">
        <div className="relative min-h-52 bg-slate-100">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Mota ${motorcycle.plateNumber}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <Bike size={54} />
            </div>
          )}

          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
              dangerous
                ? 'bg-red-600 text-white'
                : 'bg-emerald-500 text-white'
            }`}
          >
            {statusLabels[motorcycle.status] ?? motorcycle.status}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {motorcycle.nationalCode}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {motorcycle.plateNumber}
              </h2>
              <p className="text-sm text-slate-500">
                {[motorcycle.brand, motorcycle.model].filter(Boolean).join(' ')}
                {motorcycle.color ? ` • ${motorcycle.color}` : ''}
              </p>
            </div>
            <ChevronRight className="text-slate-400 transition group-hover:translate-x-1" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <InfoBox
              icon={Radio}
              label="GPS"
              value={motorcycle.gpsDevice?.isActive ? 'Ativo' : 'Sem rastreador ativo'}
            />
            <InfoBox
              icon={Battery}
              label="Bateria"
              value={
                location?.battery != null
                  ? `${Math.round(location.battery)}%`
                  : 'Sem dados'
              }
            />
            <InfoBox
              icon={MapPin}
              label="Movimento"
              value={
                location
                  ? (location.speed ?? 0) > 3
                    ? `${Math.round(location.speed ?? 0)} km/h`
                    : 'Parada'
                  : 'Sem posição'
              }
            />
            <InfoBox
              icon={UserRound}
              label="Motorista"
              value={motorcycle.currentDriver?.fullName ?? 'Não atribuído'}
            />
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Última comunicação:{' '}
            {location?.recordedAt
              ? new Date(location.recordedAt).toLocaleString('pt-BR')
              : 'nunca registrada'}
          </p>
        </div>
      </div>
    </Link>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function MotorcyclesSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-16 rounded-2xl bg-slate-200" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 rounded-3xl bg-white" />
        ))}
      </div>
    </div>
  );
}
