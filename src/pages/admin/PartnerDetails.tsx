import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Partner, PartnerInteraction, PartnerType, PartnerStatus, InteractionType, Client } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, MessageCircle, Pencil, Loader2, Clock, Plus, Eye, Users, DollarSign, ImagePlus
} from 'lucide-react';
import { toast } from 'sonner';
import { Drawer, PartnerAvatar } from '@/components/ui-system';

const TYPE_LABELS: Record<PartnerType, string> = {
  imobiliaria: 'Imobiliária', corretor_autonomo: 'Corretor Autônomo',
  assessor_investimento: 'Assessor de Investimento', arquiteto: 'Arquiteto',
  engenheiro: 'Engenheiro', contador: 'Contador', outro: 'Outro',
};
const STATUS_LABELS: Record<PartnerStatus, string> = { active: 'Ativo', inactive: 'Inativo' };
const INTERACTION_LABELS: Record<InteractionType, string> = { meeting: 'Reunião', whatsapp: 'WhatsApp', email: 'E-mail', call: 'Ligação', other: 'Outro' };

const LOGO_BUCKET = 'partners-logos';
const LOGO_MAX_SIZE_BYTES = 500 * 1024;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml';
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

function buildLogoPath(partnerId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  return `${partnerId}/${Date.now()}.${extension}`;
}

