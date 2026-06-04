import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Número de WhatsApp Business da Tijolo em Capital (Juliê).
// Fallback usado enquanto o settings.whatsapp_number não carrega / não existe.
export const DEFAULT_WHATSAPP = '5511944220295';

/**
 * Lê settings.whatsapp_number (chave pública) com fallback para DEFAULT_WHATSAPP.
 * Fonte única do número usado nas páginas públicas.
 */
export function useWhatsappNumber(): string {
  const [number, setNumber] = useState(DEFAULT_WHATSAPP);
  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_number')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setNumber(data.value);
      });
  }, []);
  return number;
}
