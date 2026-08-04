import type {
  LucideIcon,
} from 'lucide-react';

import {
  CircleUserRound,
  Construction,
  ShieldCheck,
  Siren,
} from 'lucide-react';

import {
  Link,
} from 'react-router-dom';

type OwnerModulePageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  importantAction?: {
    label: string;
    path: string;
  };
};

export function OwnerModulePage({
  title,
  description,
  icon: Icon,
  importantAction,
}: OwnerModulePageProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </div>

      {importantAction && (
        <Link
          to={importantAction.path}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Siren size={18} />
          {importantAction.label}
        </Link>
      )}

      <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Construction size={29} />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Estrutura preparada
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Esta área já está integrada à navegação do
          proprietário. Na próxima etapa serão
          conectados os dados e as funcionalidades
          específicas deste módulo.
        </p>
      </div>
    </div>
  );
}

export function OwnerGeofencesPage() {
  return (
    <OwnerModulePage
      title="Cercas virtuais"
      description="Crie áreas permitidas e receba alertas quando a mota entrar ou sair."
      icon={ShieldCheck}
    />
  );
}

export function OwnerProfilePage() {
  return (
    <OwnerModulePage
      title="Meu perfil"
      description="Atualize seus dados pessoais, contato, fotografia e preferências."
      icon={CircleUserRound}
    />
  );
}

