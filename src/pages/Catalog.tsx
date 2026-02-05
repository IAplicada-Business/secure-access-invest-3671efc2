import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, AccessLink } from '@/types/database';
import { PropertyCard } from '@/components/PropertyCard';
import { Logo } from '@/components/Logo';
import { AlertCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Catalog() {
  const { token } = useParams<{ token: string }>();
  const [accessLink, setAccessLink] = useState<AccessLink | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validateAndLoad() {
      if (!token) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      // Validate token
      const { data: linkData, error: linkError } = await supabase
        .from('access_links')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (linkError || !linkData) {
        setError('Este link não está mais disponível. Entre em contato com a JMob.');
        setLoading(false);
        return;
      }

      // Check expiration
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError('Este link expirou. Entre em contato com a JMob para obter um novo.');
        setLoading(false);
        return;
      }

      setAccessLink(linkData as AccessLink);
      
      // Store in session for tracking
      sessionStorage.setItem('access_link_id', linkData.id);
      sessionStorage.setItem('access_link_token', token);

      // Load published properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error loading properties:', propertiesError);
      } else {
        setProperties((propertiesData as Property[]) || []);
      }

      setLoading(false);
    }

    validateAndLoad();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo className="h-16 opacity-50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md animate-fade-in">
          <div className="mb-6 rounded-full bg-destructive/10 p-4 inline-block">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
            Link Indisponível
          </h1>
          <p className="mb-8 text-muted-foreground">
            {error}
          </p>
          <Button asChild className="bg-charcoal text-white hover:bg-charcoal-light">
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
              Entrar em Contato
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo className="h-10 w-40" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Acesso exclusivo para</p>
              <p className="font-medium text-foreground">{accessLink?.investor_name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-secondary via-background to-background">
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl animate-slide-up">
            Oportunidades <span className="text-primary">Exclusivas</span> de Investimento
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground animate-fade-in">
            Imóveis irregulares com alto potencial de valorização após regularização. 
            Selecionados especialmente para investidores qualificados.
          </p>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                Nenhum imóvel disponível no momento
              </h2>
              <p className="text-muted-foreground">
                Em breve teremos novas oportunidades. Fique atento!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {properties.length} {properties.length === 1 ? 'Imóvel Disponível' : 'Imóveis Disponíveis'}
                </h2>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <div key={property.id} className="animate-slide-up">
                    <PropertyCard 
                      property={property} 
                      linkPrefix={`/catalogo/${token}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-charcoal py-8">
        <div className="container mx-auto px-4 text-center">
          <Logo className="mx-auto mb-4 h-8" />
          <p className="text-sm text-white/70">
            © {new Date().getFullYear()} JMob Gestão e Negócios. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
