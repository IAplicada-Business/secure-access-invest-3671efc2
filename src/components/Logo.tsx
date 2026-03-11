import logoFull from '@/assets/logo-full.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = '', alt = 'JMobi' }: LogoProps) {
  return (
    <span className={cn('relative inline-block overflow-hidden h-16 w-44', className)} aria-label={alt}>
      <img
        src={logoFull}
        alt={alt}
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
