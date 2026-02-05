import { AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

export default function InvalidLink() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-4 text-center">
      <div className="max-w-md animate-fade-in">
        <Logo className="mx-auto mb-8 h-12" />
        <div className="mb-6 rounded-full bg-destructive/10 p-4 inline-block">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="mb-4 font-display text-2xl font-bold text-white">
          Link Não Encontrado
        </h1>
        <p className="mb-8 text-muted-foreground">
          Este link não está disponível ou expirou. Entre em contato com a JMob para obter acesso ao catálogo de oportunidades.
        </p>
        <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
            Entrar em Contato
          </a>
        </Button>
      </div>
    </div>
  );
}
