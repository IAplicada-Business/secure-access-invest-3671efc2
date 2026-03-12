import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  ArrowLeft, Loader2, Save, Plus, Upload, Download, Trash2,
  Clock, CheckCircle, Circle, MinusCircle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import DocumentWizard from '@/components/documents/DocumentWizard';

type RegStatus = 'nova' | 'em_analise' | 'proposta_enviada' | 'em_execucao' | 'concluida' | 'arquivada';
type ChecklistStatus = 'pendente' | 'recebido' | 'nao_se_aplica';

const STATUS_LABELS: Record<RegStatus, string> = {
  nova: 'Nova', em_analise: 'Em Análise', proposta_enviada: 'Proposta Enviada',
  em_execucao: 'Em Execução', concluida: 'Concluída', arquivada: 'Arquivada',
};
const STATUS_COLORS: Record<RegStatus, string> = {
  nova: 'bg-blue-100 text-blue-800', em_analise: 'bg-amber-100 text-amber-800',
  proposta_enviada: 'bg-purple-100 text-purple-800', em_execucao: 'bg-primary/10 text-primary',
  concluida: 'bg-green-100 text-green-800', arquivada: 'bg-muted text-muted-foreground',
};
const CHECKLIST_LABELS: Record<ChecklistStatus, string> = { pendente: 'Pendente', recebido: 'Recebido', nao_se_aplica: 'N/A' };
const INTERACTION_LABELS: Record<string, string> = { meeting: 'Reunião', whatsapp: 'WhatsApp', email: 'E-mail', call: 'Ligação', cartorio: 'Cartório', status_change: 'Mudança de Status', other: 'Outro' };
const DOC_CATEGORIES = ['matricula', 'planta', 'iptu', 'certidao', 'formulario', 'proposta', 'contrato', 'outro'] as const;
const DOC_CAT_LABELS: Record<string, string> = { matricula: 'Matrícula', planta: 'Planta', iptu: 'IPTU', certidao: 'Certidão', formulario: 'Formulário', proposta: 'Proposta', contrato: 'Contrato', outro: 'Outro' };

interface Process {
  id: string; client_id: string | null; title: string; type_id: string | null;
  status: RegStatus; address: string | null; property_type: string | null;
  estimated_value: number | null; estimated_completion: string | null;
  notes: string | null; created_at: string; property_submission_id: string | null;
}
interface ChecklistItem { id: string; process_id: string; description: string; status: ChecklistStatus; received_at: string | null; notes: string | null; }
interface RegDoc { id: string; process_id: string; file_name: string; file_url: string; category: string; uploaded_at: string; }
interface Interaction { id: string; process_id: string; type: string; note: string; interaction_date: string; is_automatic: boolean; created_at: string; }

