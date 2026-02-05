import { Property } from '@/types/database';
import { formatCurrency, calculateAppreciation } from '@/lib/formatCurrency';
import { MapPin, TrendingUp, Home, Building2, LandPlot, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyCardProps {
  property: Property;
  linkPrefix?: string;
}

const propertyTypeIcons: Record<string, React.ElementType> = {
  casa: Home,
  apartamento: Building2,
  terreno: LandPlot,
  comercial: Store,
  outro: Home,
};

const propertyTypeLabels: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
  comercial: 'Comercial',
  outro: 'Outro',
};

export function PropertyCard({ property, linkPrefix = '' }: PropertyCardProps) {
  const appreciation = calculateAppreciation(
    property.acquisition_cost,
    property.projected_value
  );
  
  const TypeIcon = propertyTypeIcons[property.property_type] || Home;
  
  return (
    <Link 
      to={`${linkPrefix}/imovel/${property.id}`}
      className="group block"
    >
      <div className="card-premium overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {property.cover_image ? (
            <img
              src={property.cover_image}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <TypeIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Highlight Tag Badge */}
          {property.highlight_tag && (
            <div className="absolute left-3 top-3 z-10">
              <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground uppercase tracking-wide shadow-lg">
                {property.highlight_tag}
              </span>
            </div>
          )}
          
          {/* Property Type Badge */}
          <div className={`absolute ${property.highlight_tag ? 'left-3 top-11' : 'left-3 top-3'}`}>
            <span className="badge-gold flex items-center gap-1.5">
              <TypeIcon className="h-3 w-3" />
              {propertyTypeLabels[property.property_type]}
            </span>
          </div>
          
          {/* Appreciation Badge */}
          {appreciation > 0 && (
            <div className="absolute right-3 top-3">
              <span className="flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <TrendingUp className="h-3 w-3" />
                +{appreciation.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          
          {(property.neighborhood || property.city) && (
            <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[property.neighborhood, property.city].filter(Boolean).join(', ')}
            </p>
          )}
          
          <div className="flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor de Aquisição</p>
              <p className="font-display text-xl font-bold text-primary">
                {formatCurrency(property.acquisition_cost)}
              </p>
            </div>
            
            {property.projected_value && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Valor Projetado</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(property.projected_value)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
