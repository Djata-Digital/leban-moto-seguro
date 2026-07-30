import { AlertTriangle, LockKeyhole, Power, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/api';

type Command = { id: string; type: string; status: string; reason: string; incidentNumber?: string | null; requestedAt: string; safetyMessage?: string; requestedBy?: { fullName: string; role: string } };

type Props = { motorcycleId: string; policeMode?: boolean; disabled?: boolean };

export function IgnitionControlPanel({ motorcycleId, policeMode = false, disabled = false }: Props) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [reason, setReason] = useState('');
  const [incidentNumber, setIncidentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await api.get(`/ignition-commands/motorcycles/${motorcycleId}`);
      setCommands(response.data?.data ?? response.data ?? []);
    } catch {
      setCommands([]);
    }
  }

  useEffect(() => { void load(); }, [motorcycleId]);

  async function request(action: 'BLOCK_NEXT_START' | 'SAFE_SHUTDOWN' | 'UNBLOCK') {
    if (reason.trim().length < 5) { setError('Informe um motivo com pelo menos 5 caracteres.'); return; }
    if (policeMode && !incidentNumber.trim()) { setError('Informe o número da ocorrência policial.'); return; }
    const labels = { BLOCK_NEXT_START: 'bloquear a próxima partida', SAFE_SHUTDOWN: 'solicitar desligamento seguro', UNBLOCK: 'desbloquear a ignição' };
    if (!window.confirm(`Confirma que deseja ${labels[action]}? O motor nunca será cortado enquanto a mota estiver em movimento.`)) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const response = await api.post(`/ignition-commands/motorcycles/${motorcycleId}`, { action, reason: reason.trim(), incidentNumber: incidentNumber.trim() || undefined });
      const data = response.data?.data ?? response.data;
      setMessage(data?.safetyMessage ?? 'Comando registado com segurança.');
      setReason('');
      await load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? 'Não foi possível registar o comando.');
    } finally { setLoading(false); }
  }

  const pending = commands.find((item) => ['REQUESTED', 'WAITING_FOR_DEVICE', 'WAITING_FOR_STOP', 'SENT'].includes(item.status));

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldCheck size={22} /></div>
        <div><h2 className="font-bold text-slate-900">Controle seguro da ignição</h2><p className="mt-1 text-sm text-slate-600">Bloqueia nova partida ou envia desligamento somente após a mota parar.</p></div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mr-2 inline" size={17} />Nunca ocorre corte imediato do motor em movimento.</div>

      {policeMode && <input value={incidentNumber} onChange={(e) => setIncidentNumber(e.target.value)} placeholder="Número da ocorrência policial" className="mt-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600" />}
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo obrigatório do comando" rows={3} className="mt-3 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600" />

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button disabled={loading || disabled || !!pending} onClick={() => void request('BLOCK_NEXT_START')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white disabled:opacity-40"><LockKeyhole size={18} />Bloquear partida</button>
        <button disabled={loading || disabled || !!pending} onClick={() => void request('SAFE_SHUTDOWN')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-40"><Power size={18} />Desligamento seguro</button>
        <button disabled={loading || disabled || !!pending} onClick={() => void request('UNBLOCK')} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold text-slate-800 disabled:opacity-40"><RotateCcw size={18} />Desbloquear</button>
      </div>

      {message && <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p>}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {pending && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Comando pendente: {formatType(pending.type)} — {formatStatus(pending.status)}</p>}

      {commands.length > 0 && <div className="mt-5 border-t pt-4"><p className="text-xs font-bold uppercase text-slate-500">Últimos comandos</p><div className="mt-2 space-y-2">{commands.slice(0, 5).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong>{formatType(item.type)}</strong><span>{formatStatus(item.status)}</span></div><p className="mt-1 text-slate-600">{item.reason}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.requestedAt).toLocaleString('pt-BR')}</p></div>)}</div></div>}
    </section>
  );
}

function formatType(value: string) { return ({ BLOCK_NEXT_START: 'Bloquear próxima partida', SAFE_SHUTDOWN: 'Desligamento seguro', UNBLOCK: 'Desbloquear ignição' } as Record<string, string>)[value] ?? value; }
function formatStatus(value: string) { return ({ REQUESTED: 'Solicitado', WAITING_FOR_DEVICE: 'Aguardando dispositivo', WAITING_FOR_STOP: 'Aguardando a mota parar', SENT: 'Enviado', CONFIRMED: 'Confirmado', FAILED: 'Falhou', CANCELLED: 'Cancelado', EXPIRED: 'Expirado' } as Record<string, string>)[value] ?? value; }