export default function RegularizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<Process | null>(null);
  const [typeName, setTypeName] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Checklist
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');

  // Documents
  const [docs, setDocs] = useState<RegDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docCategory, setDocCategory] = useState('outro');

  // Interactions
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [intForm, setIntForm] = useState({ type: 'other', note: '', interaction_date: new Date().toISOString().slice(0, 16) });
  const [intSaving, setIntSaving] = useState(false);

  // Generate proposal wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  async function loadAll() {
    if (!id) return;
    const { data: proc } = await supabase.from('regularization_processes').select('*').eq('id', id).single();
    if (!proc) { toast.error('Processo não encontrado'); navigate('/admin/clientes'); return; }
    setProcess(proc as unknown as Process);

    // Load type name
    if (proc.type_id) {
      const { data: t } = await supabase.from('regularization_types').select('name').eq('id', proc.type_id).single();
      if (t) setTypeName(t.name);
    }
    // Load client name
    if (proc.client_id) {
      const { data: c } = await supabase.from('clients').select('name').eq('id', proc.client_id).single();
      if (c) setClientName(c.name);
    }

    const { data: ci } = await supabase.from('regularization_checklist_items').select('*').eq('process_id', id).order('id');
    setItems((ci || []) as unknown as ChecklistItem[]);

    const { data: d } = await supabase.from('regularization_documents').select('*').eq('process_id', id).order('uploaded_at', { ascending: false });
    setDocs((d || []) as unknown as RegDoc[]);

    const { data: int } = await supabase.from('regularization_interactions').select('*').eq('process_id', id).order('interaction_date', { ascending: false });
    setInteractions((int || []) as unknown as Interaction[]);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  // --- Overview ---
  async function handleStatusChange(newStatus: RegStatus) {
    if (!process || !id) return;
    const oldStatus = process.status;
    const { error } = await supabase.from('regularization_processes').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }

    // Auto interaction
    await supabase.from('regularization_interactions').insert({
      process_id: id, type: 'status_change',
      note: `Status alterado de "${STATUS_LABELS[oldStatus]}" para "${STATUS_LABELS[newStatus]}"`,
      is_automatic: true,
    });
    toast.success('Status atualizado');
    loadAll();
  }

  async function handleSaveNotes() {
    if (!process || !id) return;
    setSaving(true);
    const { error } = await supabase.from('regularization_processes').update({
      notes: process.notes, estimated_completion: process.estimated_completion,
      address: process.address, estimated_value: process.estimated_value,
    }).eq('id', id);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Salvo!');
    setSaving(false);
  }

  // --- Checklist ---
  async function handleItemStatusChange(item: ChecklistItem, newStatus: ChecklistStatus) {
    const update: any = { status: newStatus };
    if (newStatus === 'recebido') update.received_at = new Date().toISOString().slice(0, 10);
    else update.received_at = null;
    await supabase.from('regularization_checklist_items').update(update).eq('id', item.id);
    loadAll();
  }

  async function handleAddItem() {
    if (!newItemDesc.trim() || !id) return;
    await supabase.from('regularization_checklist_items').insert({ process_id: id, description: newItemDesc.trim() });
    setNewItemDesc('');
    loadAll();
  }

  async function handleDeleteItem(itemId: string) {
    await supabase.from('regularization_checklist_items').delete().eq('id', itemId);
    loadAll();
  }

  async function handleItemNotes(itemId: string, notes: string) {
    await supabase.from('regularization_checklist_items').update({ notes }).eq('id', itemId);
  }

  // --- Documents ---
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const filePath = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('regularization-documents').upload(filePath, file);
    if (uploadErr) { toast.error('Erro no upload'); setUploading(false); return; }
    await supabase.from('regularization_documents').insert({ process_id: id, file_name: file.name, file_url: filePath, category: docCategory });
    toast.success('Documento enviado!');
    setUploading(false);
    loadAll();
  }

  async function handleDeleteDoc(doc: RegDoc) {
    await supabase.storage.from('regularization-documents').remove([doc.file_url]);
    await supabase.from('regularization_documents').delete().eq('id', doc.id);
    toast.success('Documento removido');
    loadAll();
  }

  async function downloadDoc(doc: RegDoc) {
    const { data, error } = await supabase.storage.from('regularization-documents').download(doc.file_url);
    if (error || !data) { toast.error('Erro ao baixar'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
  }

  // --- Interactions ---
  async function handleAddInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !intForm.note.trim()) return;
    setIntSaving(true);
    await supabase.from('regularization_interactions').insert({
      process_id: id, type: intForm.type, note: intForm.note,
      interaction_date: intForm.interaction_date, is_automatic: false,
    });
    toast.success('Registro adicionado!');
    setIntForm({ type: 'other', note: '', interaction_date: new Date().toISOString().slice(0, 16) });
    setIntSaving(false);
    loadAll();
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!process) return null;

  const completedItems = items.filter(i => i.status === 'recebido').length;
  const totalItems = items.filter(i => i.status !== 'nao_se_aplica').length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">{process.title}</h1>
          <p className="text-sm text-muted-foreground">
            {clientName && `Cliente: ${clientName}`}{typeName && ` • Tipo: ${typeName}`}
          </p>
        </div>
        <Badge className={STATUS_COLORS[process.status]}>{STATUS_LABELS[process.status]}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist {totalItems > 0 && `(${completedItems}/${totalItems})`}</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
              <FileText className="mr-1 h-3 w-3" /> Gerar Proposta
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Status do Processo</CardTitle></CardHeader>
            <CardContent>
              <Select value={process.status} onValueChange={(v) => handleStatusChange(v as RegStatus)}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [RegStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Dados do Processo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={process.address || ''} onChange={(e) => setProcess(p => p ? { ...p, address: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo do Imóvel</Label>
                  <Input value={process.property_type || ''} onChange={(e) => setProcess(p => p ? { ...p, property_type: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor Estimado</Label>
                  <Input type="number" value={process.estimated_value || ''} onChange={(e) => setProcess(p => p ? { ...p, estimated_value: Number(e.target.value) || null } : p)} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo Estimado</Label>
                  <Input type="date" value={process.estimated_completion || ''} onChange={(e) => setProcess(p => p ? { ...p, estimated_completion: e.target.value || null } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={process.notes || ''} onChange={(e) => setProcess(p => p ? { ...p, notes: e.target.value } : p)} rows={3} />
              </div>
              <Button onClick={handleSaveNotes} disabled={saving} size="sm">
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />} Salvar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Abertura: {new Date(process.created_at).toLocaleDateString('pt-BR')}
              {process.estimated_completion && ` • Prazo: ${new Date(process.estimated_completion).toLocaleDateString('pt-BR')}`}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECKLIST */}
        <TabsContent value="checklist" className="space-y-4">
          {totalItems > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} />
            </div>
          )}

          <div className="space-y-2">
            {items.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button onClick={() => handleItemStatusChange(item, item.status === 'recebido' ? 'pendente' : 'recebido')} className="mt-0.5">
                        {item.status === 'recebido' ? <CheckCircle className="h-5 w-5 text-primary" /> :
                         item.status === 'nao_se_aplica' ? <MinusCircle className="h-5 w-5 text-muted-foreground" /> :
                         <Circle className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1">
                        <p className={item.status === 'recebido' ? 'line-through text-muted-foreground' : 'font-medium'}>{item.description}</p>
                        {item.received_at && <p className="text-xs text-muted-foreground">Recebido em {new Date(item.received_at).toLocaleDateString('pt-BR')}</p>}
                        <Input
                          className="mt-1 text-xs h-7"
                          placeholder="Observação..."
                          defaultValue={item.notes || ''}
                          onBlur={(e) => handleItemNotes(item.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Select value={item.status} onValueChange={(v) => handleItemStatusChange(item, v as ChecklistStatus)}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(CHECKLIST_LABELS) as [ChecklistStatus, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Input placeholder="Novo item do checklist..." value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} />
            <Button onClick={handleAddItem} size="sm"><Plus className="mr-1 h-3 w-3" /> Adicionar</Button>
          </div>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Upload</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-2 flex-1">
                  <Label>Categoria</Label>
                  <Select value={docCategory} onValueChange={setDocCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{DOC_CAT_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="reg-file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md bg-background hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                    </div>
                  </Label>
                  <input id="reg-file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {docs.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">Nenhum documento</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOC_CAT_LABELS[doc.category] || doc.category} • {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
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

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Novo Registro</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddInteraction} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="space-y-2 w-full sm:w-40">
                    <Label>Tipo</Label>
                    <Select value={intForm.type} onValueChange={(v) => setIntForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['meeting', 'whatsapp', 'email', 'call', 'cartorio', 'other'].map(k => (
                          <SelectItem key={k} value={k}>{INTERACTION_LABELS[k]}</SelectItem>
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
                  <Textarea value={intForm.note} onChange={(e) => setIntForm(p => ({ ...p, note: e.target.value }))} placeholder="Detalhes..." rows={2} required />
                </div>
                <Button type="submit" disabled={intSaving} size="sm">
                  {intSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} Registrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {interactions.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum registro</CardContent></Card>
            ) : interactions.map(int => (
              <Card key={int.id} className={int.is_automatic ? 'border-primary/20 bg-primary/5' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {int.is_automatic && '⚡ '}{INTERACTION_LABELS[int.type] || int.type}
                      </Badge>
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
    </div>
  );
}
