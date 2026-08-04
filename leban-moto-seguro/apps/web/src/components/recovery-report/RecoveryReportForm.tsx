import { useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

import {
  createRecoveryReport,
  type MotorcycleCondition,
} from '../../api/recoveryReports';
import type { NavigationPosition } from '../police/PoliceNavigationMap';

type Props = {
  dispatchId: string;
  policeOfficerId?: string;
  position?: NavigationPosition | null;
  onCompleted?: () => void;
};

export function RecoveryReportForm({
  dispatchId,
  policeOfficerId,
  position,
  onCompleted,
}: Props) {
  const [motorcycleCondition, setMotorcycleCondition] =
    useState<MotorcycleCondition>('INTACT');
  const [detailedReport, setDetailedReport] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');
  const [keyFound, setKeyFound] = useState(false);
  const [arrestOccurred, setArrestOccurred] = useState(false);
  const [suspectsCount, setSuspectsCount] = useState(0);
  const [confrontation, setConfrontation] = useState(false);
  const [injuredPeople, setInjuredPeople] = useState(false);
  const [ownerPresent, setOwnerPresent] = useState(false);
  const [recoveredObjects, setRecoveredObjects] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (detailedReport.trim().length < 10) {
      setError(
        'Escreva um relatório detalhado com pelo menos 10 caracteres.',
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      await createRecoveryReport({
        dispatchId,
        policeOfficerId,
        motorcycleCondition,
        detailedReport,
        policeReportNumber: policeReportNumber || undefined,
        keyFound,
        arrestOccurred,
        suspectsCount,
        confrontation,
        injuredPeople,
        ownerPresent,
        recoveredObjects: recoveredObjects || undefined,
        latitude: position?.latitude,
        longitude: position?.longitude,
      });

      alert('Recuperação concluída com sucesso.');
      onCompleted?.();
    } catch (submitError: any) {
      const responseMessage =
        submitError?.response?.data?.message;

      setError(
        Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage ||
              'Não foi possível concluir a recuperação.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-green-50 p-4">
      <div>
        <h3 className="font-bold text-slate-900">
          Finalizar recuperação
        </h3>

        <p className="text-sm text-slate-500">
          Preencha o relatório final antes de encerrar a missão.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium">
          Condição da motocicleta
        </label>

        <select
          value={motorcycleCondition}
          onChange={(event) =>
            setMotorcycleCondition(
              event.target.value as MotorcycleCondition,
            )
          }
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="INTACT">Intacta</option>
          <option value="DAMAGED">Danificada</option>
          <option value="DISMANTLED">Desmontada</option>
          <option value="ABANDONED">Abandonada</option>
          <option value="BURNED">Queimada</option>
          <option value="OTHER">Outra situação</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Relatório detalhado
        </label>

        <textarea
          value={detailedReport}
          onChange={(event) =>
            setDetailedReport(event.target.value)
          }
          rows={5}
          maxLength={5000}
          className="mt-1 w-full rounded-lg border px-3 py-2"
          placeholder="Descreva como a mota foi encontrada, condições do local, danos e providências tomadas..."
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Número do boletim de ocorrência
        </label>

        <input
          value={policeReportNumber}
          onChange={(event) =>
            setPoliceReportNumber(event.target.value)
          }
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BooleanField
          label="Chave encontrada"
          value={keyFound}
          onChange={setKeyFound}
        />

        <BooleanField
          label="Houve prisão"
          value={arrestOccurred}
          onChange={setArrestOccurred}
        />

        <BooleanField
          label="Houve confronto"
          value={confrontation}
          onChange={setConfrontation}
        />

        <BooleanField
          label="Houve feridos"
          value={injuredPeople}
          onChange={setInjuredPeople}
        />

        <BooleanField
          label="Proprietário presente"
          value={ownerPresent}
          onChange={setOwnerPresent}
        />

        <div>
          <label className="text-sm font-medium">
            Número de suspeitos
          </label>

          <input
            type="number"
            min={0}
            value={suspectsCount}
            onChange={(event) =>
              setSuspectsCount(Number(event.target.value))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">
          Objetos recuperados
        </label>

        <textarea
          value={recoveredObjects}
          onChange={(event) =>
            setRecoveredObjects(event.target.value)
          }
          rows={3}
          className="mt-1 w-full rounded-lg border px-3 py-2"
          placeholder="Capacete, documentos, telefone, ferramentas..."
        />
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Finalizando...
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Concluir recuperação
          </>
        )}
      </button>
    </div>
  );
}

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-white p-3">
      <span className="text-sm font-medium">{label}</span>

      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}