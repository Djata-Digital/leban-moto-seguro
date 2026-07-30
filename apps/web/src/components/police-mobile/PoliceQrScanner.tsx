import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

type PoliceQrScannerProps = {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
};

const READER_ID = 'leban-police-qr-reader';

function cameraErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? '');

  if (
    /NotAllowedError|PermissionDeniedError|permission/i.test(
      message,
    )
  ) {
    return 'A permissão da câmera foi bloqueada. Abra as configurações deste site no navegador, permita o uso da câmera e tente novamente.';
  }

  if (
    /NotFoundError|DevicesNotFoundError|no camera/i.test(
      message,
    )
  ) {
    return 'Nenhuma câmera foi encontrada neste dispositivo.';
  }

  if (
    /NotReadableError|TrackStartError|Could not start video source/i.test(
      message,
    )
  ) {
    return 'A câmera está ocupada por outro aplicativo. Feche a câmera, OBS, Meet ou outro programa e tente novamente.';
  }

  if (
    /OverconstrainedError|ConstraintNotSatisfiedError/i.test(
      message,
    )
  ) {
    return 'A câmera traseira não pôde ser iniciada. Tente novamente para usar outra câmera disponível.';
  }

  return 'Não foi possível abrir a câmera. Verifique a permissão do navegador e tente novamente.';
}

export function PoliceQrScanner({
  open,
  onClose,
  onScan,
}: PoliceQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const scanFinishedRef = useRef(false);
  const onScanRef = useRef(onScan);

  const [starting, setStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    startingRef.current = false;

    if (!scanner) {
      setCameraActive(false);
      setStarting(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // O navegador pode já ter encerrado a câmera.
    }

    try {
      scanner.clear();
    } catch {
      // O leitor pode já ter sido limpo.
    }

    setCameraActive(false);
    setStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (
      startingRef.current ||
      scannerRef.current?.isScanning
    ) {
      return;
    }

    if (!window.isSecureContext) {
      setErrorMessage(
        'A câmera só pode ser aberta em uma conexão segura (HTTPS).',
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        'Este navegador não oferece acesso à câmera. Atualize o navegador ou use outro dispositivo.',
      );
      return;
    }

    startingRef.current = true;
    scanFinishedRef.current = false;
    setStarting(true);
    setCameraActive(false);
    setErrorMessage('');

    await stopScanner();

    startingRef.current = true;
    setStarting(true);

    const scanner = new Html5Qrcode(
      READER_ID,
      {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      },
    );

    scannerRef.current = scanner;

    const config = {
      fps: 12,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const size = Math.floor(
          Math.min(
            viewfinderWidth * 0.72,
            viewfinderHeight * 0.72,
            280,
          ),
        );

        return {
          width: Math.max(size, 180),
          height: Math.max(size, 180),
        };
      },
      aspectRatio: 1,
      disableFlip: false,
    };

    const onSuccess = async (decodedText: string) => {
      if (scanFinishedRef.current) {
        return;
      }

      scanFinishedRef.current = true;
      await stopScanner();
      onScanRef.current(decodedText);
    };

    const onFailure = () => {
      // É normal não encontrar um QR Code em cada quadro.
    };

    try {
      await scanner.start(
        { facingMode: 'environment' },
        config,
        onSuccess,
        onFailure,
      );
    } catch (firstError) {
      try {
        const cameras = await Html5Qrcode.getCameras();

        if (cameras.length === 0) {
          throw firstError;
        }

        const preferredCamera =
          cameras.find((camera) =>
            /back|rear|environment|traseira/i.test(
              camera.label,
            ),
          ) ?? cameras[0];

        await scanner.start(
          preferredCamera.id,
          config,
          onSuccess,
          onFailure,
        );
      } catch (secondError) {
        console.error(
          'Não foi possível iniciar a câmera do leitor QR:',
          secondError,
        );

        await stopScanner();
        setErrorMessage(
          cameraErrorMessage(secondError),
        );
        return;
      }
    }

    startingRef.current = false;
    setStarting(false);
    setCameraActive(true);
  }, [stopScanner]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      return;
    }

    scanFinishedRef.current = false;
    setErrorMessage('');

    const timer = window.setTimeout(() => {
      void startScanner();
    }, 150);

    return () => {
      window.clearTimeout(timer);
      void stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  async function handleClose() {
    scanFinishedRef.current = true;
    await stopScanner();
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6">
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
              Fiscalização
            </p>

            <h2 className="mt-1 text-xl font-black">
              Escanear QR da mota
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void handleClose()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Fechar
          </button>
        </header>

        <div className="p-4">
          <div className="relative min-h-[280px] overflow-hidden rounded-xl border bg-slate-950">
            <div
              id={READER_ID}
              className="min-h-[280px] w-full overflow-hidden"
            />

            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 px-6 text-center text-sm font-semibold text-white">
                Abrindo a câmera…
              </div>
            )}
          </div>

          {cameraActive && (
            <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
              Câmera ativa. Aponte para o QR Code da mota.
            </p>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{errorMessage}</p>

              <button
                type="button"
                onClick={() => void startScanner()}
                className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-3 font-bold text-white"
              >
                Tentar abrir a câmera novamente
              </button>
            </div>
          )}

          {!cameraActive && !starting && !errorMessage && (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"
            >
              Abrir câmera
            </button>
          )}

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">Como usar</p>

            <p className="mt-1">
              Permita o acesso à câmera quando o navegador solicitar e aponte para o QR Code da mota. A consulta será feita automaticamente.
            </p>

            <p className="mt-2">
              Caso a câmera esteja bloqueada, toque no ícone ao lado do endereço do site, abra as permissões e selecione <strong>Permitir câmera</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
