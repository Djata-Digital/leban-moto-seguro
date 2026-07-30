import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import { ClickableImage } from '../../components/images/ClickableImage';
import {
  ImageViewer,
  type ViewerImage,
} from '../../components/images/ImageViewer';
import { PoliceQrScanner } from '../../components/police-mobile/PoliceQrScanner';

import {
  getOfflineStatistics,
  replaceOfflineMotorcycles,
  saveOfflinePoliceCheck,
  searchOfflineMotorcycle,
  type OfflineMotorcycle,
} from '../../offline/policeOfflineDb';

type OfflineStatistics = {
  motorcycles: number;
  checks: number;
  pendingChecks: number;
  lastSync: string | null;
};

const initialStatistics: OfflineStatistics = {
  motorcycles: 0,
  checks: 0,
  pendingChecks: 0,
  lastSync: null,
};

export function PoliceMobilePage() {
  const navigate = useNavigate();

  const [
    searchValue,
    setSearchValue,
  ] = useState('');

  const [
    motorcycle,
    setMotorcycle,
  ] = useState<OfflineMotorcycle | null>(
    null,
  );

  const [
    viewerImages,
    setViewerImages,
  ] = useState<ViewerImage[]>([]);

  const [
    viewerInitialIndex,
    setViewerInitialIndex,
  ] = useState(0);

  const [
    viewerOpen,
    setViewerOpen,
  ] = useState(false);

  const [
    statistics,
    setStatistics,
  ] = useState<OfflineStatistics>(
    initialStatistics,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    synchronizing,
    setSynchronizing,
  ] = useState(false);

  const [
    online,
    setOnline,
  ] = useState(
    navigator.onLine,
  );

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    scannerOpen,
    setScannerOpen,
    ] = useState(false);

  const token =
    localStorage.getItem('accessToken');

  const loadStatistics =
    useCallback(async () => {
      const result =
        await getOfflineStatistics();

      setStatistics(result);
    }, []);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener(
      'online',
      handleOnline,
    );

    window.addEventListener(
      'offline',
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        'online',
        handleOnline,
      );

      window.removeEventListener(
        'offline',
        handleOffline,
      );
    };
  }, []);

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  async function synchronizeDatabase() {
    if (!navigator.onLine) {
      setErrorMessage(
        'Não existe internet. Use a última base offline disponível.',
      );

      return;
    }

    setSynchronizing(true);
    setMessage('');
    setErrorMessage('');

    try {
      const response =
        await api.get('/motorcycles');

      const motorcycles =
        response.data?.data ??
        response.data ??
        [];

      if (!Array.isArray(motorcycles)) {
        throw new Error(
          'A API devolveu uma resposta inválida.',
        );
      }

      const result =
        await replaceOfflineMotorcycles(
          motorcycles,
        );

      setMessage(
        `${result.count} motas foram guardadas no celular para consulta offline.`,
      );

      await loadStatistics();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ??
          'Não foi possível atualizar a base offline.',
      );
    } finally {
      setSynchronizing(false);
    }
  }

  async function handleSearch(
    receivedValue?: string,
    ) {
    const originalValue =
        receivedValue ?? searchValue;

    const value =
        extractQrValue(
        originalValue,
        );

    if (!value) {
        setErrorMessage(
        'Digite uma placa, Código Nacional, chassi ou conteúdo do QR Code.',
        );

        return;
    }

    setSearchValue(value);
    setLoading(true);
    setMotorcycle(null);
    setMessage('');
    setErrorMessage('');

    try {
        const offlineResult =
        await searchOfflineMotorcycle(
            value,
        );

        if (offlineResult && !navigator.onLine) {
        setMotorcycle(
            offlineResult,
        );

        await registerCheck(
            offlineResult,
            navigator.onLine
            ? 'REGULAR_OFFLINE_DATABASE_ONLINE'
            : 'REGULAR_OFFLINE',
        );

        await loadStatistics();
        return;
        }

        if (!navigator.onLine) {
        await saveOfflinePoliceCheck({
            plateNumber:
            looksLikePlate(value)
                ? value
                : undefined,

            nationalCode:
            value
                .toUpperCase()
                .startsWith(
                'GB-MOTO-',
                )
                ? value
                : undefined,

            chassisNumber:
            !looksLikePlate(value) &&
            !value
                .toUpperCase()
                .startsWith(
                'GB-MOTO-',
                )
                ? value
                : undefined,

            result:
            'NOT_FOUND_OFFLINE',

            notes:
            'Consulta não encontrada na base offline do celular.',
        });

        await loadStatistics();

        setErrorMessage(
            'Mota não encontrada na base offline. Atualize a base quando tiver internet.',
        );

        return;
        }

        const onlineResult =
        await searchOnlineMotorcycle(
            value,
        );

        if (!onlineResult) {
        await saveOfflinePoliceCheck({
            plateNumber:
            looksLikePlate(value)
                ? value
                : undefined,

            nationalCode:
            value
                .toUpperCase()
                .startsWith(
                'GB-MOTO-',
                )
                ? value
                : undefined,

            result:
            'NOT_FOUND_ONLINE',

            notes:
            'Consulta não encontrada no servidor.',
        });

        await loadStatistics();

        setErrorMessage(
            'Mota não encontrada.',
        );

        return;
        }

        const preparedMotorcycle: OfflineMotorcycle = {
        ...onlineResult,

        synchronizedAt:
            new Date().toISOString(),
        };

        setMotorcycle(
        preparedMotorcycle,
        );

        await registerCheck(
        preparedMotorcycle,
        'MOTORCYCLE_FOUND_ONLINE',
        );

        await loadStatistics();
    } catch (error: any) {
        console.error(error);

        setErrorMessage(
        error?.response?.data?.message ??
            'Não foi possível realizar a consulta.',
        );
    } finally {
        setLoading(false);
    }
    }

  function handleQrScan(
    decodedText: string,
    ) {
    setScannerOpen(false);

    const value =
        extractQrValue(
        decodedText,
        );

    setSearchValue(value);

    window.setTimeout(() => {
        void handleSearch(value);
    }, 100);
    }
  
    async function searchOnlineMotorcycle(
    value: string,
  ) {
    const normalized =
      value.trim();

    try {
      const qrResponse =
        await api.get(
          `/public/motorcycles/${encodeURIComponent(
            normalized,
          )}`,
        );

      const publicData =
        qrResponse.data?.data ??
        qrResponse.data;

      if (
        publicData?.registered &&
        publicData?.nationalCode
      ) {
        const listResponse =
          await api.get(
            '/motorcycles',
          );

        const motorcycles =
          listResponse.data?.data ??
          listResponse.data ??
          [];

        return motorcycles.find(
          (item: OfflineMotorcycle) =>
            item.qrToken === normalized ||
            normalize(item.nationalCode) ===
              normalize(
                publicData.nationalCode,
              ),
        );
      }
    } catch {
      // Não era um token de QR válido.
    }

    const plateResponse =
      await api.get(
        `/motorcycles/plate/${encodeURIComponent(
          normalized,
        )}`,
      );

    return (
      plateResponse.data?.data ??
      plateResponse.data
    );
  }

  async function registerCheck(
    selectedMotorcycle: OfflineMotorcycle,
    result: string,
  ) {
    const coordinates =
      await getCurrentCoordinates();

    await saveOfflinePoliceCheck({
      motorcycleId:
        selectedMotorcycle.id,

      plateNumber:
        selectedMotorcycle.plateNumber,

      chassisNumber:
        selectedMotorcycle.chassisNumber,

      nationalCode:
        selectedMotorcycle.nationalCode,

      latitude:
        coordinates?.latitude,

      longitude:
        coordinates?.longitude,

      result,

      notes: navigator.onLine
        ? 'Consulta realizada com conexão.'
        : 'Consulta realizada pela base offline.',
    });
  }

  function openImageViewer(
    images: ViewerImage[],
    selectedIndex = 0,
  ) {
    if (images.length === 0) {
      return;
    }

    setViewerImages(images);
    setViewerInitialIndex(selectedIndex);
    setViewerOpen(true);
  }

  function clearSearch() {
    setSearchValue('');
    setMotorcycle(null);
    setMessage('');
    setErrorMessage('');
  }

  function logout() {
    localStorage.removeItem(
      'accessToken',
    );

    localStorage.removeItem(
      'refreshToken',
    );

    navigate(
      '/login',
      {
        replace: true,
      },
    );
  }

  const stolen =
    motorcycle &&
    isMotorcycleStolen(
      motorcycle,
    );

  const activeDriver =
    motorcycle
      ? getCurrentDriver(motorcycle)
      : null;

  const inspectionImages: ViewerImage[] =
    motorcycle
      ? buildInspectionImages(
          motorcycle,
          activeDriver,
        )
      : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 px-4 py-4 text-white shadow-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Polícia
            </p>

            <h1 className="text-xl font-black">
              LEBAN Moto Seguro
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
        <section
          className={`rounded-xl border px-4 py-3 ${
            online
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">
                {online
                  ? '● Conectado'
                  : '● Modo offline'}
              </p>

              <p className="text-xs">
                {online
                  ? 'A internet está disponível.'
                  : 'As consultas usarão os dados salvos no celular.'}
              </p>
            </div>

            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
              {statistics.motorcycles}{' '}
              motas
            </span>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Base de fiscalização
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Atualize a base antes de sair
            para uma operação sem internet.
          </p>

          <button
            type="button"
            onClick={() =>
              void synchronizeDatabase()
            }
            disabled={
              synchronizing ||
              !online
            }
            className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {synchronizing
              ? 'Atualizando base...'
              : 'Atualizar base offline'}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Statistic
              label="Motas salvas"
              value={
                statistics.motorcycles
              }
            />

            <Statistic
              label="Consultas pendentes"
              value={
                statistics.pendingChecks
              }
            />
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            Última atualização:{' '}
            {statistics.lastSync
              ? formatDate(
                  statistics.lastSync,
                )
              : 'Nunca'}
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Verificar mota
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Digite a placa, o Código
            Nacional, o chassi ou cole o
            conteúdo do QR.
          </p>

          <button
            type="button"
            onClick={() => {
                setErrorMessage('');
                setMessage('');
                setScannerOpen(true);
            }}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-blue-700 px-4 py-4 text-lg font-black text-white shadow-sm hover:bg-blue-800"
            >
            <span className="text-2xl">
                📷
            </span>

            Escanear QR Code
            </button>

            <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-bold uppercase text-slate-400">
                ou pesquise
            </span>

            <div className="h-px flex-1 bg-slate-200" />
            </div>

          <input
            value={searchValue}
            onChange={(event) =>
              setSearchValue(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
              ) {
                void handleSearch();
              }
            }}
            placeholder="Ex.: GB-1252 ou GB-MOTO-000000003"
            autoCapitalize="characters"
            className="mt-4 w-full rounded-xl border px-4 py-4 text-lg font-semibold uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                void handleSearch()
              }
              disabled={loading}
              className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading
                ? 'Consultando...'
                : 'Consultar'}
            </button>

            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl border px-4 py-3 font-bold text-slate-700"
            >
              Limpar
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Use a câmera para escanear o QR Code
            ou faça a consulta pela placa, Código
            Nacional ou número do chassi.
          </p>
        </section>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {motorcycle && (
          <section
            className={`overflow-hidden rounded-2xl border-2 bg-white shadow-lg ${
              stolen
                ? 'border-red-600'
                : 'border-green-600'
            }`}
          >
            <div
              className={`px-5 py-5 text-center text-white ${
                stolen
                  ? 'bg-red-600'
                  : 'bg-green-600'
              }`}
            >
              <p className="text-4xl">
                {stolen ? '🚨' : '✅'}
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {stolen
                  ? 'MOTA ROUBADA'
                  : 'MOTA REGISTRADA'}
              </h2>

              <p className="mt-1 text-sm">
                {stolen
                  ? 'Acione imediatamente a central.'
                  : 'Nenhuma ocorrência ativa encontrada.'}
              </p>
            </div>

            <div className="space-y-4 p-5">
              {motorcycle.photoUrl && (
                <ClickableImage
                  src={getFileUrl(
                    motorcycle.photoUrl,
                  )}
                  alt="Foto da mota"
                  label="Foto da mota — toque para ampliar"
                  className="h-52"
                  onClick={() => {
                    const imageUrl =
                      getFileUrl(
                        motorcycle.photoUrl!,
                      );

                    const index =
                      inspectionImages.findIndex(
                        (image) =>
                          image.src === imageUrl,
                      );

                    openImageViewer(
                      inspectionImages,
                      index >= 0 ? index : 0,
                    );
                  }}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Information
                  label="Placa"
                  value={
                    motorcycle.plateNumber
                  }
                  important
                />

                <Information
                  label="Código"
                  value={
                    motorcycle.nationalCode
                  }
                  important
                />

                <Information
                  label="Marca"
                  value={
                    motorcycle.brand
                  }
                />

                <Information
                  label="Modelo"
                  value={
                    motorcycle.model ??
                    '—'
                  }
                />

                <Information
                  label="Cor"
                  value={
                    motorcycle.color ??
                    '—'
                  }
                />

                <Information
                  label="Status"
                  value={
                    formatStatus(
                      motorcycle.status,
                    )
                  }
                />
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Proprietário
                </p>

                {motorcycle.owner?.photoUrl && (
                  <div className="mt-3">
                    <ClickableImage
                      src={getFileUrl(
                        motorcycle.owner.photoUrl,
                      )}
                      alt="Foto do proprietário"
                      label="Proprietário — toque para ampliar"
                      className="h-52"
                      onClick={() => {
                        const imageUrl =
                          getFileUrl(
                            motorcycle.owner!.photoUrl!,
                          );

                        const index =
                          inspectionImages.findIndex(
                            (image) =>
                              image.src === imageUrl,
                          );

                        openImageViewer(
                          inspectionImages,
                          index >= 0 ? index : 0,
                        );
                      }}
                    />
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Information
                    label="Nome"
                    value={getOwnerName(motorcycle)}
                  />

                  <Information
                    label="Telefone"
                    value={getOwnerPhone(motorcycle)}
                    important
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Motorista ativo
                </p>

                {activeDriver ? (
                  <>
                    {activeDriver.photoUrl && (
                      <div className="mt-3">
                        <ClickableImage
                          src={getFileUrl(
                            activeDriver.photoUrl,
                          )}
                          alt="Foto do motorista"
                          label="Motorista — toque para ampliar"
                          className="h-52"
                          onClick={() => {
                            const imageUrl =
                              getFileUrl(
                                activeDriver.photoUrl!,
                              );

                            const index =
                              inspectionImages.findIndex(
                                (image) =>
                                  image.src === imageUrl,
                              );

                            openImageViewer(
                              inspectionImages,
                              index >= 0 ? index : 0,
                            );
                          }}
                        />
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Information
                        label="Nome"
                        value={
                          activeDriver.fullName ??
                          'Não informado'
                        }
                      />

                      <Information
                        label="Telefone"
                        value={
                          activeDriver.phone ??
                          'Não informado'
                        }
                      />

                      <Information
                        label="Carta de condução"
                        value={
                          activeDriver.drivingLicenseNumber ??
                          'Não informada'
                        }
                        important
                      />

                      <Information
                        label="Número do B.I."
                        value={
                          activeDriver.identityNumber ??
                          'Não informado'
                        }
                        important
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    ⚠ Nenhum motorista ativo associado a esta mota.
                  </div>
                )}
              </div>

              <Information
                label="Chassi"
                value={
                  hideChassis(
                    motorcycle.chassisNumber,
                  )
                }
              />

              <div className="rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-500">
                Dados armazenados em:{' '}
                {formatDate(
                  motorcycle.synchronizedAt,
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      
      <PoliceQrScanner
        open={scannerOpen}
        onClose={() =>
            setScannerOpen(false)
        }
        onScan={handleQrScan}
        />
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        open={viewerOpen}
        onClose={() =>
          setViewerOpen(false)
        }
      />
    </div>
  );
}

function Statistic({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-2xl font-black text-slate-900">
        {value}
      </p>

      <p className="text-xs text-slate-500">
        {label}
      </p>
    </div>
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
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 break-words ${
          important
            ? 'text-lg font-black text-slate-950'
            : 'font-semibold text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function normalize(value?: string | null) {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function extractQrValue(
  value: string,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const url =
      new URL(trimmed);

    const segments =
      url.pathname
        .split('/')
        .filter(Boolean);

    const verifyIndex =
      segments.indexOf('verify');

    if (
      verifyIndex >= 0 &&
      segments[verifyIndex + 1]
    ) {
      return decodeURIComponent(
        segments[verifyIndex + 1],
      );
    }

    return (
      segments.at(-1) ??
      trimmed
    );
  } catch {
    return trimmed;
  }
}

function isMotorcycleStolen(
  motorcycle: OfflineMotorcycle,
) {
  if (
    [
      'STOLEN',
      'ROBBED',
      'INVESTIGATION',
    ].includes(
      motorcycle.status,
    )
  ) {
    return true;
  }

  return (
    motorcycle.theftReports?.some(
      (report) =>
        ['OPEN', 'INVESTIGATING'].includes(
          report.status ?? '',
        ),
    ) ?? false
  );
}

function getOwnerName(
  motorcycle: OfflineMotorcycle,
) {
  return (
    motorcycle.owner?.fullName ??
    motorcycle.owner?.user?.fullName ??
    'Não informado'
  );
}

function getOwnerPhone(
  motorcycle: OfflineMotorcycle,
) {
  return (
    motorcycle.owner?.phone ??
    motorcycle.owner?.user?.phone ??
    'Não informado'
  );
}

function getCurrentDriver(
  motorcycle: OfflineMotorcycle,
) {
  const activeLink =
    motorcycle.driverLinks?.find(
      (link) => link.isActive,
    );

  const driver = activeLink?.driver;

  if (!driver) {
    return null;
  }

  return {
    ...driver,
    fullName:
      driver.fullName ??
      driver.user?.fullName ??
      'Não informado',
    phone:
      driver.phone ??
      driver.user?.phone ??
      null,
    email:
      driver.email ??
      driver.user?.email ??
      null,
    photoUrl:
      driver.photoUrl ??
      driver.user?.photoUrl ??
      null,
  };
}

function buildInspectionImages(
  motorcycle: OfflineMotorcycle,
  activeDriver: ReturnType<
    typeof getCurrentDriver
  >,
): ViewerImage[] {
  const images: ViewerImage[] = [];

  if (motorcycle.photoUrl) {
    images.push({
      src: getFileUrl(
        motorcycle.photoUrl,
      ),
      title: 'Foto da mota',
      description:
        motorcycle.plateNumber,
    });
  }

  if (motorcycle.owner?.photoUrl) {
    images.push({
      src: getFileUrl(
        motorcycle.owner.photoUrl,
      ),
      title: 'Foto do proprietário',
      description:
        getOwnerName(motorcycle),
    });
  }

  if (activeDriver?.photoUrl) {
    images.push({
      src: getFileUrl(
        activeDriver.photoUrl,
      ),
      title: 'Foto do motorista',
      description:
        activeDriver.fullName ??
        'Motorista ativo',
    });
  }

  return images;
}

function hideChassis(
  chassisNumber: string,
) {
  if (
    chassisNumber.length <= 6
  ) {
    return chassisNumber;
  }

  return `••••••${chassisNumber.slice(
    -6,
  )}`;
}

function formatStatus(
  status: string,
) {
  const labels: Record<
    string,
    string
  > = {
    ACTIVE: 'Ativa',
    SUSPENDED: 'Suspensa',
    STOLEN: 'Furtada',
    ROBBED: 'Roubada',
    RECOVERED: 'Recuperada',
    INVESTIGATION:
      'Em investigação',
    BLOCKED: 'Bloqueada',
  };

  return labels[status] ?? status;
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

function getFileUrl(
  fileUrl: string,
) {
  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://') ||
    fileUrl.startsWith('data:')
  ) {
    return fileUrl;
  }

  const apiOrigin =
    api.defaults.baseURL?.replace(
      /\/api\/v1\/?$/,
      '',
    ) ??
    'http://localhost:3000';

  return `${apiOrigin}${fileUrl}`;
}

async function getCurrentCoordinates() {
  if (
    !navigator.geolocation
  ) {
    return null;
  }

  return new Promise<{
    latitude: number;
    longitude: number;
  } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude:
            position.coords.latitude,

          longitude:
            position.coords.longitude,
        });
      },

      () => {
        resolve(null);
      },

      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  });
}

function looksLikePlate(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toUpperCase();

  return /^GB[-\s]?[A-Z0-9-]{3,}$/.test(
    normalized,
  );
}
