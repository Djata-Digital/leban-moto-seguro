import {
  useEffect,
  useState,
  type WheelEvent,
} from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';

export type ViewerImage = {
  src: string;
  title: string;
  description?: string;
};

type ImageViewerProps = {
  images: ViewerImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
}: ImageViewerProps) {
  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(initialIndex);

  const [
    zoom,
    setZoom,
  ] = useState(1);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentIndex(
      Math.min(
        Math.max(initialIndex, 0),
        Math.max(images.length - 1, 0),
      ),
    );

    setZoom(1);
  }, [
    open,
    initialIndex,
    images.length,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        onClose();
      }

      if (
        event.key === 'ArrowLeft' &&
        images.length > 1
      ) {
        setCurrentIndex((index) =>
          index === 0
            ? images.length - 1
            : index - 1,
        );

        setZoom(1);
      }

      if (
        event.key === 'ArrowRight' &&
        images.length > 1
      ) {
        setCurrentIndex((index) =>
          index === images.length - 1
            ? 0
            : index + 1,
        );

        setZoom(1);
      }

      if (
        event.key === '+' ||
        event.key === '='
      ) {
        setZoom((currentZoom) =>
          Math.min(
            currentZoom + ZOOM_STEP,
            MAX_ZOOM,
          ),
        );
      }

      if (event.key === '-') {
        setZoom((currentZoom) =>
          Math.max(
            currentZoom - ZOOM_STEP,
            MIN_ZOOM,
          ),
        );
      }
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    open,
    onClose,
    images.length,
  ]);

  if (
    !open ||
    images.length === 0
  ) {
    return null;
  }

  const safeIndex = Math.min(
    currentIndex,
    images.length - 1,
  );

  const currentImage =
    images[safeIndex];

  function increaseZoom() {
    setZoom((currentZoom) =>
      Math.min(
        currentZoom + ZOOM_STEP,
        MAX_ZOOM,
      ),
    );
  }

  function decreaseZoom() {
    setZoom((currentZoom) =>
      Math.max(
        currentZoom - ZOOM_STEP,
        MIN_ZOOM,
      ),
    );
  }

  function resetZoom() {
    setZoom(1);
  }

  function showPrevious() {
    if (images.length <= 1) {
      return;
    }

    setCurrentIndex((index) =>
      index === 0
        ? images.length - 1
        : index - 1,
    );

    setZoom(1);
  }

  function showNext() {
    if (images.length <= 1) {
      return;
    }

    setCurrentIndex((index) =>
      index === images.length - 1
        ? 0
        : index + 1,
    );

    setZoom(1);
  }

  function handleWheel(
    event: WheelEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    if (event.deltaY < 0) {
      increaseZoom();
    } else {
      decreaseZoom();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagens"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold sm:text-lg">
            {currentImage.title}
          </h2>

          {currentImage.description && (
            <p className="truncate text-xs text-slate-300 sm:text-sm">
              {currentImage.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="Fechar visualizador"
        >
          <X size={25} />
        </button>
      </header>

      <div
        className="relative flex flex-1 items-center justify-center overflow-auto p-4"
        onWheel={handleWheel}
        onClick={onClose}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            className="fixed left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-lg transition hover:bg-black/80"
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={30} />
          </button>
        )}

        <img
          src={currentImage.src}
          alt={currentImage.title}
          draggable={false}
          onClick={(event) =>
            event.stopPropagation()
          }
          onDoubleClick={() =>
            setZoom((currentZoom) =>
              currentZoom === 1 ? 2 : 1,
            )
          }
          className="max-h-[75vh] max-w-[92vw] select-none object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
          }}
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            className="fixed right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-lg transition hover:bg-black/80"
            aria-label="Próxima imagem"
          >
            <ChevronRight size={30} />
          </button>
        )}
      </div>

      <footer className="border-t border-white/10 bg-black/80 px-3 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-2">
          <button
            type="button"
            onClick={decreaseZoom}
            disabled={zoom <= MIN_ZOOM}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
            aria-label="Diminuir zoom"
          >
            <Minus size={21} />
          </button>

          <span className="min-w-16 text-center text-sm font-bold">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={increaseZoom}
            disabled={zoom >= MAX_ZOOM}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
            aria-label="Aumentar zoom"
          >
            <Plus size={21} />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className="ml-2 flex h-11 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold"
          >
            <RotateCcw size={19} />
            Restaurar
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-slate-400">
          {safeIndex + 1} de{' '}
          {images.length} — toque duas vezes
          para ampliar
        </p>
      </footer>
    </div>
  );
}
