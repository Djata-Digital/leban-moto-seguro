import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

import {
  Bike,
  Camera,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { api } from '../../api/api';
import { getStoredUser } from '../../auth/auth';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type OwnerDocument = {
  id: string;
  type: string;
  fileUrl: string;
  verified: boolean;
  createdAt: string;
};

type OwnerProfile = {
  id: string;
  fullName: string;
  birthDate?: string | null;
  identityNumber?: string | null;
  phone?: string | null;
  alternativePhone?: string | null;
  email?: string | null;
  nationality?: string | null;
  country?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  status: string;
  createdAt: string;
  documents: OwnerDocument[];
  statistics: { motorcycles: number; alerts: number; incidents: number };
};

type ProfileForm = {
  fullName: string;
  birthDate: string;
  identityNumber: string;
  phone: string;
  alternativePhone: string;
  email: string;
  nationality: string;
  country: string;
  address: string;
  photoUrl: string;
};

const emptyForm: ProfileForm = {
  fullName: '', birthDate: '', identityNumber: '', phone: '', alternativePhone: '',
  email: '', nationality: '', country: '', address: '', photoUrl: '',
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

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    IDENTITY: 'Documento de identidade', PURCHASE_PROOF: 'Comprovante de compra',
    RESIDENCE_PROOF: 'Comprovante de residência', OTHER: 'Outro documento',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

export function OwnerProfilePage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadProfile() {
    setLoading(true); setError('');
    try {
      const data = unwrap<OwnerProfile>(await api.get('/owner/profile'));
      setProfile(data);
      setForm({
        fullName: data.fullName ?? '',
        birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
        identityNumber: data.identityNumber ?? '', phone: data.phone ?? '',
        alternativePhone: data.alternativePhone ?? '', email: data.email ?? '',
        nationality: data.nationality ?? '', country: data.country ?? '',
        address: data.address ?? '', photoUrl: data.photoUrl ?? '',
      });
    } catch (err) { setError(messageFrom(err, 'Não foi possível carregar o perfil.')); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadProfile(); }, []);

  const memberSince = useMemo(() => profile ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt)) : '', [profile]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const updated = unwrap<OwnerProfile>(await api.patch('/owner/profile', form));
      setProfile(updated);
      const stored = getStoredUser() ?? {};
      localStorage.setItem('user', JSON.stringify({ ...stored, fullName: updated.fullName, email: updated.email, phone: updated.phone }));
      window.dispatchEvent(new Event('owner-profile-updated'));
      setNotice('Perfil atualizado com sucesso.');
    } catch (err) { setError(messageFrom(err, 'Não foi possível atualizar o perfil.')); }
    finally { setSaving(false); }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida.'); return; }
    setUploading(true); setError(''); setNotice('');
    try {
      const data = new FormData(); data.append('file', file);
      const uploaded = unwrap<{ url: string }>(await api.post('/uploads/owners/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }));
      update('photoUrl', uploaded.url);
      const updated = unwrap<OwnerProfile>(await api.patch('/owner/profile', { ...form, photoUrl: uploaded.url }));
      setProfile(updated); setNotice('Fotografia atualizada com sucesso.');
    } catch (err) { setError(messageFrom(err, 'Não foi possível enviar a fotografia.')); }
    finally { setUploading(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    if (newPassword.length < 8) { setError('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('A confirmação da nova senha não confere.'); return; }
    setChangingPassword(true);
    try {
      await api.post('/owner/profile/change-password', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setNotice('Senha alterada com sucesso.');
    } catch (err) { setError(messageFrom(err, 'Não foi possível alterar a senha.')); }
    finally { setChangingPassword(false); }
  }

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><LoaderCircle className="animate-spin text-blue-600" size={34} /></div>;
  if (!profile) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error || 'Perfil não encontrado.'}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Meu perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Mantenha seus dados pessoais e de segurança atualizados.</p>
      </div>

      {(notice || error) && <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{error || notice}</div>}

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-blue-950 px-6 py-7 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0">
              {form.photoUrl ? <img src={resolveMediaUrl(form.photoUrl) ?? undefined} alt={profile.fullName} className="h-28 w-28 rounded-3xl border-4 border-white/30 object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white/30 bg-white/15"><UserRound size={48} /></div>}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-lg disabled:opacity-60"><Camera size={19} /></button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{profile.fullName}</h2><span className="rounded-full bg-green-400/20 px-3 py-1 text-xs font-bold text-green-100">{profile.status === 'ACTIVE' ? 'Conta ativa' : profile.status}</span></div>
              <p className="mt-1 text-sm text-blue-100">Proprietário desde {memberSince}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-blue-50">{profile.email && <span className="flex items-center gap-2"><Mail size={16} />{profile.email}</span>}{profile.phone && <span className="flex items-center gap-2"><Phone size={16} />{profile.phone}</span>}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <Stat icon={Bike} value={profile.statistics.motorcycles} label="Motas" />
          <Stat icon={ShieldAlert} value={profile.statistics.alerts} label="Alertas" />
          <Stat icon={FileText} value={profile.statistics.incidents} label="Ocorrências" />
        </div>
      </section>

      <form onSubmit={saveProfile} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><UserRound size={22} /></div><div><h2 className="text-lg font-black text-slate-900">Dados pessoais</h2><p className="text-sm text-slate-500">Informações usadas no cadastro e contato.</p></div></div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nome completo" value={form.fullName} onChange={(v) => update('fullName', v)} required />
          <Field label="Data de nascimento" type="date" value={form.birthDate} onChange={(v) => update('birthDate', v)} />
          <Field label="Documento de identidade" value={form.identityNumber} onChange={(v) => update('identityNumber', v)} />
          <Field label="Nacionalidade" value={form.nationality} onChange={(v) => update('nationality', v)} />
          <Field label="País" value={form.country} onChange={(v) => update('country', v)} />
          <Field label="E-mail" type="email" value={form.email} onChange={(v) => update('email', v)} />
          <Field label="Telefone principal" value={form.phone} onChange={(v) => update('phone', v)} />
          <Field label="Telefone alternativo" value={form.alternativePhone} onChange={(v) => update('alternativePhone', v)} />
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-bold text-slate-700">Endereço</label><textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Bairro, rua, número e cidade" /></div>
        </div>
        <div className="mt-6 flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}Salvar alterações</button></div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-3 text-amber-600"><FileText size={22} /></div><div><h2 className="text-lg font-black text-slate-900">Documentos</h2><p className="text-sm text-slate-500">Documentos associados ao seu cadastro.</p></div></div>
          {profile.documents.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhum documento cadastrado.</div> : <div className="space-y-3">{profile.documents.map((doc) => <a key={doc.id} href={resolveMediaUrl(doc.fileUrl) ?? undefined} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border p-4 transition hover:bg-slate-50"><div className="flex items-center gap-3"><FileText className="text-blue-600" size={20} /><div><p className="font-bold text-slate-800">{documentLabel(doc.type)}</p><p className="text-xs text-slate-500">Enviado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${doc.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{doc.verified ? 'Verificado' : 'Em análise'}</span></a>)}</div>}
        </section>

        <form onSubmit={changePassword} className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-purple-50 p-3 text-purple-600"><KeyRound size={22} /></div><div><h2 className="text-lg font-black text-slate-900">Segurança da conta</h2><p className="text-sm text-slate-500">Altere sua senha de acesso.</p></div></div>
          <div className="space-y-4">
            <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} visible={showPasswords} />
            <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} visible={showPasswords} />
            <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} visible={showPasswords} />
            <button type="button" onClick={() => setShowPasswords((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-600">{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}{showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
          </div>
          <button type="submit" disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">{changingPassword ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}Alterar senha</button>
        </form>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return <div className="p-4 text-center sm:p-5"><Icon className="mx-auto text-blue-600" size={20} /><p className="mt-2 text-2xl font-black text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>;
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div><label className="mb-2 block text-sm font-bold text-slate-700">{label}</label><input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></div>;
}

function PasswordField({ label, value, onChange, visible }: { label: string; value: string; onChange: (value: string) => void; visible: boolean }) {
  return <div><label className="mb-2 block text-sm font-bold text-slate-700">{label}</label><input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100" /></div>;
}
