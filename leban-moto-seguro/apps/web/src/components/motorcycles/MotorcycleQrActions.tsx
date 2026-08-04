import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type MotorcycleQrActionsProps = {
  qrToken: string;
  nationalCode?: string;
  plateNumber?: string;
};

export function MotorcycleQrActions({
  qrToken,
  nationalCode,
  plateNumber,
}: MotorcycleQrActionsProps) {
  const [qrImage, setQrImage] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const publicAppUrl =
    import.meta.env.VITE_PUBLIC_APP_URL ??
    window.location.origin;

  const verificationUrl =
    `${publicAppUrl}/verify/${qrToken}`;

  useEffect(() => {
    async function generateQrCode() {
      try {
        const image = await QRCode.toDataURL(
          verificationUrl,
          {
            width: 500,
            margin: 2,
            errorCorrectionLevel: 'H',
          },
        );

        setQrImage(image);
      } catch (error) {
        console.error(error);

        setErrorMessage(
          'Não foi possível gerar o QR Code.',
        );
      }
    }

    void generateQrCode();
  }, [verificationUrl]);

  function downloadQrCode() {
    if (!qrImage) {
      return;
    }

    const safeCode =
      nationalCode ||
      plateNumber ||
      'mota';

    const link =
      document.createElement('a');

    link.href = qrImage;
    link.download =
      `qr-${safeCode}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printQrCode() {
    if (!qrImage) {
      return;
    }

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=700,height=800',
      );

    if (!printWindow) {
      setErrorMessage(
        'O navegador bloqueou a janela de impressão.',
      );

      return;
    }

    const title =
      nationalCode ||
      plateNumber ||
      'Mota';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="UTF-8" />

          <title>QR Code - ${title}</title>

          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              text-align: center;
              color: #0f172a;
            }

            .card {
              max-width: 520px;
              margin: 0 auto;
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 30px;
            }

            h1 {
              margin-bottom: 8px;
              font-size: 24px;
            }

            h2 {
              margin-top: 0;
              margin-bottom: 24px;
              font-size: 20px;
            }

            img {
              width: 360px;
              height: 360px;
              max-width: 100%;
            }

            .code {
              margin-top: 20px;
              font-size: 20px;
              font-weight: bold;
            }

            .plate {
              margin-top: 8px;
              font-size: 17px;
            }

            .instruction {
              margin-top: 20px;
              font-size: 14px;
              color: #475569;
            }

            .system {
              margin-top: 25px;
              font-size: 13px;
              font-weight: bold;
            }

            @media print {
              body {
                padding: 0;
              }

              .card {
                border: 2px solid #000;
              }
            }
          </style>
        </head>

        <body>
          <div class="card">
            <h1>LEBAN MOTO SEGURO</h1>

            <h2>Identificação da Mota</h2>

            <img
              src="${qrImage}"
              alt="QR Code"
            />

            <div class="code">
              ${nationalCode ?? ''}
            </div>

            <div class="plate">
              ${
                plateNumber
                  ? `Placa: ${plateNumber}`
                  : ''
              }
            </div>

            <div class="instruction">
              Escaneie este QR Code para consultar
              a situação da mota.
            </div>

            <div class="system">
              Sistema Nacional de Registo,
              Segurança e Fiscalização de Motas
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setShowQr(true)
          }
          disabled={!qrImage}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Visualizar QR
        </button>

        <button
          type="button"
          onClick={downloadQrCode}
          disabled={!qrImage}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Baixar QR
        </button>

        <button
          type="button"
          onClick={printQrCode}
          disabled={!qrImage}
          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Imprimir QR
        </button>
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">
          {errorMessage}
        </p>
      )}

      {showQr && qrImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  QR Code da Mota
                </h2>

                <p className="text-sm text-slate-500">
                  {nationalCode ??
                    plateNumber ??
                    'Identificação da mota'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowQr(false)
                }
                className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="flex justify-center rounded-xl border bg-white p-4">
              <img
                src={qrImage}
                alt="QR Code da mota"
                className="w-full max-w-sm"
              />
            </div>

            <div className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {verificationUrl}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={downloadQrCode}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Baixar
              </button>

              <button
                type="button"
                onClick={printQrCode}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}