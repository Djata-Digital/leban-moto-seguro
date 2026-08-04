import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
} from 'react-router-dom';

import {
  MOTORCYCLE_STATUS_LABELS,
  MOTORCYCLE_TYPE_LABELS,
} from '@leban/shared';

import { api } from '../../api/api';

type VerificationData = {
  registered: boolean;
  nationalCode: string;
  plateNumber: string;
  brand: string;
  model?: string | null;
  color?: string | null;
  type: string;
  status: string;
  chassisLastDigits: string;
  ownerName: string;
  currentDriverName?: string | null;
  stolen: boolean;

  theftAlert?: {
    status: string;
    reportedAt: string;
  } | null;

  updatedAt: string;
};

export function VerifyMotorcyclePage() {
  const { token } = useParams<{
    token: string;
  }>();

  const [
    motorcycle,
    setMotorcycle,
  ] = useState<VerificationData | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  useEffect(() => {
    async function verifyMotorcycle() {
      if (!token) {
        setErrorMessage(
          'QR Code inválido.',
        );

        setLoading(false);
        return;
      }

      try {
        const response =
          await api.get(
            `/public/motorcycles/${token}`,
          );

        setMotorcycle(
          response.data.data ??
            response.data,
        );
      } catch (error: any) {
        console.error(error);

        setErrorMessage(
          error?.response?.data?.message ||
            'QR Code inválido ou mota não encontrada.',
        );
      } finally {
        setLoading(false);
      }
    }

    void verifyMotorcycle();
  }, [token]);

  if (loading) {
    return (
      <PublicPageContainer>
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">
            Verificando a mota...
          </p>
        </div>
      </PublicPageContainer>
    );
  }

  if (
    errorMessage ||
    !motorcycle
  ) {
    return (
      <PublicPageContainer>
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">
            ❌
          </div>

          <h1 className="mt-4 text-2xl font-bold text-red-700">
            Mota não encontrada
          </h1>

          <p className="mt-2 text-slate-600">
            {errorMessage}
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Confirme se o QR Code é
            verdadeiro e tente novamente.
          </p>
        </div>
      </PublicPageContainer>
    );
  }

  return (
    <PublicPageContainer>
      <div
        className={`rounded-2xl border-2 bg-white shadow-lg ${
          motorcycle.stolen
            ? 'border-red-600'
            : 'border-green-600'
        }`}
      >
        <div
          className={`rounded-t-xl p-6 text-center text-white ${
            motorcycle.stolen
              ? 'bg-red-600'
              : 'bg-green-600'
          }`}
        >
          <div className="text-5xl">
            {motorcycle.stolen
              ? '🚨'
              : '✅'}
          </div>

          <h1 className="mt-3 text-2xl font-bold">
            {motorcycle.stolen
              ? 'ALERTA DE ROUBO'
              : 'MOTA REGISTRADA'}
          </h1>

          <p className="mt-1 text-sm">
            LEBAN Moto Seguro
          </p>
        </div>

        <div className="p-6">
          {motorcycle.stolen && (
            <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4">
              <p className="font-bold text-red-800">
                Esta mota possui uma
                ocorrência ativa de roubo ou
                furto.
              </p>

              <p className="mt-2 text-sm text-red-700">
                Não confronte o condutor.
                Acione imediatamente as
                autoridades competentes.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Information
              label="Código Nacional"
              value={
                motorcycle.nationalCode
              }
              important
            />

            <Information
              label="Placa"
              value={
                motorcycle.plateNumber
              }
              important
            />

            <Information
              label="Marca"
              value={motorcycle.brand}
            />

            <Information
              label="Modelo"
              value={
                motorcycle.model ?? '—'
              }
            />

            <Information
              label="Cor"
              value={
                motorcycle.color ?? '—'
              }
            />

            <Information
              label="Tipo"
              value={
                MOTORCYCLE_TYPE_LABELS[
                  motorcycle.type as keyof typeof MOTORCYCLE_TYPE_LABELS
                ] ?? motorcycle.type
              }
            />

            <Information
              label="Situação"
              value={
                MOTORCYCLE_STATUS_LABELS[
                  motorcycle.status as keyof typeof MOTORCYCLE_STATUS_LABELS
                ] ?? motorcycle.status
              }
            />

            <Information
              label="Últimos dígitos do chassi"
              value={
                motorcycle.chassisLastDigits
              }
            />

            <Information
              label="Proprietário"
              value={
                motorcycle.ownerName
              }
            />

            <Information
              label="Motorista atual"
              value={
                motorcycle.currentDriverName ??
                'Nenhum motorista vinculado'
              }
            />
          </div>

          <div className="mt-6 border-t pt-4 text-center">
            <p className="text-xs text-slate-500">
              Última atualização:{' '}
              {formatDate(
                motorcycle.updatedAt,
              )}
            </p>

            <p className="mt-2 text-xs font-medium text-slate-600">
              Dados consultados diretamente
              no sistema LEBAN Moto Seguro.
            </p>
          </div>
        </div>
      </div>
    </PublicPageContainer>
  );
}

function Information({
  label,
  value,
  important,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 ${
          important
            ? 'text-xl font-bold text-slate-900'
            : 'font-semibold text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PublicPageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black text-slate-900">
            LEBAN MOTO SEGURO
          </h2>

          <p className="text-sm text-slate-500">
            Consulta pública de registo de
            motas
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}