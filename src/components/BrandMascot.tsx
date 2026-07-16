import ownerPhoto from '@/assets/owner-photo.jpg';
import { cn } from '@/lib/utils';

/** Recorte do rosto da mascote Capí (foto full-body). */
const CAPY_FACE = 'object-cover object-[center_14%]';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

interface BrandMascotProps {
  className?: string;
  size?: Size;
  /** Anel dourado discreto — padrão chique para links públicos */
  ring?: boolean;
}

/**
 * Mascote Capí para superfícies públicas (catálogo / submissão).
 * Uso: ao lado da logo, com recorte de rosto e anel gold.
 */
export function BrandMascot({ className, size = 'md', ring = true }: BrandMascotProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-ink-900/5',
        SIZE[size],
        ring && 'ring-2 ring-brand-gold/55 ring-offset-2 ring-offset-background shadow-[0_8px_20px_-10px_rgba(20,18,12,.35)]',
        className,
      )}
      aria-hidden
    >
      <img
        src={ownerPhoto}
        alt=""
        className={cn('h-full w-full scale-125', CAPY_FACE)}
      />
    </div>
  );
}
