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
  MessageSquare,
  KanbanSquare,
  ClipboardList,
  UserCog
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ADMIN_SCREENS } from '@/lib/adminScreens';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedScreens, setAllowedScreens] = useState<Set<string>>(new Set());

  // Admin vê tudo; não-admin só as telas liberadas.
  const can = (key: string) => isAdmin || allowedScreens.has(key);

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
        navigate('/');
        return;
      }

      // Admin?
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Não-admin: só entra se tiver alguma tela liberada.
      const { data: perms } = await supabase
        .from('user_screen_permissions')
        .select('screen')
        .eq('user_id', session.user.id);

      if (!perms || perms.length === 0) {
        toast.error('Acesso negado. Você não tem telas liberadas.');
        await supabase.auth.signOut();
        navigate('/');
        return;
      }

      setAllowedScreens(new Set(perms.map((p) => p.screen)));
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Guarda de rota: bloqueia não-admin em telas não liberadas.
  useEffect(() => {
    if (loading || isAdmin) return;
    const path = location.pathname;

    // Sempre restritas a admin.
    const adminOnly = ['/admin/usuarios', '/admin/design-system'];
    let denied = adminOnly.some((p) => path.startsWith(p));

    if (!denied) {
      const isIndex = path === '/admin' || path === '/admin/';
      const screenKey = isIndex
        ? 'dashboard'
        : ADMIN_SCREENS.find((s) => s.paths.some((p) => path.startsWith(p)))?.key;
      denied = !screenKey || !allowedScreens.has(screenKey);
    }

    if (denied) {
      const first = ADMIN_SCREENS.find((s) => allowedScreens.has(s.key));
      if (first) {
        navigate(first.paths[0], { replace: true });
      } else {
        toast.error('Você não tem telas liberadas.');
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, loading, isAdmin, allowedScreens, navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/');
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

  const mobileItem = "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors";
  const mobileSub = mobileItem + " pl-12";

  return (
    <div className="min-h-screen bg-secondary">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/admin" className="flex-shrink-0">
              <Logo className="h-10 w-auto" />
            </Link>

            {/* Desktop Navigation - Dropdowns */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                {/* Dashboard dropdown */}
                {can('dashboard') && (
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
                )}

                {/* Imóveis dropdown */}
                {(can('imoveis') || can('submissoes')) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/imoveis', '/admin/submissoes'])), "gap-1.5")}>
                      <Building2 className="h-4 w-4" />
                      Imóveis
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {can('imoveis') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/imoveis" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Imóveis
                      </Link>
                    </DropdownMenuItem>
                    )}
                    {can('submissoes') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/submissoes" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        Submissões
                      </Link>
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}

                {/* Links */}
                {can('links') && (
                <Link to="/admin/links" className={navLinkClasses(isRouteActive('/admin/links'))}>
                  <LinkIcon className="h-4 w-4" />
                  Links
                </Link>
                )}

                {/* Financeiro */}
                {can('financeiro') && (
                <Link to="/admin/financeiro" className={navLinkClasses(isRouteActive('/admin/financeiro'))}>
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </Link>
                )}

                {/* Regularizações */}
                {can('regularizacoes') && (
                <Link to="/admin/regularizacoes" className={navLinkClasses(isRouteActive('/admin/regularizacoes'))}>
                  <ClipboardList className="h-4 w-4" />
                  Regularizações
                </Link>
                )}

                {/* Comunicações dropdown */}
                {(can('comunicacoes') || can('documentos')) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/comunicacoes', '/admin/documentos'])), "gap-1.5")}>
                      <MessageSquare className="h-4 w-4" />
                      Comunicações
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {can('comunicacoes') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/comunicacoes" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comunicações
                      </Link>
                    </DropdownMenuItem>
                    )}
                    {can('documentos') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/documentos" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </Link>
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}

                {/* CRM dropdown */}
                {(can('crm') || can('clientes') || can('parceiros')) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(navLinkClasses(isGroupActive(['/admin/crm', '/admin/contatos', '/admin/clientes', '/admin/parceiros'])), "gap-1.5")}>
                      <Users className="h-4 w-4" />
                      CRM
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {can('crm') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/crm" className="flex items-center gap-2">
                        <KanbanSquare className="h-4 w-4" />
                        Funil (Kanban)
                      </Link>
                    </DropdownMenuItem>
                    )}
                    {can('clientes') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/contatos" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Contatos
                      </Link>
                    </DropdownMenuItem>
                    )}
                    {can('parceiros') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/parceiros" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Parceiros
                      </Link>
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
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

              {(isAdmin || can('configuracoes')) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {can('configuracoes') && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/configuracoes" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Configurações
                    </Link>
                  </DropdownMenuItem>
                  )}
                  {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/usuarios" className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" /> Usuários
                    </Link>
                  </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              )}

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
            <nav className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-3 space-y-1">
              {can('dashboard') && (<>
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <LayoutDashboard className="h-5 w-5" />Dashboard
              </Link>
              <Link to="/admin/relatorios" onClick={() => setMobileMenuOpen(false)} className={mobileSub}>
                <BarChart3 className="h-4 w-4" />Relatórios
              </Link>
              </>)}
              {can('imoveis') && (
              <Link to="/admin/imoveis" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <Building2 className="h-5 w-5" />Imóveis
              </Link>
              )}
              {can('submissoes') && (
              <Link to="/admin/submissoes" onClick={() => setMobileMenuOpen(false)} className={mobileSub}>
                <Inbox className="h-4 w-4" />Submissões
              </Link>
              )}
              {can('links') && (
              <Link to="/admin/links" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <LinkIcon className="h-5 w-5" />Links
              </Link>
              )}
              {can('financeiro') && (
              <Link to="/admin/financeiro" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <DollarSign className="h-5 w-5" />Financeiro
              </Link>
              )}
              {can('regularizacoes') && (
              <Link to="/admin/regularizacoes" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <ClipboardList className="h-5 w-5" />Regularizações
              </Link>
              )}
              {can('comunicacoes') && (
              <Link to="/admin/comunicacoes" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <MessageSquare className="h-5 w-5" />Comunicações
              </Link>
              )}
              {can('documentos') && (
              <Link to="/admin/documentos" onClick={() => setMobileMenuOpen(false)} className={mobileSub}>
                <FileText className="h-4 w-4" />Documentos
              </Link>
              )}
              {can('crm') && (
              <Link to="/admin/crm" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <KanbanSquare className="h-5 w-5" />CRM (Funil)
              </Link>
              )}
              {can('clientes') && (
              <Link to="/admin/contatos" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <Users className="h-5 w-5" />Contatos
              </Link>
              )}
              {can('parceiros') && (
              <Link to="/admin/parceiros" onClick={() => setMobileMenuOpen(false)} className={mobileSub}>
                <Users className="h-4 w-4" />Parceiros
              </Link>
              )}
              {can('configuracoes') && (
              <Link to="/admin/configuracoes" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <Settings className="h-5 w-5" />Configurações
              </Link>
              )}
              {isAdmin && (
              <Link to="/admin/usuarios" onClick={() => setMobileMenuOpen(false)} className={mobileItem}>
                <UserCog className="h-5 w-5" />Usuários
              </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
