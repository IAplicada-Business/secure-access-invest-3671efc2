import logoJmobi from '@/assets/logo-jmobi.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className = 'h-12' }: LogoProps) {
  return (
    <img 
      src={logoJmobi} 
      alt="JMobi" 
      className={className}
    />
  );
}
