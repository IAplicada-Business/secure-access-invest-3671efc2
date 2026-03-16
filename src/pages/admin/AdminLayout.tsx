import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { 
  LayoutDashboard, 
  Building2, 
  Link as LinkIcon, 
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Inbox,
  Users,
  ChevronDown,
  DollarSign,
  FileText,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRouteActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (paths: string[]) => paths.some(p => location.pathname.startsWith(p));

  const navLinkClasses = (active: boolean) =>
    cn(
      "relative z-10 flex items-center gap-2 cursor-pointer px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login');
        return;
      }

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        toast.error('Acesso negado. Você não tem permissão de administrador.');
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }

      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/admin/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo className="h-12 opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/admin" className="flex-shrink-0">
              <Logo variant="icon" className="h-12 w-12" />
            </Link>

            {/* Desktop Navigation - Dropdowns */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                {/* Dashboard dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/relatorios']) || isRouteActive('/admin', true)), "gap-1.5")}>
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/relatorios" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Relatórios
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Imóveis dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/imoveis', '/admin/submissoes'])), "gap-1.5")}>
                      <Building2 className="h-4 w-4" />
                      Imóveis
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/admin/imoveis" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Imóveis
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/submissoes" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        Submissões
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Links */}
                <Link to="/admin/links" className={navLinkClasses(isRouteActive('/admin/links'))}>
                  <LinkIcon className="h-4 w-4" />
                  Links
                </Link>

                {/* Financeiro */}
                <Link to="/admin/financeiro" className={navLinkClasses(isRouteActive('/admin/financeiro'))}>
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </Link>

                {/* Comunicações dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/comunicacoes', '/admin/documentos'])), "gap-1.5")}>
                      <MessageSquare className="h-4 w-4" />
                      Comunicações
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/admin/comunicacoes" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comunicações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/documentos" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* CRM dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/clientes', '/admin/parceiros'])), "gap-1.5")}>
                      <Users className="h-4 w-4" />
                      CRM
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link to="/admin/clientes" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clientes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/parceiros" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Parceiros
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              <NotificationBell />
              
              <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/admin/configuracoes">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card">
            <nav className="mx-auto max-w-7xl px-4 py-3 space-y-1">
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <LayoutDashboard className="h-5 w-5" />Dashboard
              </Link>
              <Link to="/admin/relatorios" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 pl-12 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <BarChart3 className="h-4 w-4" />Relatórios
              </Link>
              <Link to="/admin/imoveis" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Building2 className="h-5 w-5" />Imóveis
              </Link>
              <Link to="/admin/submissoes" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 pl-12 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Inbox className="h-4 w-4" />Submissões
              </Link>
              <Link to="/admin/links" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <LinkIcon className="h-5 w-5" />Links
              </Link>
              <Link to="/admin/financeiro" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <DollarSign className="h-5 w-5" />Financeiro
              </Link>
              <Link to="/admin/comunicacoes" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <MessageSquare className="h-5 w-5" />Comunicações
              </Link>
              <Link to="/admin/documentos" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 pl-12 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <FileText className="h-4 w-4" />Documentos
              </Link>
              <Link to="/admin/clientes" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Users className="h-5 w-5" />Clientes
              </Link>
              <Link to="/admin/parceiros" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 pl-12 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Users className="h-4 w-4" />Parceiros
              </Link>
              <Link to="/admin/configuracoes" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Settings className="h-5 w-5" />Configurações
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
