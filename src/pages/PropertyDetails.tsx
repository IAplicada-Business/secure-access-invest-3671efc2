import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, Setting } from '@/types/database';
import { formatCurrency, calculateAppreciation } from '@/lib/formatCurrency';
import { DEFAULT_WHATSAPP } from '@/hooks/useWhatsappNumber';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  MapPin, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Building2,
  LandPlot,
  Store,
  FileText,
  Map,
  Receipt,
  FileCheck,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { InvestmentAnalysis } from '@/components/InvestmentAnalysis';
import useEmblaCarousel from 'embla-carousel-react';

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

const riskConfig: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  baixo: { bg: 'bg-green-100', text: 'text-green-700', icon: ShieldCheck, label: 'Risco Baixo' },
  medio: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle, label: 'Risco Médio' },
  alto: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertOctagon, label: 'Risco Alto' },
};

export default function PropertyDetails() {
  const { token, propertyId } = useParams<{ token: string; propertyId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP);
  const [greetingName, setGreetingName] = useState('Olá Juliê!');
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const pageViewIdRef = useRef<string | null>(null);
  const maxScrollDepthRef = useRef<number>(0);

  // Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Scroll depth tracking
  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollPercent = Math.round((scrollTop + windowHeight) / documentHeight * 100);
      
      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = scrollPercent;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      // Load saudação dinâmica (settings.greeting_name); mantém o default se não existir
      const { data: greetingData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'greeting_name')
        .maybeSingle();

      if (greetingData?.value) {
        setGreetingName(greetingData.value);
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
            scroll_depth_percent: 0,
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

    // Update time spent and scroll depth on unmount
    return () => {
      if (pageViewIdRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const scrollDepth = maxScrollDepthRef.current;
        const accessLinkId = sessionStorage.getItem('access_link_id');
        const propId = propertyId;
        const viewId = pageViewIdRef.current;
        
        supabase
          .from('page_views')
          .update({ 
            time_spent_seconds: timeSpent,
            scroll_depth_percent: scrollDepth
          })
          .eq('id', viewId)
          .then(() => {
            // Calculate interest score and create notification if needed
            if (accessLinkId && propId) {
              calculateAndNotify(accessLinkId, propId);
            }
          });
      }
    };
  }, [propertyId, token, navigate]);

  // Calcula o interest score e cria a notificação de hot_lead via edge function
  // (server-side, com service_role). Lógica centralizada em um único lugar
  // (supabase/functions/calculate-interest-score) e compatível com a RLS de
  // notifications restrita a service_role.
  async function calculateAndNotify(accessLinkId: string, propId: string) {
    try {
      await supabase.functions.invoke('calculate-interest-score', {
        body: { access_link_id: accessLinkId, property_id: propId },
      });
    } catch (error) {
      console.error('Error calculating interest score:', error);
    }
  }

  async function handleCtaClick() {
    const accessLinkId = sessionStorage.getItem('access_link_id');
    
    // Track CTA click (fire and forget)
    if (accessLinkId && propertyId) {
      supabase
        .from('cta_clicks')
        .insert({
          access_link_id: accessLinkId,
          property_id: propertyId,
        })
        .then(() => {
          // Calculate score and create notification after CTA click
          calculateAndNotify(accessLinkId, propertyId);
        });
    }

    // Open WhatsApp (don't block)
    window.open(whatsappUrl, '_blank');
  }

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
  const riskInfo = property.risk_level ? riskConfig[property.risk_level] : null;

  const whatsappMessage = encodeURIComponent(
    `${greetingName} Vi o imóvel "${property.title}" no catálogo e gostei. Podemos conversar?`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const documentItems = [
    { key: 'has_matricula', label: 'Matrícula', icon: FileText, value: property.has_matricula },
    { key: 'has_planta', label: 'Planta Aprovada', icon: Map, value: property.has_planta },
    { key: 'has_iptu', label: 'IPTU em Dia', icon: Receipt, value: property.has_iptu },
    { key: 'has_certidoes', label: 'Certidões', icon: FileCheck, value: property.has_certidoes },
  ];

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
            <Logo className="h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Carousel */}
          <div className="animate-fade-in">
            {allImages.length > 0 ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl bg-muted">
                  <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                      {allImages.map((img, idx) => (
                        <div key={idx} className="flex-[0_0_100%] min-w-0">
                          <div className="aspect-video relative">
                            <img
                              src={img}
                              alt={`${property.title} - Imagem ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={scrollPrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={scrollNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Dots Indicator */}
                {allImages.length > 1 && (
                  <div className="flex justify-center gap-2">
                    {scrollSnaps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollTo(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === selectedIndex 
                            ? 'w-6 bg-primary' 
                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center rounded-xl bg-gradient-to-br from-muted to-secondary">
                <TypeIcon className="h-24 w-24 text-muted-foreground/30" />
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
              <p className="mb-4 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
              </p>
            )}

            {/* Google Maps Embed */}
            {property.latitude && property.longitude && (
              <div className="mb-6 overflow-hidden rounded-xl border border-border">
                <iframe
                  src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                  className="h-[200px] lg:h-[250px] w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização do imóvel"
                />
              </div>
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
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              {property.regularization_time && (
                <div className="card-premium p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Prazo Estimado</h3>
                  </div>
                  <p className="text-muted-foreground">{property.regularization_time}</p>
                </div>
              )}

              <div className="card-premium p-5">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Riscos Mapeados</h3>
                </div>
                
                {/* Risk Level Badge */}
                {riskInfo && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${riskInfo.bg} ${riskInfo.text} mb-3`}>
                    <riskInfo.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{riskInfo.label}</span>
                  </div>
                )}
                
                {property.risks && (
                  <p className="text-muted-foreground text-sm">{property.risks}</p>
                )}
              </div>
            </div>

            {/* Documentation Available */}
            <div className="card-premium mb-6 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Documentação Disponível
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {documentItems.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.value 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-muted bg-muted/30'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${item.value ? 'text-green-600' : 'text-muted-foreground/50'}`} />
                    <span className={`text-sm font-medium ${item.value ? 'text-green-700' : 'text-muted-foreground/70'}`}>
                      {item.label}
                    </span>
                    {item.value ? (
                      <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/40 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Analysis Section */}
            <InvestmentAnalysis property={property} />

            {/* Investor Notes */}
            {property.investor_notes && (
              <div className="card-premium mt-6 p-6 border-primary/30 bg-primary/5">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Observações para o Investidor
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {property.investor_notes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm p-4 z-50">
        <div className="container mx-auto">
          <Button onClick={handleCtaClick} className="w-full btn-gold py-6 text-lg">
            <MessageCircle className="mr-2 h-5 w-5" />
            Tenho interesse neste imóvel
          </Button>
        </div>
      </div>
    </div>
  );
}