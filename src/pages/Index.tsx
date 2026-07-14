import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import ownerPhoto from '@/assets/owner-photo.jpg';
import { Logo } from '@/components/Logo';

export default function Index() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Photo + Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 items-end justify-start overflow-hidden">
        {/* Background Photo */}
        <img
          src={ownerPhoto}
          alt="Tijolo em Capital"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/60 to-charcoal/30" />
        {/* Spotlight effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 70%, hsl(40 45% 58% / 0.4) 0%, transparent 60%)',
          }}
        />

        {/* Content over photo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 p-12 pb-16 max-w-lg"
        >
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4 leading-tight">
            Transformando irregularidades
            <br />
            <span className="text-primary">em oportunidades.</span>
          </h2>
          <p className="text-primary-foreground/70 text-base leading-relaxed">
            Gestão inteligente de imóveis com expertise em regularização fundiária
            e alto potencial de valorização.
          </p>
        </motion.div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-auto sm:h-14" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Painel de Gestão
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Entre com suas credenciais para acessar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input-premium h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium text-sm">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-premium h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-charcoal text-primary-foreground hover:bg-charcoal-light font-medium text-base transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs">Acesso restrito a usuários autorizados</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