export default function PartnerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Partner>>({});
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sub-partners (corretores vinculados)
  const [subPartners, setSubPartners] = useState<Partner[]>([]);
  // Clients generated
  const [clients, setClients] = useState<Client[]>([]);
  // Interactions
  const [interactions, setInteractions] = useState<PartnerInteraction[]>([]);
  const [intForm, setIntForm] = useState({ type: 'whatsapp' as InteractionType, note: '', interaction_date: new Date().toISOString().slice(0, 16) });
  const [intSaving, setIntSaving] = useState(false);
  // Agencies for edit form
  const [agencies, setAgencies] = useState<Pick<Partner, 'id' | 'name'>[]>([]);

  async function loadPartner() {
    if (!id) return;
    const { data, error } = await supabase.from('partners').select('*').eq('id', id).single();
    if (error || !data) { toast.error('Parceiro não encontrado'); navigate('/admin/parceiros'); return; }
    setPartner(data);
    setEditForm(data);
    setLoading(false);
  }

  async function loadSubPartners() {
    if (!id) return;
    const { data } = await supabase.from('partners').select('*').eq('parent_partner_id', id).order('name');
    setSubPartners(data || []);
  }

  async function loadClients() {
    if (!id) return;
    const { data } = await supabase.from('clients').select('*').eq('partner_id', id).order('created_at', { ascending: false });
    setClients(data || []);
  }

  async function loadInteractions() {
    if (!id) return;
    const { data } = await supabase.from('partner_interactions').select('*').eq('partner_id', id).order('interaction_date', { ascending: false });
    setInteractions((data || []).map(i => ({ ...i, type: i.type as InteractionType })));
  }

  async function loadAgencies() {
    const { data } = await supabase.from('partners').select('id, name').eq('type', 'imobiliaria');
    setAgencies(data || []);
  }

  useEffect(() => {
    loadPartner();
    loadSubPartners();
    loadClients();
    loadInteractions();
    loadAgencies();
  }, [id]);

  function clearEditLogoSelection() {
    setEditLogoFile(null);
    setEditLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function openEditDrawer() {
    if (!partner) return;
    clearEditLogoSelection();
    setEditForm(partner);
    setEditOpen(true);
  }

  function handleEditDrawerChange(open: boolean) {
    setEditOpen(open);
    if (!open) clearEditLogoSelection();
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      clearEditLogoSelection();
      return;
    }

    if (!LOGO_TYPES.has(file.type)) {
      toast.error('Envie um logo em PNG, JPG ou SVG.');
      e.target.value = '';
      return;
    }

    if (file.size > LOGO_MAX_SIZE_BYTES) {
      toast.error('O logo deve ter no máximo 500KB.');
      e.target.value = '';
      return;
    }

    setEditLogoFile(file);
    setEditLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    let nextLogoPath = editForm.logo_path ?? null;

    if (editLogoFile) {
      nextLogoPath = buildLogoPath(id!, editLogoFile);
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(nextLogoPath, editLogoFile, {
          contentType: editLogoFile.type,
          upsert: false,
        });

      if (uploadError) {
        toast.error('Erro no upload do logo: ' + uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('partners').update({
      name: editForm.name,
      type: editForm.type,
      phone: editForm.phone,
      email: editForm.email || null,
      affiliated_agency: editForm.affiliated_agency || null,
      website: editForm.website || null,
      creci: editForm.creci || null,
      commission_rate: editForm.commission_rate,
      notes: editForm.notes || null,
      status: editForm.status,
      parent_partner_id: editForm.parent_partner_id || null,
      logo_path: nextLogoPath,
    }).eq('id', id!);
    if (error) {
      if (editLogoFile && nextLogoPath) await supabase.storage.from(LOGO_BUCKET).remove([nextLogoPath]);
      toast.error('Erro: ' + error.message);
      setSaving(false);
      return;
    }
    if (editLogoFile && partner?.logo_path && partner.logo_path !== nextLogoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([partner.logo_path]);
    }
    toast.success('Parceiro atualizado!');
    setEditOpen(false);
    clearEditLogoSelection();
    setSaving(false);
    loadPartner();
  }

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !intForm.note.trim()) return;
    setIntSaving(true);
    const { error } = await supabase.from('partner_interactions').insert({
      partner_id: id,
      type: intForm.type,
      note: intForm.note,
      interaction_date: intForm.interaction_date,
    });
    if (error) { toast.error('Erro: ' + error.message); setIntSaving(false); return; }
    toast.success('Interação registrada!');
    setIntForm({ type: 'whatsapp', note: '', interaction_date: new Date().toISOString().slice(0, 16) });
    setIntSaving(false);
    loadInteractions();
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!partner) return null;

  const isAgency = partner.type === 'imobiliaria';

  return (
    <div className="space-y-6 font-ds-body">
      <Button variant="ghost" onClick={() => navigate('/admin/parceiros')} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Tabs defaultValue="summary" className="space-y-0">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <PartnerAvatar partner={partner} size={56} />
              <div className="min-w-0 space-y-1">
                <h1 className="truncate font-ds-display text-2xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-3xl">
                  {partner.name}
                </h1>
                <p className="text-sm text-ink-500">
                  {TYPE_LABELS[partner.type]}
                  {partner.status === 'active' ? ' · Ativo' : ' · Inativo'}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openEditDrawer}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" onClick={() => { const msg = encodeURIComponent(`Olá ${partner.name}!`); window.open(`https://wa.me/${partner.phone}?text=${msg}`, '_blank'); }}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            {isAgency && <TabsTrigger value="brokers">Corretores Vinculados</TabsTrigger>}
            <TabsTrigger value="clients">Contatos gerados</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
        </div>

        {/* SUMMARY */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Tipo</span><p className="font-medium">{TYPE_LABELS[partner.type]}</p></div>
                <div><span className="text-sm text-muted-foreground">Status</span><p><Badge className={partner.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>{STATUS_LABELS[partner.status]}</Badge></p></div>
                <div><span className="text-sm text-muted-foreground">Telefone</span><p className="font-medium">{partner.phone}</p></div>
                <div><span className="text-sm text-muted-foreground">E-mail</span><p className="font-medium">{partner.email || '-'}</p></div>
                {partner.creci && <div><span className="text-sm text-muted-foreground">CRECI</span><p className="font-medium">{partner.creci}</p></div>}
                {partner.website && <div><span className="text-sm text-muted-foreground">Site</span><p className="font-medium"><a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{partner.website}</a></p></div>}
                {partner.affiliated_agency && <div><span className="text-sm text-muted-foreground">Imobiliária vinculada</span><p className="font-medium">{partner.affiliated_agency}</p></div>}
              </div>

              {/* Commission card */}
              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <span className="text-sm text-muted-foreground">Comissão padrão</span>
                    <p className="text-lg font-bold">{partner.commission_rate != null ? `${partner.commission_rate}%` : 'Não definida'}</p>
                  </div>
                </CardContent>
              </Card>

              {partner.notes && (
                <div className="mt-4 p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Observações</span>
                  <p className="mt-1 whitespace-pre-wrap">{partner.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BROKERS (only for agencies) */}
        {isAgency && (
          <TabsContent value="brokers" className="space-y-4">
            {subPartners.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum corretor vinculado a esta imobiliária. Cadastre corretores do tipo "Corretor Autônomo" vinculados a esta imobiliária.</CardContent></Card>
            ) : subPartners.map(sp => (
              <Card key={sp.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{sp.name}</p>
                      <p className="text-sm text-muted-foreground">{sp.phone} {sp.creci ? `• CRECI ${sp.creci}` : ''}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/admin/parceiros/${sp.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* CLIENTS GENERATED */}
        <TabsContent value="clients" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm text-muted-foreground">Total de clientes gerados</span>
                <p className="text-lg font-bold">{clients.length}</p>
              </div>
            </CardContent>
          </Card>
          {clients.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum cliente vinculado a este parceiro</CardContent></Card>
          ) : clients.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.phone} • {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/admin/contatos/${c.id}`}><Eye className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Nova Interação</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddInteraction} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="space-y-2 w-full sm:w-40">
                    <Label>Tipo</Label>
                    <Select value={intForm.type} onValueChange={(v) => setIntForm(p => ({ ...p, type: v as InteractionType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(INTERACTION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Data/Hora</Label>
                    <Input type="datetime-local" value={intForm.interaction_date} onChange={(e) => setIntForm(p => ({ ...p, interaction_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nota</Label>
                  <Textarea value={intForm.note} onChange={(e) => setIntForm(p => ({ ...p, note: e.target.value }))} placeholder="O que foi discutido..." rows={2} required />
                </div>
                <Button type="submit" disabled={intSaving} size="sm">
                  {intSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {interactions.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma interação registrada</CardContent></Card>
            ) : interactions.map(int => (
              <Card key={int.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">{INTERACTION_LABELS[int.type as InteractionType] || int.type}</Badge>
                      <p className="whitespace-pre-wrap">{int.note}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(int.interaction_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Drawer
        open={editOpen}
        onOpenChange={handleEditDrawerChange}
        title="Editar parceiro"
        description="Atualize os dados do parceiro."
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleEdit} className="space-y-5 pb-4">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Identificação</h3>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={editForm.name || ''} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3 rounded-ds-lg border border-cream-200 bg-cream-50 p-3">
                {editLogoPreview ? (
                  <span className="inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-ds-pill border border-brand-gold/25 bg-white">
                    <img src={editLogoPreview} alt="Prévia do logo" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <PartnerAvatar name={editForm.name || partner.name} logoPath={editForm.logo_path ?? partner.logo_path} size={48} />
                )}
                <div className="min-w-0 flex-1">
                  <Input type="file" accept={LOGO_ACCEPT} onChange={handleLogoChange} />
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-300">
                    <ImagePlus className="h-3 w-3" />
                    PNG, JPG ou SVG até 500KB. Sugerido: 400x400px.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm(p => ({ ...p, type: v as PartnerType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v as PartnerStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Contato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={editForm.phone || ''} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={editForm.email || ''} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CRECI</Label>
                <Input value={editForm.creci || ''} onChange={(e) => setEditForm(p => ({ ...p, creci: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input type="number" step="0.1" value={editForm.commission_rate ?? ''} onChange={(e) => setEditForm(p => ({ ...p, commission_rate: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">Vínculo e presença</h3>
            {editForm.type === 'corretor_autonomo' && (
              <div className="space-y-2">
                <Label>Imobiliária vinculada</Label>
                <Select value={editForm.parent_partner_id || 'none'} onValueChange={(v) => setEditForm(p => ({ ...p, parent_partner_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {agencies.filter(a => a.id !== id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Site / Portfólio</Label>
              <Input value={editForm.website || ''} onChange={(e) => setEditForm(p => ({ ...p, website: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={editForm.notes || ''} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
