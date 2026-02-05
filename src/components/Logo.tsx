import logoJmobi from '@/assets/logo-jmobi.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className = 'h-20' }: LogoProps) {
  return (
    <img 
      src={logoJmobi} 
      alt="JMobi" 
      className={className}
    />
  );
}
