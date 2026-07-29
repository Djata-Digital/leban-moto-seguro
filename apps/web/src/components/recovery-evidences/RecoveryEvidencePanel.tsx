import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Camera,
  FileText,
  Image,
  LoaderCircle,
  MapPin,
  Paperclip,
  RefreshCcw,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';

import { socket } from '../../api/socket';
import {
  deleteRecoveryEvidence,
  loadRecoveryEvidences,
  uploadRecoveryEvidences,
  type RecoveryEvidence,
} from '../../api/recoveryEvidences';
import type { NavigationPosition } from '../police/PoliceNavigationMap';

type Props = {
  dispatchId: string;
  policeOfficerId?: string;
  currentPosition?: NavigationPosition | null;
  canUpload?: boolean;
  canDelete?: boolean;
};

export function RecoveryEvidencePanel({
  dispatchId,
  policeOfficerId,
  currentPosition,
  canUpload = false,
  canDelete = false,
}: Props) {
  const [evidences, setEvidences] = useState<
    RecoveryEvidence[]
  >([]);
  const [selectedFiles, setSelectedFiles] = useState<
    File[]
  >([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const result =
        await loadRecoveryEvidences(dispatchId);

      setEvidences(result);
    } catch (loadError) {
      console.error(
        'Erro ao carregar evidências:',
        loadError,
      );

      setError(
        'Não foi possível carregar as evidências.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [dispatchId]);

  useEffect(() => {
    function handleCreated(payload: {
      dispatchId: string;
      evidences: RecoveryEvidence[];
    }) {
      if (payload.dispatchId !== dispatchId) {
        return;
      }

      setEvidences((current) => {
        const ids = new Set(
          current.map((item) => item.id),
        );

        const newItems = payload.evidences.filter(
          (item) => !ids.has(item.id),
        );

        return [
          ...newItems,
          ...current,
        ];
      });
    }

    function handleDeleted(payload: {
      id: string;
      dispatchId: string;
    }) {
      if (payload.dispatchId !== dispatchId) {
        return;
      }

      setEvidences((current) =>
        current.filter(
          (item) => item.id !== payload.id,
        ),
      );
    }

    socket.on(
      'recovery-evidence.created',
      handleCreated,
    );

    socket.on(
      'recovery-evidence.deleted',
      handleDeleted,
    );

    return () => {
      socket.off(
        'recovery-evidence.created',
        handleCreated,
      );

      socket.off(
        'recovery-evidence.deleted',
        handleDeleted,
      );
    };
  }, [dispatchId]);

  const previews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => {
      previews.forEach((item) =>
        URL.revokeObjectURL(item.url),
      );
    };
  }, [previews]);

  function handleFiles(
    fileList: FileList | null,
  ) {
    if (!fileList) {
      return;
    }

    const allowedFiles = Array.from(
      fileList,
    ).filter((file) => {
      return (
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/') ||
        file.type === 'application/pdf'
      );
    });

    if (!allowedFiles.length) {
      setError(
        'Selecione fotos, vídeos, áudios ou PDFs.',
      );
      return;
    }

    setSelectedFiles((current) => [
      ...current,
      ...allowedFiles,
    ].slice(0, 10));
  }

  function removeSelectedFile(
    index: number,
  ) {
    setSelectedFiles((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  }

  async function submit() {
    if (!selectedFiles.length) {
      setError(
        'Selecione pelo menos um arquivo.',
      );
      return;
    }

    try {
      setUploading(true);
      setError('');

      await uploadRecoveryEvidences({
        dispatchId,
        policeOfficerId,
        files: selectedFiles,
        notes,
        latitude:
          currentPosition?.latitude,
        longitude:
          currentPosition?.longitude,
      });

      setSelectedFiles([]);
      setNotes('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await load();
    } catch (uploadError: any) {
        console.error(
            'Erro ao enviar evidências:',
            uploadError,
        );

        const responseMessage =
            uploadError?.response?.data?.message;

        const message = Array.isArray(responseMessage)
            ? responseMessage.join(', ')
            : responseMessage;

        setError(
            message ||
            'Não foi possível enviar as evidências.',
        );
        } finally {
        setUploading(false);
        }
  }

  async function removeEvidence(
    evidenceId: string,
  ) {
    const confirmed = window.confirm(
      'Deseja remover esta evidência?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(evidenceId);

      await deleteRecoveryEvidence(
        evidenceId,
      );

      setEvidences((current) =>
        current.filter(
          (item) => item.id !== evidenceId,
        ),
      );
    } catch (deleteError) {
      console.error(
        'Erro ao remover evidência:',
        deleteError,
      );

      setError(
        'Não foi possível remover a evidência.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {canUpload && (
        <div className="rounded-xl border bg-slate-50 p-4">
          <div>
            <h3 className="font-bold text-slate-900">
              Registrar evidências
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Envie fotos, vídeos, áudios ou documentos da operação.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf"
            capture="environment"
            onChange={(event) =>
              handleFiles(
                event.target.files,
              )
            }
            className="hidden"
          />

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Camera size={17} />
              Selecionar
            </button>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100"
            >
              <Image size={17} />
              Foto
            </button>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              <Video size={17} />
              Vídeo
            </button>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
            >
              <Paperclip size={17} />
              Anexo
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previews.map(
                ({ file, url }, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative overflow-hidden rounded-xl border bg-white"
                  >
                    {file.type.startsWith(
                      'image/',
                    ) ? (
                      <img
                        src={url}
                        alt={file.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : file.type.startsWith(
                        'video/',
                      ) ? (
                      <video
                        src={url}
                        controls
                        className="h-40 w-full bg-black object-contain"
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center p-4 text-center">
                        <FileText
                          size={36}
                          className="text-slate-400"
                        />

                        <p className="mt-2 line-clamp-2 text-sm font-medium">
                          {file.name}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedFile(
                          index,
                        )
                      }
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                    >
                      <X size={15} />
                    </button>

                    <div className="border-t p-2">
                      <p className="truncate text-xs text-slate-600">
                        {file.name}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {formatBytes(
                          file.size,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">
              Observações
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              maxLength={2000}
              placeholder="Descreva as condições da mota, local, danos encontrados e outras informações..."
              className="mt-1 w-full resize-none rounded-lg border px-3 py-2 text-sm"
            />

            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>
                {currentPosition
                  ? 'GPS será incluído automaticamente.'
                  : 'Localização GPS indisponível.'}
              </span>

              <span>
                {notes.length}/2000
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={
              uploading ||
              !selectedFiles.length
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Enviando evidências...
              </>
            ) : (
              <>
                <Upload size={17} />
                Enviar evidências
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Evidências registradas
            </h3>

            <p className="text-sm text-slate-500">
              {evidences.length}{' '}
              {evidences.length === 1
                ? 'arquivo registrado'
                : 'arquivos registrados'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCcw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />
          </button>
        </div>

        {loading && !evidences.length ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Carregando evidências...
          </div>
        ) : evidences.length ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {evidences.map(
              (evidence) => (
                <EvidenceCard
                  key={evidence.id}
                  evidence={evidence}
                  canDelete={canDelete}
                  deleting={
                    deletingId ===
                    evidence.id
                  }
                  onDelete={() =>
                    void removeEvidence(
                      evidence.id,
                    )
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
            <Paperclip
              size={36}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Nenhuma evidência registrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceCard({
  evidence,
  canDelete,
  deleting,
  onDelete,
}: {
  evidence: RecoveryEvidence;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const url = resolveFileUrl(
    evidence.fileUrl,
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      {evidence.type === 'PHOTO' ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={url}
            alt={
              evidence.originalName ??
              'Evidência'
            }
            className="h-48 w-full object-cover"
          />
        </a>
      ) : evidence.type === 'VIDEO' ? (
        <video
          src={url}
          controls
          className="h-48 w-full bg-black object-contain"
        />
      ) : evidence.type === 'AUDIO' ? (
        <div className="flex h-32 items-center justify-center p-4">
          <audio
            src={url}
            controls
            className="w-full"
          />
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-40 flex-col items-center justify-center p-4 text-center hover:bg-slate-50"
        >
          <FileText
            size={38}
            className="text-slate-400"
          />

          <span className="mt-2 text-sm font-medium text-blue-600">
            Abrir documento
          </span>
        </a>
      )}

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {evidence.originalName ??
                translateType(
                  evidence.type,
                )}
            </p>

            <p className="text-xs text-slate-400">
              {formatDate(
                evidence.createdAt,
              )}
            </p>
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          )}
        </div>

        {evidence.notes && (
          <p className="text-sm text-slate-600">
            {evidence.notes}
          </p>
        )}

        <div className="space-y-1 text-xs text-slate-500">
          {evidence.policeOfficer && (
            <p>
              Policial:{' '}
              {
                evidence.policeOfficer
                  .fullName
              }
            </p>
          )}

          {typeof evidence.latitude ===
            'number' &&
            typeof evidence.longitude ===
              'number' && (
              <a
                href={`https://www.google.com/maps?q=${evidence.latitude},${evidence.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <MapPin size={13} />
                Ver local da evidência
              </a>
            )}

          {typeof evidence.sizeBytes ===
            'number' && (
            <p>
              Tamanho:{' '}
              {formatBytes(
                evidence.sizeBytes,
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
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

function translateType(
  type: RecoveryEvidence['type'],
) {
  if (type === 'PHOTO') {
    return 'Fotografia';
  }

  if (type === 'VIDEO') {
    return 'Vídeo';
  }

  if (type === 'AUDIO') {
    return 'Áudio';
  }

  return 'Documento';
}

function formatBytes(
  value: number,
) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return '—';
  }

  return new Date(
    value,
  ).toLocaleString();
}