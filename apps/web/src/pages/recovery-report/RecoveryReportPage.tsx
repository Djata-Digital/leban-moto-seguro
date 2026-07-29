import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Printer,
} from 'lucide-react';
import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  loadRecoveryReport,
  type RecoveryReport,
} from '../../api/recoveryReports';

export function RecoveryReportPage() {
  const { dispatchId } = useParams();

  const [report, setReport] =
    useState<RecoveryReport | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!dispatchId) {
      setError(
        'Despacho não informado.',
      );

      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError('');

        const result =
          await loadRecoveryReport(
            dispatchId!,
          );

        setReport(result);
      } catch (loadError: any) {
        const responseMessage =
          loadError?.response?.data?.message;

        setError(
          Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : responseMessage ||
                'Não foi possível carregar o relatório.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [dispatchId]);

  const dispatch =
    report?.dispatch;

  const motorcycle =
    dispatch?.motorcycle;

  const owner =
    motorcycle?.owner;

  const events = useMemo(
    () =>
      Array.isArray(dispatch?.events)
        ? dispatch.events
        : [],
    [dispatch?.events],
  );

  const messages = useMemo(
    () =>
      Array.isArray(dispatch?.messages)
        ? dispatch.messages
        : [],
    [dispatch?.messages],
  );

  const evidences = useMemo(
    () =>
      Array.isArray(
        dispatch?.recoveryEvidences,
      )
        ? dispatch.recoveryEvidences
        : [],
    [dispatch?.recoveryEvidences],
  );

  if (loading) {
    return (
      <p className="text-slate-500">
        Carregando dossiê...
      </p>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-700">
        {error ||
          'Relatório não encontrado.'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link
          to="/noc"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Voltar para a Central
        </Link>
      </div>

      <div className="print:hidden flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dossiê da recuperação
          </h1>

          <p className="text-sm text-slate-500">
            {dispatch?.code ?? 'Despacho'} —{' '}
            {motorcycle?.plateNumber ??
              'Sem placa'}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            window.print()
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Printer size={17} />
          Imprimir ou salvar PDF
        </button>
      </div>

      <article className="mx-auto max-w-5xl space-y-6 bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b pb-5 text-center">
          <h1 className="text-3xl font-bold text-slate-950">
            LEBAN Moto Seguro
          </h1>

          <p className="mt-1 text-sm uppercase tracking-wider text-slate-500">
            Dossiê de recuperação de motocicleta
          </p>

          <p className="mt-3 text-sm text-slate-600">
            Documento gerado em{' '}
            {new Date().toLocaleString()}
          </p>
        </header>

        <Section title="Identificação do despacho">
          <InfoGrid>
            <Info
              label="Código"
              value={
                dispatch?.code ?? '—'
              }
            />

            <Info
              label="Status"
              value={translateStatus(
                dispatch?.status,
              )}
            />

            <Info
              label="Prioridade"
              value={translatePriority(
                dispatch?.priority,
              )}
            />

            <Info
              label="Concluído em"
              value={formatDate(
                report.completedAt,
              )}
            />
          </InfoGrid>
        </Section>

        <Section title="Motocicleta">
          <InfoGrid>
            <Info
              label="Placa"
              value={
                motorcycle?.plateNumber ??
                '—'
              }
            />

            <Info
              label="Marca"
              value={
                motorcycle?.brand ?? '—'
              }
            />

            <Info
              label="Modelo"
              value={
                motorcycle?.model ?? '—'
              }
            />

            <Info
              label="Cor"
              value={
                motorcycle?.color ?? '—'
              }
            />
          </InfoGrid>
        </Section>

        <Section title="Proprietário">
          <InfoGrid>
            <Info
              label="Nome"
              value={
                owner?.fullName ?? '—'
              }
            />

            <Info
              label="Telefone"
              value={
                owner?.phone ?? '—'
              }
            />
          </InfoGrid>
        </Section>

        <Section title="Policial responsável">
          <InfoGrid>
            <Info
              label="Nome"
              value={
                report.policeOfficer
                  ?.fullName ?? '—'
              }
            />

            <Info
              label="Matrícula"
              value={
                report.policeOfficer
                  ?.badgeNumber ?? '—'
              }
            />

            <Info
              label="Unidade"
              value={
                report.policeOfficer
                  ?.stationName ?? '—'
              }
            />
          </InfoGrid>
        </Section>

        <Section title="Resultado da recuperação">
          <InfoGrid>
            <Info
              label="Condição da mota"
              value={translateCondition(
                report.motorcycleCondition,
              )}
            />

            <Info
              label="Chave encontrada"
              value={yesNo(
                report.keyFound,
              )}
            />

            <Info
              label="Houve prisão"
              value={yesNo(
                report.arrestOccurred,
              )}
            />

            <Info
              label="Número de suspeitos"
              value={String(
                report.suspectsCount,
              )}
            />

            <Info
              label="Houve confronto"
              value={yesNo(
                report.confrontation,
              )}
            />

            <Info
              label="Houve feridos"
              value={yesNo(
                report.injuredPeople,
              )}
            />

            <Info
              label="Proprietário presente"
              value={yesNo(
                report.ownerPresent,
              )}
            />

            <Info
              label="Boletim de ocorrência"
              value={
                report.policeReportNumber ??
                '—'
              }
            />
          </InfoGrid>
        </Section>

        <Section title="Relatório detalhado">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {report.detailedReport}
          </p>
        </Section>

        <Section title="Objetos recuperados">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {report.recoveredObjects ||
              'Nenhum objeto adicional informado.'}
          </p>
        </Section>

        <Section title="Local da conclusão">
          {typeof report.latitude ===
            'number' &&
          typeof report.longitude ===
            'number' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={16} />
                {report.latitude},{' '}
                {report.longitude}
              </p>

              <a
                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline print:hidden"
              >
                Abrir no mapa
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Localização não registrada.
            </p>
          )}
        </Section>

        <Section title="Linha do tempo operacional">
          {events.length ? (
            <div className="space-y-3">
              {events.map(
                (event: any) => (
                  <div
                    key={event.id}
                    className="border-l-2 border-blue-200 pl-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {event.title}
                    </p>

                    <p className="text-sm text-slate-600">
                      {event.description ??
                        'Sem descrição.'}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(
                        event.createdAt,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum evento registrado.
            </p>
          )}
        </Section>

        <Section title="Comunicação operacional">
          {messages.length ? (
            <div className="space-y-3">
              {messages.map(
                (message: any) => (
                  <div
                    key={message.id}
                    className="rounded-lg border bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {message.sender
                          ?.fullName ??
                          translateSender(
                            message.senderType,
                          )}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatDate(
                          message.createdAt,
                        )}
                      </p>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {message.message}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhuma mensagem registrada.
            </p>
          )}
        </Section>

        <Section title="Evidências anexadas">
          {evidences.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {evidences.map(
                (evidence: any) => {
                  const url =
                    resolveFileUrl(
                      evidence.fileUrl,
                    );

                  return (
                    <div
                      key={evidence.id}
                      className="overflow-hidden rounded-xl border"
                    >
                      {evidence.type ===
                      'PHOTO' ? (
                        <img
                          src={url}
                          alt={
                            evidence.originalName ??
                            'Evidência'
                          }
                          className="h-52 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 flex-col items-center justify-center bg-slate-50 p-4 text-center">
                          <FileText
                            size={34}
                            className="text-slate-400"
                          />

                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 text-sm text-blue-600 hover:underline print:text-slate-700"
                          >
                            {evidence.originalName ??
                              'Abrir evidência'}
                          </a>
                        </div>
                      )}

                      <div className="p-3">
                        <p className="text-xs text-slate-500">
                          {formatDate(
                            evidence.createdAt,
                          )}
                        </p>

                        {evidence.notes && (
                          <p className="mt-1 text-sm text-slate-700">
                            {evidence.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhuma evidência anexada.
            </p>
          )}
        </Section>

        <footer className="border-t pt-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <Signature
              label="Policial responsável"
              name={
                report.policeOfficer
                  ?.fullName
              }
            />

            <Signature
              label="Responsável da Central Operacional"
            />
          </div>

          <p className="mt-10 text-center text-xs text-slate-400">
            Documento gerado pelo sistema LEBAN Moto Seguro.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 border-b pb-2 text-lg font-bold text-slate-900">
        {title}
      </h2>

      {children}
    </section>
  );
}

function InfoGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 print:bg-white">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Signature({
  label,
  name,
}: {
  label: string;
  name?: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto h-px w-64 bg-slate-800" />

      <p className="mt-2 text-sm font-medium text-slate-800">
        {name ?? label}
      </p>

      {name && (
        <p className="text-xs text-slate-500">
          {label}
        </p>
      )}
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? 'Sim' : 'Não';
}

function translateCondition(
  value: string,
) {
  if (value === 'INTACT') {
    return 'Intacta';
  }

  if (value === 'DAMAGED') {
    return 'Danificada';
  }

  if (value === 'DISMANTLED') {
    return 'Desmontada';
  }

  if (value === 'ABANDONED') {
    return 'Abandonada';
  }

  if (value === 'BURNED') {
    return 'Queimada';
  }

  return 'Outra situação';
}

function translateStatus(
  value?: string,
) {
  if (!value) return '—';
  if (value === 'RESOLVED') {
    return 'Resolvido';
  }
  if (value === 'RECOVERED') {
    return 'Recuperada';
  }
  if (value === 'CANCELLED') {
    return 'Cancelado';
  }

  return value;
}

function translatePriority(
  value?: string,
) {
  if (!value) return '—';
  if (value === 'CRITICAL') {
    return 'Crítica';
  }
  if (value === 'HIGH') {
    return 'Alta';
  }
  if (value === 'MEDIUM') {
    return 'Média';
  }
  if (value === 'LOW') {
    return 'Baixa';
  }

  return value;
}

function translateSender(
  value?: string,
) {
  if (value === 'CENTRAL') {
    return 'Central Operacional';
  }

  if (value === 'POLICE') {
    return 'Policial';
  }

  return 'Sistema';
}

function formatDate(
  value?: string,
) {
  if (!value) return '—';

  return new Date(
    value,
  ).toLocaleString();
}

function resolveFileUrl(
  fileUrl: string,
) {
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://')
  ) {
    return fileUrl;
  }

  const apiBase =
    import.meta.env.VITE_API_URL ??
    'http://localhost:3000/api/v1';

  const origin = apiBase.replace(
    /\/api\/v1\/?$/,
    '',
  );

  return `${origin}${fileUrl}`;
}