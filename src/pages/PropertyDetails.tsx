import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, Setting } from '@/types/database';
import { formatCurrency, calculateAppreciation } from '@/lib/formatCurrency';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  MapPin, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Building2,
  LandPlot,
  Store
} from 'lucide-react';
import { InvestmentAnalysis } from '@/components/InvestmentAnalysis';

const propertyTypeLabels: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
  comercial: 'Comercial',
  outro: 'Outro',
};

const propertyTypeIcons: Record<string, React.ElementType> = {
  casa: Home,
  apartamento: Building2,
  terreno: LandPlot,
  comercial: Store,
  outro: Home,
};

export default function PropertyDetails() {
  const { token, propertyId } = useParams<{ token: string; propertyId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const pageViewIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!propertyId) return;

      // Load property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('status', 'published')
        .single();

      if (propertyError || !propertyData) {
        navigate(`/catalogo/${token}`);
        return;
      }

      setProperty(propertyData as Property);

      // Load WhatsApp number
      const { data: settingData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_number')
        .single();

      if (settingData) {
        setWhatsappNumber(settingData.value);
      }

      // Create page view record
      const accessLinkId = sessionStorage.getItem('access_link_id');
      if (accessLinkId) {
        const { data: viewData } = await supabase
          .from('page_views')
          .insert({
            access_link_id: accessLinkId,
            property_id: propertyId,
            time_spent_seconds: 0,
          })
          .select('id')
          .single();

        if (viewData) {
          pageViewIdRef.current = viewData.id;
        }
      }

      setLoading(false);
    }

    loadData();
    startTimeRef.current = Date.now();

    // Update time spent on unmount
    return () => {
      if (pageViewIdRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        supabase
          .from('page_views')
          .update({ time_spent_seconds: timeSpent })
          .eq('id', pageViewIdRef.current)
          .then(() => {});
      }
    };
  }, [propertyId, token, navigate]);

  if (loading || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo className="h-16 opacity-50" />
        </div>
      </div>
    );
  }

  const appreciation = calculateAppreciation(
    property.acquisition_cost,
    property.projected_value
  );

  const allImages = property.cover_image 
    ? [property.cover_image, ...property.images.filter(img => img !== property.cover_image)]
    : property.images;

  const TypeIcon = propertyTypeIcons[property.property_type] || Home;

  const whatsappMessage = encodeURIComponent(
    `Olá Juliê! Vi o imóvel "${property.title}" no catálogo e gostei. Podemos conversar?`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to={`/catalogo/${token}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Voltar ao catálogo</span>
            </Link>
            <Logo className="h-8" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="animate-fade-in">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImageIndex]}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                  
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      
                      {/* Dots */}
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
                  <TypeIcon className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === currentImageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="animate-slide-up">
            {/* Type badge */}
            <span className="badge-gold inline-flex items-center gap-1.5 mb-4">
              <TypeIcon className="h-3 w-3" />
              {propertyTypeLabels[property.property_type]}
            </span>

            <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
              {property.title}
            </h1>

            {(property.neighborhood || property.city || property.address) && (
              <p className="mb-6 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
              </p>
            )}

            {/* Investment Summary */}
            <div className="card-premium mb-6 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Resumo do Investimento
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {formatCurrency(property.acquisition_cost)}
                  </p>
                </div>
                
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Custo de Regularização</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {formatCurrency(property.regularization_cost)}
                  </p>
                </div>
                
                <div className="rounded-lg bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Valor Projetado</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {formatCurrency(property.projected_value)}
                  </p>
                </div>
                
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm text-muted-foreground">Valorização Projetada</p>
                  <p className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    +{appreciation.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="card-premium mb-6 p-6">
                <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
                  Descrição
                </h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}

            {/* Time and Risks */}
            <div className="grid gap-4 sm:grid-cols-2">
              {property.regularization_time && (
                <div className="card-premium p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Prazo Estimado</h3>
                  </div>
                  <p className="text-muted-foreground">{property.regularization_time}</p>
                </div>
              )}

              {property.risks && (
                <div className="card-premium p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Riscos Mapeados</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{property.risks}</p>
                </div>
              )}
            </div>

            {/* Investment Analysis Section */}
            <InvestmentAnalysis property={property} />
          </div>
        </div>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm p-4 z-50">
        <div className="container mx-auto">
          <Button asChild className="w-full btn-gold py-6 text-lg">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Tenho interesse neste imóvel
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
