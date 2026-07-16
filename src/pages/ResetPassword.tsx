import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import capiMascot from '@/assets/capi-mascot.png';
import { Logo } from '@/components/Logo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        settled = true;
        setReady(true);
        setChecking(false);
      }
    });

    // Sessão já restaurada do link (hash) antes do listener.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      if (session) {
        setReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Não foi possível atualizar a senha.');
      return;
    }
    toast.success('Senha atualizada! Você já pode usar a área de gestão.');
    navigate('/admin');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-ink-900">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(circle at 50% 28%, hsl(40 45% 58% / 0.32) 0%, transparent 52%)',
          }}
        />
        <img
          src={capiMascot}
          alt=""
          className="pointer-events-none absolute left-1/2 top-[8%] h-[min(52vh,420px)] w-auto -translate-x-1/2 object-contain opacity-[0.18]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/55 to-ink-900/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="mb-5 flex justify-center">
          <img
            src={capiMascot}
            alt="Capí — mascote Tijolo em Capital"
            className="h-28 w-28 object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] sm:h-32 sm:w-32"
          />
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/45 p-8 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-9">
          <div className="mb-8 text-center">
            <div className="flex justify-center">
              <Logo tone="gold" className="h-11 w-auto sm:h-12" alt="Tijolo em Capital" />
            </div>
            <p className="mt-4 text-sm text-white/70">Defina uma nova senha</p>
          </div>

          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
            </div>
          ) : !ready ? (
            <div className="space-y-4 text-center">
              <p className="text-sm leading-relaxed text-white/70">
                Este link de redefinição é inválido ou expirou. Solicite um novo na tela de login.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-gold text-sm font-semibold text-ink-900"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha"
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-brand-gold/60 focus:bg-white/10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirmar nova senha"
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-brand-gold/60 focus:bg-white/10"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-brand-gold text-sm font-semibold text-ink-900 shadow-lg shadow-brand-gold/20 transition-all duration-200 hover:enabled:-translate-y-0.5 hover:enabled:bg-brand-goldSoft disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
