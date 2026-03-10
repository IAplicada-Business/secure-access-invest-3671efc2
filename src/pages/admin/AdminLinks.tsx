import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccessLink, SubmissionLink, Client } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, Copy, ExternalLink, ToggleLeft, ToggleRight,
  Loader2, MessageCircle, Inbox
} from 'lucide-react';
import { toast } from 'sonner';

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

export default function AdminLinks() {
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ investor_name: '', investor_email: '', investor_phone: '', expires_at: '' });

  const [subLinks, setSubLinks] = useState<SubmissionLink[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [subForm, setSubForm] = useState({ label: '' });

  async function loadLinks() {
    const { data, error } = await supabase.from('access_links').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar links'); return; }
    setLinks((data as AccessLink[]) || []);
    setLoading(false);
  }

  async function loadSubLinks() {
    const { data, error } = await supabase.from('submission_links').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar links de submissão'); return; }
    setSubLinks((data as SubmissionLink[]) || []);
    setSubLoading(false);
  }

  useEffect(() => { loadLinks(); loadSubLinks(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('access_links').insert({
      token: generateToken(),
      investor_name: form.investor_name,
      investor_email: form.investor_email || null,
      investor_phone: form.investor_phone || null,
      expires_at: form.expires_at || null,
    });
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success('Link criado!');
    setDialogOpen(false);
    setForm({ investor_name: '', investor_email: '', investor_phone: '', expires_at: '' });
    setSaving(false);
    loadLinks();
  }

  async function handleCreateSubLink(e: React.FormEvent) {
    e.preventDefault();
    setSubSaving(true);
    const { error } = await supabase.from('submission_links').insert({
      token: generateToken(),
      label: subForm.label || 'Geral',
    });
    if (error) { toast.error('Erro: ' + error.message); setSubSaving(false); return; }
    toast.success('Link de submissão criado!');
    setSubDialogOpen(false);
    setSubForm({ label: '' });
    setSubSaving(false);
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
    const message = encodeURIComponent(`Olá ${link.investor_name}! Aqui está seu acesso exclusivo ao catálogo de oportunidades da JMob: ${url}`);
    window.open(`https://wa.me/${link.investor_phone || ''}?text=${message}`, '_blank');
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Links de Acesso</h1>

      <Tabs defaultValue="investors">
        <TabsList>
          <TabsTrigger value="investors">Investidores</TabsTrigger>
          <TabsTrigger value="brokers" className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Corretores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Novo Link
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
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
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : links.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum link criado ainda</TableCell></TableRow>
                  ) : links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.investor_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{link.investor_email || link.investor_phone || '-'}</TableCell>
                      <TableCell>
                        {!link.is_active ? <Badge variant="secondary">Inativo</Badge>
                          : isExpired(link.expires_at) ? <Badge variant="destructive">Expirado</Badge>
                          : <Badge className="bg-primary/10 text-primary">Ativo</Badge>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(link.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyLink(link.token)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                          {link.investor_phone && (
                            <Button variant="ghost" size="icon" onClick={() => shareWhatsApp(link)} title="Enviar via WhatsApp"><MessageCircle className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(link)} title={link.is_active ? 'Desativar' : 'Ativar'}>
                            {link.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Abrir link">
                            <a href={`/catalogo/${link.token}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brokers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSubDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Link de Submissão
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
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
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : subLinks.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum link de submissão criado</TableCell></TableRow>
                  ) : subLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">{link.label}</TableCell>
                      <TableCell>
                        {link.is_active ? <Badge className="bg-primary/10 text-primary">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(link.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyLink(link.token, 'submit')} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleSubActive(link)} title={link.is_active ? 'Desativar' : 'Ativar'}>
                            {link.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Abrir link">
                            <a href={`/submit/${link.token}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Investor Link Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Novo Link</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Investidor *</Label>
              <Input value={form.investor_name} onChange={(e) => setForm(p => ({ ...p, investor_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.investor_email} onChange={(e) => setForm(p => ({ ...p, investor_email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.investor_phone} onChange={(e) => setForm(p => ({ ...p, investor_phone: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div className="space-y-2">
              <Label>Data de Expiração (opcional)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Submission Link Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Link de Submissão</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateSubLink} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição do Link</Label>
              <Input value={subForm.label} onChange={(e) => setSubForm({ label: e.target.value })} placeholder="Ex: Corretores parceiros" />
            </div>
            <p className="text-sm text-muted-foreground">
              Esse link pode ser compartilhado com corretores para que enviem imóveis para avaliação.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={subSaving}>{subSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
