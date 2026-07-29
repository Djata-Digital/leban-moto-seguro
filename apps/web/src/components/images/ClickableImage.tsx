import { Expand } from 'lucide-react';

type ClickableImageProps = {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  onClick: () => void;
};

export function ClickableImage({
  src,
  alt,
  label,
  className = '',
  onClick,
}: ClickableImageProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full overflow-hidden rounded-xl border bg-slate-100 text-left ${className}`}
      title="Toque para ampliar"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
      />

      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />

      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow">
        <Expand size={18} />
      </span>

      {label && (
        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-sm font-bold text-white">
          {label}
        </span>
      )}
    </button>
  );
}
