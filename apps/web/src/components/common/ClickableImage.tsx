import { useEffect, useState } from 'react';

type ClickableImageProps = {
  src: string;
  alt: string;
  className?: string;
  previewClassName?: string;
  title?: string;
};

export function ClickableImage({
  src,
  alt,
  className = '',
  previewClassName = '',
  title,
}: ClickableImageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative inline-flex shrink-0 cursor-zoom-in rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label={`Abrir imagem de ${alt}`}
        title="Clique para ampliar"
      >
        <img
          src={src}
          alt={alt}
          className={`${className} transition group-hover:brightness-95`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? `Imagem ampliada de ${alt}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="relative flex max-h-[95vh] max-w-[95vw] flex-col items-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-2 -top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-light text-slate-900 shadow-lg hover:bg-slate-100"
              aria-label="Fechar imagem ampliada"
              title="Fechar"
            >
              ×
            </button>

            <img
              src={src}
              alt={alt}
              className={`max-h-[85vh] max-w-[92vw] rounded-xl bg-white object-contain shadow-2xl ${previewClassName}`}
            />

            {(title || alt) && (
              <p className="mt-3 max-w-[90vw] rounded-full bg-black/45 px-4 py-2 text-center text-sm text-white">
                {title ?? alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
