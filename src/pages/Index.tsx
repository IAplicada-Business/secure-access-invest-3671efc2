import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Building2, Shield, TrendingUp, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Logo className="h-20" />
          <Button asChild className="bg-charcoal text-white hover:bg-charcoal-light">
            <Link to="/admin/login">Acesso Admin</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-background via-secondary to-background">
        <div className="container relative mx-auto px-4 text-center">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
            Regularização de Imóveis
          </span>
          <h1 className="mb-6 font-display text-4xl font-bold text-foreground md:text-5xl lg:text-6xl animate-slide-up">
            Transforme <span className="text-primary">Irregularidades</span>
            <br />em Oportunidades
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8 animate-fade-in">
            A JMob conecta investidores qualificados a imóveis irregulares com alto potencial de valorização. 
            Nossa expertise em regularização garante segurança jurídica e retorno sobre o investimento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button size="lg" className="btn-gold text-lg px-8">
              Quero Investir
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-charcoal text-charcoal hover:bg-charcoal hover:text-white">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Por que investir com a JMob?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nossa metodologia combina expertise jurídica, análise de mercado e acompanhamento personalizado.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="card-premium p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Imóveis Selecionados
              </h3>
              <p className="text-muted-foreground">
                Cada imóvel é cuidadosamente analisado para garantir viabilidade de regularização e potencial de valorização.
              </p>
            </div>

            <div className="card-premium p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Segurança Jurídica
              </h3>
              <p className="text-muted-foreground">
                Equipe especializada em regularização fundiária com histórico comprovado de sucesso.
              </p>
            </div>

            <div className="card-premium p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                Alta Valorização
              </h3>
              <p className="text-muted-foreground">
                Imóveis regularizados podem valorizar de 30% a 100% após o processo de regularização.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="card-premium overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-8 md:p-12 text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Pronto para começar a investir?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Entre em contato para receber seu acesso exclusivo ao catálogo de oportunidades.
              </p>
              <Button size="lg" className="btn-gold">
                Falar com a JMob
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-charcoal">
        <div className="container mx-auto px-4 text-center">
          <Logo className="mx-auto mb-4 h-20" />
          <p className="text-sm text-white/70">
            © {new Date().getFullYear()} JMob Gestão e Negócios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}