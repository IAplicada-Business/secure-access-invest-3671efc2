import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  alt?: string;
  /**
   * Qual arte da marca usar:
   * - 'color' (padrão): logo colorida — para fundos claros.
   * - 'gold': monocromática dourada — para fundos escuros.
   * - 'dark': monocromática escura.
   * - 'icon': apenas o ícone quadrado (tijolo) — para espaços compactos.
   */
  tone?: 'color' | 'gold' | 'dark' | 'icon';
}

const SRC: Record<NonNullable<LogoProps['tone']>, string> = {
  color: '/image/logo-color.png',
  gold: '/image/logo-color-alt.png',
  dark: '/image/logo-mono-dark.png',
  icon: '/image/logo-icon.png',
};

export function Logo({ className = '', alt = 'Tijolo em Capital', tone = 'color' }: LogoProps) {
  return (
    <img
      src={SRC[tone]}
      alt={alt}
      className={cn('inline-block object-contain object-left', className)}
    />
  );
}
