import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

type PoliceQrScannerProps = {
  open: boolean;

  onClose: () => void;

  onScan: (
    decodedText: string,
  ) => void;
};

const READER_ID =
  'leban-police-qr-reader';

export function PoliceQrScanner({
  open,
  onClose,
  onScan,
}: PoliceQrScannerProps) {
  const scannerRef =
    useRef<Html5QrcodeScanner | null>(
      null,
    );

  const scanFinishedRef =
    useRef(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    scanFinishedRef.current = false;
    setErrorMessage('');

    const timer =
      window.setTimeout(() => {
        try {
          const scanner =
            new Html5QrcodeScanner(
              READER_ID,
              {
                fps: 10,

                qrbox: {
                  width: 250,
                  height: 250,
                },

                aspectRatio: 1,

                rememberLastUsedCamera:
                  true,

                supportedScanTypes: [
                  0,
                  1,
                ],

                formatsToSupport: [
                  Html5QrcodeSupportedFormats.QR_CODE,
                ],

                showTorchButtonIfSupported:
                  true,

                showZoomSliderIfSupported:
                  true,

                defaultZoomValueIfSupported:
                  2,
              },

              false,
            );

          scannerRef.current =
            scanner;

          scanner.render(
            async (
              decodedText,
            ) => {
              if (
                scanFinishedRef.current
              ) {
                return;
              }

              scanFinishedRef.current =
                true;

              try {
                await scanner.clear();
              } catch {
                // O scanner pode já estar encerrado.
              }

              scannerRef.current =
                null;

              onScan(decodedText);
            },

            () => {
              // Erros enquanto procura um QR são
              // normais e não precisam aparecer.
            },
          );
        } catch (error) {
          console.error(error);

          setErrorMessage(
            'Não foi possível iniciar o leitor de QR Code.',
          );
        }
      }, 100);

    return () => {
      window.clearTimeout(timer);

      const scanner =
        scannerRef.current;

      scannerRef.current =
        null;

      if (scanner) {
        void scanner
          .clear()
          .catch(() => undefined);
      }
    };
  }, [
    open,
    onScan,
  ]);

  async function handleClose() {
    scanFinishedRef.current = true;

    const scanner =
      scannerRef.current;

    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.clear();
      } catch {
        // Evita bloquear o fechamento.
      }
    }

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
            onClick={() =>
              void handleClose()
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Fechar
          </button>
        </header>

        <div className="p-4">
          <div
            id={READER_ID}
            className="overflow-hidden rounded-xl border bg-white"
          />

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-bold">
              Como usar
            </p>

            <p className="mt-1">
              Aponte a câmera para o QR
              Code da mota. O sistema fará
              a consulta automaticamente.
            </p>

            <p className="mt-2">
              Caso a câmera não abra,
              escolha uma imagem do QR
              Code salva na galeria do
              celular.
            </p>
          </div>

          {!window.isSecureContext && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">
                Câmera possivelmente
                bloqueada
              </p>

              <p className="mt-1">
                Este endereço está usando
                HTTP. Alguns celulares só
                liberam a câmera quando o
                sistema está publicado em
                HTTPS.
              </p>

              <p className="mt-2">
                Durante o teste, use a
                opção de selecionar uma
                imagem da galeria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}