import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Send, X, Minimize2 } from 'lucide-react';
import ownerPhoto from '@/assets/owner-photo.jpg';

/** Recorte do rosto da mascote (foto full-body: rosto no terço superior). */
const CAPY_FACE = 'object-cover object-[center_14%]';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Quantos leads temos no funil?',
  'Como está a receita do mês?',
  'Há comissões pendentes?',
  'Quantos imóveis publicados?',
];

export function PlatformAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Oi! Sou a Capí, assistente da Tijolo em Capital. Pergunte sobre leads, imóveis, financeiro, regularizações ou o que estiver no painel — eu consulto os dados do sistema.',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('platform-assistant', {
        body: {
          message: trimmed,
          history: nextHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Sem resposta.' }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Não foi possível falar com a assistente.';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Desculpe — ${msg} Se a função ainda não foi publicada no Supabase, peça para deployar \`platform-assistant\`.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          className="pointer-events-auto flex h-[min(560px,72vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-[0_24px_48px_-16px_rgba(20,18,12,.28)]"
          role="dialog"
          aria-label="Assistente Capí"
        >
          <div className="flex items-center gap-3 border-b border-cream-200 bg-gradient-to-r from-ink-900 to-ink-700 px-4 py-3 text-white">
            <img
              src={ownerPhoto}
              alt=""
              className={cn('h-10 w-10 rounded-full scale-125 ring-2 ring-brand-gold/70', CAPY_FACE)}
            />
            <div className="min-w-0 flex-1">
              <p className="font-ds-display text-base font-medium leading-tight">Capí</p>
              <p className="truncate text-[11px] text-white/65">Assistente · dados ao vivo do painel</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimizar"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-cream-50/60 px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <img
                    src={ownerPhoto}
                    alt=""
                    className={cn('mt-0.5 h-7 w-7 flex-shrink-0 rounded-full scale-125', CAPY_FACE)}
                  />
                )}
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'rounded-br-md bg-ink-900 text-white'
                      : 'rounded-bl-md border border-cream-200 bg-white text-ink-700',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-ink-300">
                <img src={ownerPhoto} alt="" className={cn('h-7 w-7 rounded-full scale-125 opacity-80', CAPY_FACE)} />
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-gold" />
                Consultando o sistema…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-cream-200 bg-white px-3 py-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-ds-pill border border-cream-200 bg-cream-50 px-2.5 py-1 text-[11px] text-ink-700 transition hover:border-brand-gold hover:text-brand-goldDeep"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t border-cream-200 bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre o painel…"
              disabled={loading}
              className="h-10 flex-1 rounded-ds-lg border border-cream-200 bg-cream-50 px-3 text-sm outline-none transition focus:border-brand-gold/60"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'pointer-events-auto group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 ring-brand-gold/50 transition duration-300',
          'hover:scale-105 hover:ring-brand-gold focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/40',
          open && 'ring-brand-gold',
        )}
        aria-label={open ? 'Fechar assistente Capí' : 'Abrir assistente Capí'}
      >
        <img src={ownerPhoto} alt="Capí" className={cn('h-full w-full scale-125', CAPY_FACE)} />
        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-semantic-success" />
      </button>
    </div>
  );
}
