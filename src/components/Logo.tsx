import logoFull from '@/assets/logo-full.png';
import logoTight from '@/assets/logo-jmobi-tight.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  alt?: string;
  variant?: 'full' | 'compact';
}

export function Logo({ className = '', alt = 'JMobi', variant = 'full' }: LogoProps) {
  const src = variant === 'compact' ? logoTight : logoFull;

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
