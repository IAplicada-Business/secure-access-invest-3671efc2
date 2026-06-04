import logoFull from '@/assets/logo-full.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  alt?: string;
  variant?: 'full' | 'compact' | 'icon';
}

export function Logo({ className = '', alt = 'Tijolo em Capital', variant = 'full' }: LogoProps) {
  // Todas as variantes usam o logo principal por ora; o rebranding completo
  // (logos próprias em public/image) é tratado no Prompt 07.
  void variant;
  const src = logoFull;

  return (
    <span className={cn('relative inline-block overflow-hidden h-16 w-44', className)} aria-label={alt}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
