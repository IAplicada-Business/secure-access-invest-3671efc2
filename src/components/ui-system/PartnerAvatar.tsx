import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type PartnerAvatarPartner = {
  id: string;
  name: string;
  logo_path?: string | null;
};

type PartnerAvatarProps = {
  partner?: PartnerAvatarPartner | null;
  partnerId?: string;
  name?: string | null;
  logoPath?: string | null;
  size?: number;
  className?: string;
};

const LOGOS_BUCKET = 'partners-logos';

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getLogoUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const { data } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function PartnerAvatar({
  partner,
  partnerId,
  name,
  logoPath,
  size = 40,
  className,
}: PartnerAvatarProps) {
  const partnerName = partner?.name ?? name ?? partnerId ?? 'Parceiro';
  const path = partner?.logo_path ?? logoPath ?? null;
  const logoUrl = getLogoUrl(path);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-ds-pill border border-brand-gold/25 bg-brand-gold text-center font-ds-display font-semibold text-ink-900 shadow-sm',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
      }}
      aria-label={`Logo de ${partnerName}`}
      title={partnerName}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo de ${partnerName}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        getInitials(partnerName)
      )}
    </span>
  );
}
