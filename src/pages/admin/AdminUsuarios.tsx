import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, ShieldCheck, UserPlus, KeyRound, Pencil, Trash2 } from 'lucide-react';
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

  // Edição de usuário
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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
    const makeAdmin = !u.is_admin;
    const { error } = makeAdmin
      ? await supabase.from('user_roles').upsert({ user_id: u.id, role: 'admin' }, { onConflict: 'user_id,role', ignoreDuplicates: true })
      : await supabase.from('user_roles').delete().eq('user_id', u.id).eq('role', 'admin');
    if (error) { toast.error('Erro: ' + error.message); load(); return; }
    toast.success(makeAdmin ? 'Agora é administrador' : 'Admin removido');
    load();
  }

  async function toggleScreen(u: UserRow, screen: string, allowed: boolean) {
    const { error } = allowed
      ? await supabase.from('user_screen_permissions').upsert({ user_id: u.id, screen }, { onConflict: 'user_id,screen', ignoreDuplicates: true })
      : await supabase.from('user_screen_permissions').delete().eq('user_id', u.id).eq('screen', screen);
    if (error) { toast.error('Erro: ' + error.message); load(); return; }
    setUsers(prev => prev.map(x => x.id === u.id
      ? { ...x, screens: allowed ? [...x.screens, screen] : x.screens.filter(s => s !== screen) }
      : x));
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditName(u.name ?? '');
    setEditPassword('');
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    try {
      if (editName.trim() && editName.trim() !== (editUser.name ?? '')) {
        const { error } = await supabase.from('profiles').update({ name: editName.trim() }).eq('id', editUser.id);
        if (error) throw error;
      }
      if (editPassword) {
        if (editPassword.length < 6) { toast.error('A senha deve ter ao menos 6 caracteres'); setEditSaving(false); return; }
        const { error } = await supabase.rpc('admin_set_password', { p_user_id: editUser.id, p_password: editPassword });
        if (error) throw error;
      }
      toast.success('Usuário atualizado!');
      setEditUser(null);
      load();
    } catch (err) {
      toast.error('Erro: ' + ((err as { message?: string }).message || 'falha ao salvar'));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!editUser) return;
    if (!window.confirm(`Excluir o usuário ${editUser.email}? Esta ação não pode ser desfeita.`)) return;
    setEditSaving(true);
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: editUser.id });
    setEditSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Usuário excluído');
    setEditUser(null);
    load();
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
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
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

      {/* Editar usuário */}
      <Drawer open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }} title="Editar usuário" description={editUser?.email ?? ''}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="deixe em branco para manter" />
            </div>
            <p className="text-xs text-ink-300">Os acessos (admin / telas) são editados direto no card do usuário.</p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={editSaving}>
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button type="submit" disabled={editSaving}>{editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
