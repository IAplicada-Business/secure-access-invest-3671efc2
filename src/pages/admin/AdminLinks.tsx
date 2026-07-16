import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccessLink, SubmissionLink, Client } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Copy, ExternalLink, ToggleLeft, ToggleRight,
  Loader2, MessageCircle, Inbox, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui-system';

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

const emptyInvestorForm = {
  investor_name: '',
  investor_email: '',
  investor_phone: '',
  expires_at: '',
  client_id: '',
};

export default function AdminLinks() {
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AccessLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyInvestorForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [deleteLink, setDeleteLink] = useState<AccessLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [subLinks, setSubLinks] = useState<SubmissionLink[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subDrawerOpen, setSubDrawerOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubmissionLink | null>(null);
  const [subSaving, setSubSaving] = useState(false);
  const [subForm, setSubForm] = useState({ label: '' });
  const [deleteSub, setDeleteSub] = useState<SubmissionLink | null>(null);
  const [subDeleting, setSubDeleting] = useState(false);

  async function loadLinks() {
    const { data, error } = await supabase.from('access_links').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar links'); return; }
    setLinks(data || []);
    setLoading(false);
  }

  async function loadSubLinks() {
    const { data, error } = await supabase.from('submission_links').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar links de submissão'); return; }
    setSubLinks(data || []);
    setSubLoading(false);
  }

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').eq('type', 'investor').order('name');
    setClients(data || []);
  }

  useEffect(() => { loadLinks(); loadSubLinks(); loadClients(); }, []);

  function openCreateInvestor() {
    setEditingLink(null);
    setForm(emptyInvestorForm);
    setDrawerOpen(true);
  }

  function openEditInvestor(link: AccessLink) {
    setEditingLink(link);
    setForm({
      investor_name: link.investor_name || '',
      investor_email: link.investor_email || '',
      investor_phone: link.investor_phone || '',
      expires_at: link.expires_at ? link.expires_at.slice(0, 10) : '',
      client_id: link.client_id || '',
    });
    setDrawerOpen(true);
  }

  async function handleSaveInvestor(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      investor_name: form.investor_name,
      investor_email: form.investor_email || null,
      investor_phone: form.investor_phone || null,
      expires_at: form.expires_at || null,
      client_id: form.client_id || null,
    };

    if (editingLink) {
      const { error } = await supabase.from('access_links').update(payload).eq('id', editingLink.id);
      if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
      toast.success('Link atualizado!');
    } else {
      const { error } = await supabase.from('access_links').insert({
        ...payload,
        token: generateToken(),
      });
      if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
      toast.success('Link criado!');
    }

    setDrawerOpen(false);
    setEditingLink(null);
    setForm(emptyInvestorForm);
    setSaving(false);
    loadLinks();
  }

  async function handleDeleteInvestor() {
    if (!deleteLink) return;
    setDeleting(true);
    const { error } = await supabase.from('access_links').delete().eq('id', deleteLink.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); setDeleting(false); return; }
    toast.success('Link excluído');
    setDeleteLink(null);
    setDeleting(false);
    loadLinks();
  }

  function openCreateSub() {
    setEditingSub(null);
    setSubForm({ label: '' });
    setSubDrawerOpen(true);
  }

  function openEditSub(link: SubmissionLink) {
    setEditingSub(link);
    setSubForm({ label: link.label || '' });
    setSubDrawerOpen(true);
  }

  async function handleSaveSub(e: React.FormEvent) {
    e.preventDefault();
    setSubSaving(true);
    if (editingSub) {
      const { error } = await supabase
        .from('submission_links')
        .update({ label: subForm.label || 'Geral' })
        .eq('id', editingSub.id);
      if (error) { toast.error('Erro: ' + error.message); setSubSaving(false); return; }
      toast.success('Link atualizado!');
    } else {
      const { error } = await supabase.from('submission_links').insert({
        token: generateToken(),
        label: subForm.label || 'Geral',
      });
      if (error) { toast.error('Erro: ' + error.message); setSubSaving(false); return; }
      toast.success('Link de submissão criado!');
    }
    setSubDrawerOpen(false);
    setEditingSub(null);
    setSubForm({ label: '' });
    setSubSaving(false);
    loadSubLinks();
  }

  async function handleDeleteSub() {
    if (!deleteSub) return;
    setSubDeleting(true);
    const { error } = await supabase.from('submission_links').delete().eq('id', deleteSub.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); setSubDeleting(false); return; }
    toast.success('Link excluído');
    setDeleteSub(null);
    setSubDeleting(false);
    loadSubLinks();
  }

  async function toggleActive(link: AccessLink) {
    const { error } = await supabase.from('access_links').update({ is_active: !link.is_active }).eq('id', link.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success(link.is_active ? 'Link desativado' : 'Link ativado');
    loadLinks();
  }

  async function toggleSubActive(link: SubmissionLink) {
    const { error } = await supabase.from('submission_links').update({ is_active: !link.is_active }).eq('id', link.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success(link.is_active ? 'Link desativado' : 'Link ativado');
    loadSubLinks();
  }

  function copyLink(token: string, prefix = 'catalogo') {
    navigator.clipboard.writeText(`${window.location.origin}/${prefix}/${token}`);
    toast.success('Link copiado!');
  }

  function shareWhatsApp(link: AccessLink) {
    const url = `${window.location.origin}/catalogo/${link.token}`;
    const message = encodeURIComponent(
      `Olá ${link.investor_name}! Aqui está seu acesso exclusivo ao catálogo de oportunidades da Tijolo em Capital: ${url}`,
    );
    window.open(`https://wa.me/${link.investor_phone || ''}?text=${message}`, '_blank');
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-6 font-ds-body">
      <Tabs defaultValue="investors" className="space-y-0">
        <div>
          <div className="space-y-1">
            <h1 className="font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
              Links de Acesso
            </h1>
            <p className="text-sm text-ink-500">Links exclusivos para investidores e corretores.</p>
          </div>
          <TabsList>
            <TabsTrigger value="investors">Investidores</TabsTrigger>
            <TabsTrigger value="brokers">
              <Inbox className="h-3.5 w-3.5" />
              Corretores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="investors" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateInvestor}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Novo Link
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investidor</TableHead>
                      <TableHead className="hidden md:table-cell">Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : links.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Nenhum link criado ainda
                        </TableCell>
                      </TableRow>
                    ) : (
                      links.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">{link.investor_name}</TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {link.investor_email || link.investor_phone || '-'}
                          </TableCell>
                          <TableCell>
                            {!link.is_active ? (
                              <Badge variant="secondary">Inativo</Badge>
                            ) : isExpired(link.expires_at) ? (
                              <Badge variant="destructive">Expirado</Badge>
                            ) : (
                              <Badge className="bg-primary/10 text-primary">Ativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditInvestor(link)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => copyLink(link.token)} title="Copiar link">
                                <Copy className="h-4 w-4" />
                              </Button>
                              {link.investor_phone && (
                                <Button variant="ghost" size="icon" onClick={() => shareWhatsApp(link)} title="WhatsApp">
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActive(link)}
                                title={link.is_active ? 'Desativar' : 'Ativar'}
                              >
                                {link.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-primary" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" asChild title="Abrir link">
                                <a href={`/catalogo/${link.token}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteLink(link)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brokers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateSub}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Link de Submissão
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : subLinks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Nenhum link de submissão criado
                        </TableCell>
                      </TableRow>
                    ) : (
                      subLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">{link.label}</TableCell>
                          <TableCell>
                            {link.is_active ? (
                              <Badge className="bg-primary/10 text-primary">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditSub(link)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyLink(link.token, 'submit')}
                                title="Copiar link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleSubActive(link)}
                                title={link.is_active ? 'Desativar' : 'Ativar'}
                              >
                                {link.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-primary" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" asChild title="Abrir link">
                                <a href={`/submit/${link.token}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteSub(link)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditingLink(null);
        }}
        title={editingLink ? 'Editar link de investidor' : 'Novo link de investidor'}
        description="Acesso exclusivo ao catálogo de oportunidades."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleSaveInvestor} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label>Nome do Investidor *</Label>
            <Input
              value={form.investor_name}
              onChange={(e) => setForm((p) => ({ ...p, investor_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.investor_email}
              onChange={(e) => setForm((p) => ({ ...p, investor_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              value={form.investor_phone}
              onChange={(e) => setForm((p) => ({ ...p, investor_phone: e.target.value }))}
              placeholder="5511999999999"
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Expiração (opcional)</Label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Vincular a cliente (opcional)</Label>
            <Select
              value={form.client_id || 'none'}
              onValueChange={(v) => setForm((p) => ({ ...p, client_id: v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLink ? 'Salvar' : 'Gerar Link'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={subDrawerOpen}
        onOpenChange={(open) => {
          setSubDrawerOpen(open);
          if (!open) setEditingSub(null);
        }}
        title={editingSub ? 'Editar link de corretor' : 'Novo link de submissão'}
        description="Compartilhe com corretores para envio de imóveis."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleSaveSub} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label>Descrição do Link</Label>
            <Input
              value={subForm.label}
              onChange={(e) => setSubForm({ label: e.target.value })}
              placeholder="Ex: Corretores parceiros"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Esse link pode ser compartilhado com corretores para que enviem imóveis para avaliação.
          </p>
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setSubDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={subSaving}>
              {subSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSub ? 'Salvar' : 'Gerar Link'}
            </Button>
          </div>
        </form>
      </Drawer>

      <AlertDialog open={!!deleteLink} onOpenChange={(open) => !open && setDeleteLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link do investidor?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso de {deleteLink?.investor_name} será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteInvestor();
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSub} onOpenChange={(open) => !open && setDeleteSub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link de corretor?</AlertDialogTitle>
            <AlertDialogDescription>
              O link &quot;{deleteSub?.label}&quot; deixará de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={subDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={subDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteSub();
              }}
            >
              {subDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
