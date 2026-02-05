import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Erro ao fazer login: ' + error.message);
      setLoading(false);
      return;
    }

    toast.success('Login realizado com sucesso!');
    navigate('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Logo className="mx-auto h-40 mb-8" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-2">
            Entre com suas credenciais
          </p>
        </div>

        <form onSubmit={handleLogin} className="card-premium p-8 space-y-5 border border-border shadow-lg">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
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
            <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
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
            className="w-full h-11 bg-charcoal text-white hover:bg-charcoal-light font-medium text-base"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          Acesso restrito a administradores
        </p>
      </div>
    </div>
  );
}
