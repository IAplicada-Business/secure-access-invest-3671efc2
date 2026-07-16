import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientDocument, ClientInteraction, ClientType, ClientStatus, InteractionType, DocumentCategory, Partner } from '@/types/database';
import { GeneratedDocument } from '@/types/database';
import { formatCurrency } from '@/lib/formatCurrency';
import { StatCard, Drawer } from '@/components/ui-system';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, MessageCircle, Pencil, Loader2, Upload, Download, Trash2,
  Clock, Plus, Building2, Eye, ClipboardList, FileText,
  ExternalLink, FolderPlus, Share2, Phone, Users, CalendarDays, Globe, HelpCircle, MapPin,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  contactRelation,
  relationLabel,
  RELATION_BADGE,
  CRM_STAGE_LABELS,
} from '@/lib/contacts';

const TYPE_LABELS: Record<ClientType, string> = { investor: 'Investidor', incorporator: 'Regularização', individual: 'Pessoa Física' };
const STATUS_LABELS: Record<ClientStatus, string> = { prospect: 'Lead', active: 'Cliente ativo', completed: 'Cliente concluído' };
const INTERACTION_LABELS: Record<InteractionType, string> = { meeting: 'Reunião', whatsapp: 'WhatsApp', email: 'E-mail', call: 'Ligação', other: 'Outro' };
const DOC_LABELS: Record<DocumentCategory, string> = { rg: 'RG', cpf: 'CPF', matricula: 'Matrícula', contract: 'Contrato', proposal: 'Proposta', other: 'Outro' };

// Campos novos (6B) ainda não estão no types.ts gerado — tipo local + cast.
interface ClientExt extends Client {
  canal_entrada: string | null;
  canal_entrada_detalhe: string | null;
  cidade: string | null;
  cnpj: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  drive_link: string | null;
  observacoes: string | null;
  tags: string[] | null;
  crm_stage: string | null;
}

const CANAL: Record<string, { label: string; icon: LucideIcon }> = {
  redes_sociais: { label: 'Redes sociais', icon: Share2 },
  indicacao: { label: 'Indicação', icon: Users },
  corretor: { label: 'Corretor', icon: Phone },
  evento: { label: 'Evento', icon: CalendarDays },
  organico: { label: 'Orgânico', icon: Globe },
  outro: { label: 'Outro', icon: HelpCircle },
};

function clientInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientExt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientExt>>({});
  const [saving, setSaving] = useState(false);

  // Documents
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docCategory, setDocCategory] = useState<DocumentCategory>('other');

  // Interactions
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [intForm, setIntForm] = useState({ type: 'whatsapp' as InteractionType, note: '', interaction_date: new Date().toISOString().slice(0, 16) });
  const [intSaving, setIntSaving] = useState(false);

  // Linked properties (for investors)
  const [linkedProperties, setLinkedProperties] = useState<Array<{ property_id: string; title: string; time_spent: number; views: number }>>([]);
  // Partners for edit
  const [partners, setPartners] = useState<Pick<Partner, 'id' | 'name'>[]>([]);

  // Regularizations
  const [regProcesses, setRegProcesses] = useState<any[]>([]);
  const [regTypes, setRegTypes] = useState<any[]>([]);
  const [newRegOpen, setNewRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({ title: '', type_id: '', address: '', property_type: '', estimated_value: '', estimated_completion: '', notes: '' });
  const [regSaving, setRegSaving] = useState(false);

  // Generated documents
  const [genDocs, setGenDocs] = useState<any[]>([]);

  // Financeiro
  const [finRevenues, setFinRevenues] = useState<any[]>([]);
  const [finCommissions, setFinCommissions] = useState<any[]>([]);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ service_type: 'regularizacao', amount: '', received_at: new Date().toISOString().slice(0, 10), notes: '' });
  const [chargeSaving, setChargeSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const REG_STATUS_LABELS: Record<string, string> = {
    nova: 'Nova', em_analise: 'Em Análise', proposta_enviada: 'Proposta Enviada',
    em_execucao: 'Em Execução', concluida: 'Concluída', arquivada: 'Arquivada',
  };
  const REG_STATUS_COLORS: Record<string, string> = {
    nova: 'bg-blue-100 text-blue-800', em_analise: 'bg-amber-100 text-amber-800',
    proposta_enviada: 'bg-purple-100 text-purple-800', em_execucao: 'bg-primary/10 text-primary',
    concluida: 'bg-green-100 text-green-800', arquivada: 'bg-muted text-muted-foreground',
  };

  async function loadClient() {
    if (!id) return;
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error || !data) { toast.error('Contato não encontrado'); navigate('/admin/contatos'); return; }
    setClient(data);
    setEditForm(data);
    setLoading(false);
  }

  async function loadDocs() {
    if (!id) return;
    const { data } = await supabase.from('client_documents').select('*').eq('client_id', id).order('uploaded_at', { ascending: false });
    setDocs((data as ClientDocument[]) || []);
  }

  async function loadInteractions() {
    if (!id) return;
    const { data } = await supabase.from('client_interactions').select('*').eq('client_id', id).order('interaction_date', { ascending: false });
    setInteractions((data as ClientInteraction[]) || []);
  }

  async function loadLinkedProperties() {
    if (!id) return;
    // Get access_links for this client
    const { data: links } = await supabase.from('access_links').select('id').eq('client_id', id);
    if (!links || links.length === 0) { setLinkedProperties([]); return; }
    const linkIds = links.map(l => l.id);

    // Get page_views for those links
    const { data: views } = await supabase.from('page_views').select('property_id, time_spent_seconds').in('access_link_id', linkIds);
    if (!views || views.length === 0) { setLinkedProperties([]); return; }

    // Aggregate by property
    const propMap = new Map<string, { time: number; count: number }>();
    views.forEach(v => {
      if (!v.property_id) return;
      const existing = propMap.get(v.property_id) || { time: 0, count: 0 };
      propMap.set(v.property_id, { time: existing.time + (v.time_spent_seconds || 0), count: existing.count + 1 });
    });

    const propIds = [...propMap.keys()];
    const { data: properties } = await supabase.from('properties').select('id, title').in('id', propIds);
    const propNames = new Map(properties?.map(p => [p.id, p.title]) || []);

    setLinkedProperties(propIds.map(pid => ({
      property_id: pid,
      title: propNames.get(pid) || 'Imóvel removido',
      time_spent: propMap.get(pid)!.time,
      views: propMap.get(pid)!.count,
    })).sort((a, b) => b.time_spent - a.time_spent));
  }

  async function loadPartners() {
    const { data } = await supabase.from('partners').select('id, name').eq('status', 'active').order('name');
    setPartners(data || []);
  }

  async function loadRegularizations() {
    if (!id) return;
    const { data } = await supabase.from('regularization_processes').select('*, regularization_types(name)').eq('client_id', id).order('created_at', { ascending: false });
    setRegProcesses(data || []);
  }

  async function loadRegTypes() {
    const { data } = await supabase.from('regularization_types').select('id, name, checklist_template').eq('is_active', true).order('name');
    setRegTypes(data || []);
  }

  async function loadGenDocs() {
    if (!id) return;
    const { data } = await supabase.from('generated_documents').select('*').eq('client_id', id).order('created_at', { ascending: false });
    setGenDocs(data || []);
  }

  async function loadFinancials() {
    if (!id) return;
    const [{ data: revs }, { data: comms }] = await Promise.all([
      supabase.from('revenues').select('id, amount, received_at, service_type, notes').eq('client_id', id).order('received_at', { ascending: false }),
      supabase.from('commissions').select('id, amount, status, paid_at, created_at').eq('client_id', id).order('created_at', { ascending: false }),
    ]);
    setFinRevenues(revs || []);
    setFinCommissions(comms || []);
  }

  async function handleCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !chargeForm.amount) return;
    setChargeSaving(true);
    const { createRevenueWithCommission } = await import('@/lib/financeCommissions');
    const { revenue, commission, partnerId, rate, error } = await createRevenueWithCommission({
      clientId: id,
      partnerId: client?.partner_id || null,
      serviceType: chargeForm.service_type as never,
      amount: Number(chargeForm.amount),
      receivedAt: chargeForm.received_at,
      notes: chargeForm.notes || null,
      autoCommission: true,
    });
    setChargeSaving(false);
    if (error || !revenue) {
      toast.error('Erro: ' + (error?.message || 'falha ao lançar receita'));
      return;
    }
    toast.success(
      commission && partnerId && rate
        ? `Receita lançada e comissão de ${rate}% gerada para o parceiro`
        : 'Receita lançada!',
    );
    setChargeOpen(false);
    setChargeForm({ service_type: 'regularizacao', amount: '', received_at: new Date().toISOString().slice(0, 10), notes: '' });
    loadFinancials();
  }

  useEffect(() => {
    loadClient();
    loadDocs();
    loadInteractions();
    loadPartners();
    loadRegularizations();
    loadRegTypes();
    loadGenDocs();
    loadFinancials();
  }, [id]);

  useEffect(() => {
    if (client?.type === 'investor') loadLinkedProperties();
  }, [client]);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const selectedPartner = partners.find(p => p.id === editForm.partner_id);
    const payload = {
      name: editForm.name,
      type: editForm.type,
      cpf_cnpj: editForm.cpf_cnpj || null,
      cnpj: editForm.cnpj || null,
      data_nascimento: editForm.data_nascimento || null,
      endereco: editForm.endereco || null,
      phone: editForm.phone,
      email: editForm.email || null,
      origin: editForm.origin || null,
      partner_id: editForm.partner_id || null,
      partner_name: selectedPartner ? selectedPartner.name : (editForm.partner_name || null),
      status: editForm.status,
      cidade: editForm.cidade || null,
      canal_entrada: editForm.canal_entrada || null,
      canal_entrada_detalhe: editForm.canal_entrada_detalhe || null,
      drive_link: editForm.drive_link || null,
      tags: editForm.tags ?? [],
      observacoes: editForm.observacoes || null,
    };
    const { error } = await supabase.from('clients').update(payload).eq('id', id!);
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return; }
    toast.success('Contato atualizado!');
    setEditOpen(false);
    setSaving(false);
    loadClient();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const filePath = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file);
    if (uploadError) { toast.error('Erro no upload: ' + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(filePath);

    const { error } = await supabase.from('client_documents').insert({
      client_id: id,
      file_name: file.name,
      file_url: filePath,
      category: docCategory,
    });
    if (error) { toast.error('Erro ao salvar documento'); setUploading(false); return; }
    toast.success('Documento enviado!');
    setUploading(false);
    loadDocs();
  }

  async function handleDeleteDoc(doc: ClientDocument) {
    await supabase.storage.from('client-documents').remove([doc.file_url]);
    await supabase.from('client_documents').delete().eq('id', doc.id);
    toast.success('Documento removido');
    loadDocs();
  }

  async function downloadDoc(doc: ClientDocument) {
    const { data, error } = await supabase.storage.from('client-documents').download(doc.file_url);
    if (error || !data) { toast.error('Erro ao baixar'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !intForm.note.trim()) return;
    setIntSaving(true);
    const { error } = await supabase.from('client_interactions').insert({
      client_id: id,
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

  async function handleCreateRegularization(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !regForm.title.trim() || !regForm.type_id) return;
    setRegSaving(true);
    const { data: proc, error } = await supabase.from('regularization_processes').insert({
      client_id: id, title: regForm.title.trim(), type_id: regForm.type_id,
      address: regForm.address || null, property_type: regForm.property_type || null,
      estimated_value: regForm.estimated_value ? Number(regForm.estimated_value) : null,
      estimated_completion: regForm.estimated_completion || null, notes: regForm.notes || null,
    }).select().single();
    if (error || !proc) { toast.error('Erro ao criar processo'); setRegSaving(false); return; }

    // Pre-fill checklist from template
    const selectedType = regTypes.find((t: any) => t.id === regForm.type_id);
    if (selectedType?.checklist_template && Array.isArray(selectedType.checklist_template) && selectedType.checklist_template.length > 0) {
      const checklistItems = selectedType.checklist_template.map((desc: string) => ({
        process_id: proc.id, description: desc,
      }));
      await supabase.from('regularization_checklist_items').insert(checklistItems);
    }

    // Auto interaction
    await supabase.from('regularization_interactions').insert({
      process_id: proc.id, type: 'status_change', note: 'Processo criado com status "Nova"', is_automatic: true,
    });

    toast.success('Processo criado!');
    setRegSaving(false);
    setNewRegOpen(false);
    setRegForm({ title: '', type_id: '', address: '', property_type: '', estimated_value: '', estimated_completion: '', notes: '' });
    loadRegularizations();
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}min`;
  }

  async function handlePromoteToClient() {
    if (!client || !id) return;
    const { error } = await supabase
      .from('clients')
      .update({ status: 'active', crm_stage: (client.crm_stage === 'contato' || !client.crm_stage ? 'fechamento' : client.crm_stage) as 'fechamento' })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao converter: ' + error.message);
      return;
    }
    toast.success('Lead convertido em cliente.');
    loadClient();
  }

  async function handleDeleteClient() {
    if (!client) return;
    setDeleting(true);
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success(`"${client.name}" excluído.`);
    navigate('/admin/contatos');
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!client) return null;

  return (
    <div className="space-y-6 font-ds-body">
      <Button variant="ghost" onClick={() => navigate('/admin/contatos')} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Tabs defaultValue="summary" className="space-y-0">
        <div>
          {/* HERO */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-ds-pill bg-brand-goldSoft/40 text-2xl font-semibold text-brand-goldDeep">
                {clientInitials(client.name) || '–'}
              </span>
              <div className="space-y-2">
                <h1 className="font-ds-display text-3xl font-semibold tracking-[-0.02em] text-ink-900">{client.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                  {client.canal_entrada && (() => {
                    const Icon = CANAL[client.canal_entrada]?.icon ?? HelpCircle;
                    return (
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5 text-brand-goldDeep" />
                        {CANAL[client.canal_entrada]?.label ?? client.canal_entrada}
                      </span>
                    );
                  })()}
                  {client.cidade && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.cidade}</span>}
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={RELATION_BADGE[contactRelation(client.status)]}>
                    {relationLabel(client.status)}
                  </Badge>
                  <Badge className="bg-brand-goldSoft/30 text-brand-goldDeep">{TYPE_LABELS[client.type]}</Badge>
                  {client.crm_stage && (
                    <Badge variant="outline" className="text-xs">
                      {CRM_STAGE_LABELS[client.crm_stage] ?? client.crm_stage}
                    </Badge>
                  )}
                  {(client.tags ?? []).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {contactRelation(client.status) === 'lead' && (
                <Button variant="outline" size="sm" onClick={handlePromoteToClient}>
                  Converter em cliente
                </Button>
              )}
              {client.drive_link ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={client.drive_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir Drive</a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setEditForm(client); setEditOpen(true); }}>
                  <FolderPlus className="mr-1 h-3.5 w-3.5" /> Adicionar Drive
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setEditForm(client); setEditOpen(true); }}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" onClick={() => { const msg = encodeURIComponent(`Olá ${client.name}!`); window.open(`https://wa.me/${client.phone}?text=${msg}`, '_blank'); }}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            {client.type === 'investor' && <TabsTrigger value="properties">Imóveis Vinculados</TabsTrigger>}
            <TabsTrigger value="regularizations">Regularizações</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="generated_docs">Documentos Gerados</TabsTrigger>
          </TabsList>
        </div>

        {/* SUMMARY TAB */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sobre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Tipo</span><p className="font-medium">{TYPE_LABELS[client.type]}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground">Relação</span>
                  <p>
                    <Badge className={RELATION_BADGE[contactRelation(client.status)]}>
                      {STATUS_LABELS[client.status]}
                    </Badge>
                  </p>
                </div>
                <div><span className="text-sm text-muted-foreground">Telefone</span><p className="font-medium">{client.phone}</p></div>
                <div><span className="text-sm text-muted-foreground">E-mail</span><p className="font-medium">{client.email || '-'}</p></div>
                <div><span className="text-sm text-muted-foreground">CPF</span><p className="font-medium">{client.cpf_cnpj || '-'}</p></div>
                <div><span className="text-sm text-muted-foreground">CNPJ</span><p className="font-medium">{client.cnpj || '-'}</p></div>
                <div><span className="text-sm text-muted-foreground">Aniversário</span><p className="font-medium">{client.data_nascimento ? new Date(client.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p></div>
                <div><span className="text-sm text-muted-foreground">Endereço</span><p className="font-medium">{client.endereco || '-'}</p></div>
                <div><span className="text-sm text-muted-foreground">Cidade</span><p className="font-medium">{client.cidade || '-'}</p></div>
                <div>
                  <span className="text-sm text-muted-foreground">Canal de entrada</span>
                  <p className="font-medium">
                    {client.canal_entrada ? (CANAL[client.canal_entrada]?.label ?? client.canal_entrada) : '-'}
                    {client.canal_entrada_detalhe ? ` (${client.canal_entrada_detalhe})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Drive</span>
                  <p className="font-medium">
                    {client.drive_link
                      ? <a href={client.drive_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">abrir pasta</a>
                      : '-'}
                  </p>
                </div>
              </div>
              {(client.partner_name || client.partner_id) && (
                <Card className="mt-4 border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <span className="text-sm text-muted-foreground">Indicado por</span>
                    <p className="font-medium">
                      {client.partner_id ? (
                        <RouterLink to={`/admin/parceiros/${client.partner_id}`} className="text-primary underline">
                          {client.partner_name}
                        </RouterLink>
                      ) : client.partner_name}
                    </p>
                  </CardContent>
                </Card>
              )}
              {(client.observacoes || client.notes) && (
                <div className="mt-4 p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Observações</span>
                  <p className="mt-1 whitespace-pre-wrap">{client.observacoes || client.notes}</p>
                </div>
              )}
              {(client.tags ?? []).length > 0 && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(client.tags ?? []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload de Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-2 flex-1">
                  <Label>Categoria</Label>
                  <Select value={docCategory} onValueChange={(v) => setDocCategory(v as DocumentCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(DOC_LABELS) as [DocumentCategory, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md bg-background hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                    </div>
                  </Label>
                  <input id="file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {docs.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">Nenhum documento enviado</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOC_LABELS[doc.category as DocumentCategory] || doc.category} • {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => downloadDoc(doc)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
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
                        {(Object.entries(INTERACTION_LABELS) as [InteractionType, string][]).map(([k, v]) => (
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

        {/* LINKED PROPERTIES TAB */}
        {client.type === 'investor' && (
          <TabsContent value="properties" className="space-y-4">
            {linkedProperties.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum imóvel visualizado por este investidor. Vincule um link de acesso a este cliente para rastrear visualizações.</CardContent></Card>
            ) : linkedProperties.map(prop => (
              <Card key={prop.property_id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{prop.title}</p>
                      <p className="text-sm text-muted-foreground">{prop.views} visualizações • {formatTime(prop.time_spent)} total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={prop.time_spent > 120 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
                      {prop.time_spent > 120 ? '🔥 Alto interesse' : prop.time_spent > 30 ? 'Interesse moderado' : 'Visualização breve'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {/* REGULARIZATIONS TAB */}
        <TabsContent value="regularizations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Processos de Regularização</h3>
            <Button size="sm" onClick={() => setNewRegOpen(true)}><Plus className="mr-1 h-3 w-3" /> Novo Processo</Button>
          </div>
          {regProcesses.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum processo de regularização</CardContent></Card>
          ) : regProcesses.map((proc: any) => (
            <Card key={proc.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/admin/regularizacoes/${proc.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{proc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {proc.regularization_types?.name || 'Tipo não definido'} • {new Date(proc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={REG_STATUS_COLORS[proc.status] || 'bg-muted'}>{REG_STATUS_LABELS[proc.status] || proc.status}</Badge>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* GENERATED DOCUMENTS TAB */}
        <TabsContent value="generated_docs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Documentos Gerados</h3>
          </div>
          {genDocs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum documento gerado para este cliente</CardContent></Card>
          ) : genDocs.map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.type === 'proposta' ? 'Proposta' : doc.type === 'contrato' ? 'Contrato' : 'Relatório'} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    doc.status === 'assinado' ? 'bg-green-100 text-green-800' :
                    doc.status === 'enviado' ? 'bg-blue-100 text-blue-800' :
                    'bg-muted text-muted-foreground'
                  }>
                    {doc.status === 'rascunho' ? 'Rascunho' : doc.status === 'enviado' ? 'Enviado' : doc.status === 'assinado' ? 'Assinado' : 'Arquivado'}
                  </Badge>
                  {doc.file_url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                      const { data, error } = await supabase.storage.from('generated-documents').download(doc.file_url);
                      if (error || !data) { toast.error('Erro ao baixar'); return; }
                      const url = URL.createObjectURL(data);
                      const a = document.createElement('a'); a.href = url; a.download = `${doc.title}.pdf`; a.click();
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-4">
          {(() => {
            const totalRecebido = finRevenues.reduce((s, r) => s + Number(r.amount), 0);
            const comissoesPagas = finCommissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
            const comissoesPendentes = finCommissions.filter(c => c.status !== 'paid').reduce((s, c) => s + Number(c.amount), 0);
            const SERVICE_LABELS: Record<string, string> = { regularizacao: 'Regularização', venda_plataforma: 'Venda Plataforma', consultoria: 'Consultoria', outro: 'Outro' };
            const timeline = [
              ...finRevenues.map(r => ({ kind: 'Receita', date: r.received_at, value: Number(r.amount), label: SERVICE_LABELS[r.service_type] || r.service_type })),
              ...finCommissions.map(c => ({ kind: 'Comissão', date: c.paid_at || c.created_at, value: Number(c.amount), label: c.status === 'paid' ? 'paga' : 'pendente' })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Financeiro do cliente</h3>
                  <Button size="sm" onClick={() => setChargeOpen(true)}><Plus className="mr-1 h-4 w-4" /> Lançar receita</Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Total recebido" value={formatCurrency(totalRecebido)} />
                  <StatCard label="Comissões pagas" value={formatCurrency(comissoesPagas)} />
                  <StatCard label="Comissões pendentes" value={formatCurrency(comissoesPendentes)} />
                </div>
                {timeline.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum lançamento financeiro para este cliente</CardContent></Card>
                ) : (
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {timeline.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-medium">{t.kind} <span className="text-sm text-muted-foreground">• {t.label}</span></p>
                            <p className="text-xs text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                          <span className={`font-mono font-medium ${t.kind === 'Comissão' ? 'text-muted-foreground' : 'text-foreground'}`}>{formatCurrency(t.value)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Lançar receita (cobrança) Drawer */}
      <Drawer
        open={chargeOpen}
        onOpenChange={setChargeOpen}
        title="Lançar receita"
        description={
          client?.partner_id
            ? 'A receita vai para o Financeiro e gera comissão automática para o parceiro vinculado.'
            : 'A receita vai para o Financeiro. Vincule um parceiro no contato para gerar comissão automática.'
        }
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <form onSubmit={handleCreateCharge} className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label>Tipo de serviço</Label>
            <Select value={chargeForm.service_type} onValueChange={(v) => setChargeForm(p => ({ ...p, service_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regularizacao">Regularização</SelectItem>
                <SelectItem value="venda_plataforma">Venda Plataforma</SelectItem>
                <SelectItem value="consultoria">Consultoria</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={chargeForm.amount} onChange={(e) => setChargeForm(p => ({ ...p, amount: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={chargeForm.received_at} onChange={(e) => setChargeForm(p => ({ ...p, received_at: e.target.value }))} /></div>
          </div>
          <div className="space-y-2"><Label>Observação</Label><Input value={chargeForm.notes} onChange={(e) => setChargeForm(p => ({ ...p, notes: e.target.value }))} /></div>
          {client?.partner_id && (
            <p className="rounded-md bg-brand-goldSoft/20 px-3 py-2 text-xs text-ink-700">
              Parceiro vinculado: <strong>{client.partner_name || 'cadastrado'}</strong> — comissão será calculada pela taxa do parceiro.
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-cream-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setChargeOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={chargeSaving}>{chargeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lançar</Button>
          </div>
        </form>
      </Drawer>

      {/* New Regularization Dialog */}
      <Dialog open={newRegOpen} onOpenChange={setNewRegOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Processo de Regularização</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRegularization} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={regForm.title} onChange={(e) => setRegForm(p => ({ ...p, title: e.target.value }))} required placeholder="Ex: Regularização Lote 42" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Regularização *</Label>
              <Select value={regForm.type_id} onValueChange={(v) => setRegForm(p => ({ ...p, type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {regTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {regTypes.length === 0 && <p className="text-xs text-destructive">Cadastre tipos em Configurações primeiro</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={regForm.address} onChange={(e) => setRegForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo do Imóvel</Label>
                <Input value={regForm.property_type} onChange={(e) => setRegForm(p => ({ ...p, property_type: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Estimado</Label>
                <Input type="number" value={regForm.estimated_value} onChange={(e) => setRegForm(p => ({ ...p, estimated_value: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Prazo Estimado</Label>
                <Input type="date" value={regForm.estimated_completion} onChange={(e) => setRegForm(p => ({ ...p, estimated_completion: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={regForm.notes} onChange={(e) => setRegForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewRegOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={regSaving || !regForm.type_id}>
                {regSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={editForm.name || ''} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm(p => ({ ...p, type: v as ClientType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investor">Investidor</SelectItem>
                    <SelectItem value="incorporator">Regularização</SelectItem>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Relação</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v as ClientStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Lead</SelectItem>
                    <SelectItem value="active">Cliente ativo</SelectItem>
                    <SelectItem value="completed">Cliente concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={editForm.phone || ''} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={editForm.email || ''} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={editForm.cpf_cnpj || ''} onChange={(e) => setEditForm(p => ({ ...p, cpf_cnpj: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input value={editForm.cnpj || ''} onChange={(e) => setEditForm(p => ({ ...p, cnpj: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aniversário</Label>
                <Input type="date" value={editForm.data_nascimento || ''} onChange={(e) => setEditForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={editForm.endereco || ''} onChange={(e) => setEditForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem</Label>
                <Input value={editForm.origin || ''} onChange={(e) => setEditForm(p => ({ ...p, origin: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Indicado por (parceiro)</Label>
                <Select value={editForm.partner_id || 'none'} onValueChange={(v) => setEditForm(p => ({ ...p, partner_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Texto livre</SelectItem>
                    {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editForm.partner_id && (
              <div className="space-y-2">
                <Label>Parceiro (texto livre)</Label>
                <Input value={editForm.partner_name || ''} onChange={(e) => setEditForm(p => ({ ...p, partner_name: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground">
                  Só nome livre não gera comissão no Financeiro. Selecione o parceiro cadastrado acima para conectar.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={editForm.cidade || ''} onChange={(e) => setEditForm(p => ({ ...p, cidade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Canal de entrada</Label>
                <Select value={editForm.canal_entrada || 'none'} onValueChange={(v) => setEditForm(p => ({ ...p, canal_entrada: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {Object.entries(CANAL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detalhe do canal</Label>
              <Input value={editForm.canal_entrada_detalhe || ''} onChange={(e) => setEditForm(p => ({ ...p, canal_entrada_detalhe: e.target.value }))} placeholder="Ex: quem indicou, qual evento..." />
            </div>
            <div className="space-y-2">
              <Label>Link do Drive</Label>
              <Input value={editForm.drive_link || ''} onChange={(e) => setEditForm(p => ({ ...p, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={(editForm.tags ?? []).join(', ')}
                onChange={(e) => setEditForm(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                placeholder="vip, recorrente"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={editForm.observacoes || ''} onChange={(e) => setEditForm(p => ({ ...p, observacoes: e.target.value }))} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove permanentemente <strong>{client.name}</strong> e os dados vinculados
              (documentos, interações, histórico do funil). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
