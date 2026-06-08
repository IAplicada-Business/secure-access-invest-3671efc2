import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, ShieldCheck, UserPlus, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, EmptyState, Drawer } from '@/components/ui-system';
import { ADMIN_SCREENS } from '@/lib/adminScreens';

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  is_admin: boolean;
  screens: string[];
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', is_admin: false, screens: [] as string[] });

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      supabase.from('profiles').select('id, email, name, created_at').order('created_at', { ascending: true }),
      supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
      supabase.from('user_screen_permissions').select('user_id, screen'),
    ]);
    const adminSet = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id));
    const permMap = new Map<string, string[]>();
    (perms ?? []).forEach((p: { user_id: string; screen: string }) => {
      permMap.set(p.user_id, [...(permMap.get(p.user_id) ?? []), p.screen]);
    });
    setUsers((profiles ?? []).map((p: { id: string; email: string | null; name: string | null; created_at: string }) => ({
      ...p,
      is_admin: adminSet.has(p.id),
      screens: permMap.get(p.id) ?? [],
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || form.password.length < 6) {
      toast.error('Informe e-mail e senha (mín. 6 caracteres).');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_create_user', {
      p_email: form.email.trim(),
      p_password: form.password,
      p_name: form.name.trim() || form.email.trim(),
      p_is_admin: form.is_admin,
      p_screens: form.is_admin ? [] : form.screens,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro: ' + (error.message || 'falha ao criar usuário'));
      return;
    }
    toast.success('Usuário criado! Entregue a senha provisória para ele trocar depois.');
    setDrawerOpen(false);
    setForm({ name: '', email: '', password: '', is_admin: false, screens: [] });
    load();
  }

  async function toggleAdmin(u: UserRow) {
    if (u.is_admin) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', u.id).eq('role', 'admin');
      if (error) { toast.error('Erro ao remover admin'); return; }
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: u.id, role: 'admin' });
      if (error) { toast.error('Erro ao tornar admin'); return; }
    }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_admin: !x.is_admin } : x));
    toast.success(u.is_admin ? 'Admin removido' : 'Agora é administrador');
  }

  async function toggleScreen(u: UserRow, screen: string, allowed: boolean) {
    if (allowed) {
      const { error } = await supabase.from('user_screen_permissions').insert({ user_id: u.id, screen });
      if (error) { toast.error('Erro ao liberar tela'); return; }
    } else {
      const { error } = await supabase.from('user_screen_permissions').delete().eq('user_id', u.id).eq('screen', screen);
      if (error) { toast.error('Erro ao remover tela'); return; }
    }
    setUsers(prev => prev.map(x => x.id === u.id
      ? { ...x, screens: allowed ? [...x.screens, screen] : x.screens.filter(s => s !== screen) }
      : x));
  }

  return (
    <div className="space-y-6 font-ds-body">
      <PageHeader
        title="Usuários"
        subtitle="Cadastre a equipe e libere o acesso de cada um por tela."
        actions={<Button onClick={() => setDrawerOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Novo usuário</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserPlus} title="Nenhum usuário" body="Crie o primeiro usuário da equipe." action={<Button onClick={() => setDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>} />
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <div key={u.id} className="rounded-ds-lg border border-cream-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-sm font-semibold text-brand-goldDeep">
                    {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-ink-900">{u.name || '—'}</p>
                    <p className="text-xs text-ink-300">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.is_admin && <Badge className="bg-brand-goldSoft/30 text-brand-goldDeep"><ShieldCheck className="mr-1 h-3 w-3" /> Administrador</Badge>}
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <Checkbox checked={u.is_admin} onCheckedChange={() => toggleAdmin(u)} />
                    Admin (acesso total)
                  </label>
                </div>
              </div>

              {!u.is_admin && (
                <div className="mt-4 border-t border-cream-200 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-300">Telas liberadas</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {ADMIN_SCREENS.map(s => (
                      <label key={s.key} className="flex items-center gap-2 text-sm text-ink-700">
                        <Checkbox
                          checked={u.screens.includes(s.key)}
                          onCheckedChange={(c) => toggleScreen(u, s.key, c === true)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Novo usuário */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Novo usuário" description="Crie com uma senha provisória — a pessoa troca depois.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
          <div className="space-y-2">
            <Label>Senha provisória *</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="mín. 6 caracteres" required />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <Checkbox checked={form.is_admin} onCheckedChange={(c) => setForm(p => ({ ...p, is_admin: c === true }))} />
            Administrador (acesso total)
          </label>
          {!form.is_admin && (
            <div className="space-y-2">
              <Label>Telas liberadas</Label>
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_SCREENS.map(s => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-ink-700">
                    <Checkbox
                      checked={form.screens.includes(s.key)}
                      onCheckedChange={(c) => setForm(p => ({
                        ...p,
                        screens: c === true ? [...p.screens, s.key] : p.screens.filter(x => x !== s.key),
                      }))}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar usuário</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
