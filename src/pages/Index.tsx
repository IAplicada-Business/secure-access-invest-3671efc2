import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ownerPhoto from '@/assets/owner-photo.jpg';
import { Logo } from '@/components/Logo';

export default function Index() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/admin');
      } else {
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Credenciais inválidas. Tente novamente.');
      setLoading(false);
      return;
    }

    toast.success('Login realizado com sucesso!');
    navigate('/admin');
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Branding background — mascote full-bleed */}
      <div className="absolute inset-0">
        <img
          src={ownerPhoto}
          alt=""
          className="h-full w-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-ink-900/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/35 to-ink-900/40" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, hsl(40 45% 58% / 0.28) 0%, transparent 55%)',
          }}
        />
      </div>

      {/* Glass login card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="rounded-2xl border border-white/15 bg-black/45 p-8 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-9">
          <div className="mb-8 flex justify-center">
            <Logo tone="gold" className="h-11 w-auto sm:h-12" alt="Tijolo em Capital" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                required
                autoComplete="email"
                className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-brand-gold/60 focus:bg-white/10"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                autoComplete="current-password"
                className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-brand-gold/60 focus:bg-white/10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-brand-gold text-sm font-semibold text-ink-900 shadow-lg shadow-brand-gold/20 transition-all duration-200 hover:enabled:-translate-y-0.5 hover:enabled:bg-brand-goldSoft hover:enabled:shadow-brand-gold/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
