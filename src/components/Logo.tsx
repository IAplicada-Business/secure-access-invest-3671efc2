import logoJmobi from '@/assets/logo-jmobi.png';

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * A imagem enviada tem bastante “área vazia” ao redor.
 * Este componente aplica um recorte visual (object-cover + scale) dentro de um container com overflow-hidden,
 * permitindo uma logo maior sem aumentar o layout.
 */
export function Logo({ className = '', alt = 'JMobi' }: LogoProps) {
  const base = 'h-16 w-44';

  return (
    <span className={`relative inline-block overflow-hidden ${base} ${className}`.trim()} aria-label={alt}>
      <img
        src={logoJmobi}
        alt={alt}
        className="h-full w-full object-cover object-center scale-[1.35]"
      />
    </span>
  );
}
