import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, MessageCircle, Plus, Pencil, Trash2, ClipboardList, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface RegType {
  id: string;
  name: string;
  description: string | null;
  checklist_template: string[];
  is_active: boolean;
  created_at: string;
}

interface DocTemplate {
  id: string;
  name: string;
  type: 'proposta' | 'contrato' | 'relatorio';
  content: string;
  variables: Array<{ name: string; required: boolean }>;
  status: 'ativo' | 'rascunho';
  created_at: string;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = { proposta: 'Proposta', contrato: 'Contrato', relatorio: 'Relatório' };

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Regularization types
  const [regTypes, setRegTypes] = useState<RegType[]>([]);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RegType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', checklistItems: [''] });
  const [typeSaving, setTypeSaving] = useState(false);

  // Document templates
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [tmplDialogOpen, setTmplDialogOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<DocTemplate | null>(null);
  const [tmplForm, setTmplForm] = useState({
    name: '', type: 'proposta' as DocTemplate['type'], content: '', status: 'rascunho' as DocTemplate['status'],
    variables: [{ name: '', required: true }] as Array<{ name: string; required: boolean }>,
  });
  const [tmplSaving, setTmplSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'whatsapp_number').single();
      if (settingsData) setWhatsappNumber(settingsData.value);

      const { data: types } = await supabase.from('regularization_types').select('*').order('name');
      setRegTypes((types || []).map((t: any) => ({
        ...t, checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [],
      })));

      const { data: tmpls } = await supabase.from('document_templates').select('*').order('name');
      setDocTemplates((tmpls || []).map((t: any) => ({
        ...t, variables: Array.isArray(t.variables) ? t.variables : [],
      })));

      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert({ key: 'whatsapp_number', value: whatsappNumber }, { onConflict: 'key' });
    if (error) { toast.error('Erro ao salvar configurações'); setSaving(false); return; }
    toast.success('Configurações salvas!');
    setSaving(false);
  }

  // --- Regularization Types ---
  function openNewType() { setEditingType(null); setTypeForm({ name: '', description: '', checklistItems: [''] }); setTypeDialogOpen(true); }
  function openEditType(t: RegType) {
    setEditingType(t);
    setTypeForm({ name: t.name, description: t.description || '', checklistItems: t.checklist_template.length > 0 ? [...t.checklist_template] : [''] });
    setTypeDialogOpen(true);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault();
    if (!typeForm.name.trim()) return;
    setTypeSaving(true);
    const payload = { name: typeForm.name.trim(), description: typeForm.description.trim() || null, checklist_template: typeForm.checklistItems.filter(i => i.trim()) };
    if (editingType) {
      const { error } = await supabase.from('regularization_types').update(payload).eq('id', editingType.id);
      if (error) { toast.error('Erro ao atualizar'); setTypeSaving(false); return; }
      toast.success('Tipo atualizado!');
    } else {
      const { error } = await supabase.from('regularization_types').insert(payload);
      if (error) { toast.error('Erro ao criar'); setTypeSaving(false); return; }
      toast.success('Tipo criado!');
    }
    setTypeSaving(false); setTypeDialogOpen(false);
    const { data: types } = await supabase.from('regularization_types').select('*').order('name');
    setRegTypes((types || []).map((t: any) => ({ ...t, checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [] })));
  }

  async function toggleTypeActive(t: RegType) {
    await supabase.from('regularization_types').update({ is_active: !t.is_active }).eq('id', t.id);
    setRegTypes(prev => prev.map(rt => rt.id === t.id ? { ...rt, is_active: !rt.is_active } : rt));
    toast.success(t.is_active ? 'Tipo desativado' : 'Tipo ativado');
  }

  // --- Document Templates ---
  function openNewTmpl() {
    setEditingTmpl(null);
    setTmplForm({ name: '', type: 'proposta', content: '', status: 'rascunho', variables: [{ name: '', required: true }] });
    setTmplDialogOpen(true);
  }

  function openEditTmpl(t: DocTemplate) {
    setEditingTmpl(t);
    setTmplForm({ name: t.name, type: t.type, content: t.content, status: t.status, variables: t.variables.length > 0 ? [...t.variables] : [{ name: '', required: true }] });
    setTmplDialogOpen(true);
  }

  // Auto-detect variables from content
  function detectVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }

  function handleContentChange(content: string) {
    setTmplForm(p => {
      const detected = detectVariables(content);
      const existingMap = new Map(p.variables.filter(v => v.name).map(v => [v.name, v]));
      const newVars = detected.map(name => existingMap.get(name) || { name, required: true });
      if (newVars.length === 0) newVars.push({ name: '', required: true });
      return { ...p, content, variables: newVars };
    });
  }

  async function handleSaveTmpl(e: React.FormEvent) {
    e.preventDefault();
    if (!tmplForm.name.trim()) return;
    setTmplSaving(true);
    const payload = {
      name: tmplForm.name.trim(),
      type: tmplForm.type,
      content: tmplForm.content,
      status: tmplForm.status,
      variables: tmplForm.variables.filter(v => v.name.trim()),
    };

    if (editingTmpl) {
      const { error } = await supabase.from('document_templates').update(payload).eq('id', editingTmpl.id);
      if (error) { toast.error('Erro ao atualizar'); setTmplSaving(false); return; }
      toast.success('Template atualizado!');
    } else {
      const { error } = await supabase.from('document_templates').insert(payload);
      if (error) { toast.error('Erro ao criar'); setTmplSaving(false); return; }
      toast.success('Template criado!');
    }
    setTmplSaving(false); setTmplDialogOpen(false);
    const { data: tmpls } = await supabase.from('document_templates').select('*').order('name');
    setDocTemplates((tmpls || []).map((t: any) => ({ ...t, variables: Array.isArray(t.variables) ? t.variables : [] })));
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div><CardTitle>WhatsApp</CardTitle><CardDescription>Número que receberá as mensagens de interesse dos investidores</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp (com DDD e código do país)</Label>
            <Input id="whatsapp" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="5511999999999" />
            <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Regularization Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div><CardTitle>Tipos de Regularização</CardTitle><CardDescription>Cadastre os tipos de serviço e seus checklists padrão</CardDescription></div>
            </div>
            <Button onClick={openNewType} size="sm"><Plus className="mr-1 h-3 w-3" /> Novo Tipo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {regTypes.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhum tipo cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {regTypes.map(t => (
                <div key={t.id} className={`flex items-center justify-between p-4 rounded-lg border ${t.is_active ? 'bg-background' : 'bg-muted opacity-60'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.name}</p>
                      {!t.is_active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{t.checklist_template.length} itens no checklist</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditType(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleTypeActive(t)}>
                      {t.is_active ? <Trash2 className="h-4 w-4 text-destructive" /> : <Plus className="h-4 w-4 text-primary" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div><CardTitle>Templates de Documentos</CardTitle><CardDescription>Modelos para propostas, contratos e relatórios com variáveis dinâmicas</CardDescription></div>
            </div>
            <Button onClick={openNewTmpl} size="sm"><Plus className="mr-1 h-3 w-3" /> Novo Template</Button>
          </div>
        </CardHeader>
        <CardContent>
          {docTemplates.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhum template cadastrado. Clique em "Novo Template" para começar.</p>
          ) : (
            <div className="space-y-3">
              {docTemplates.map(t => (
                <div key={t.id} className={`flex items-center justify-between p-4 rounded-lg border ${t.status === 'ativo' ? 'bg-background' : 'bg-muted opacity-60'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.name}</p>
                      <Badge variant="outline" className="text-xs">{TEMPLATE_TYPE_LABELS[t.type]}</Badge>
                      {t.status === 'rascunho' && <Badge variant="secondary" className="text-xs">Rascunho</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.variables.length} variáveis • {t.content.length} caracteres</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditTmpl(t)}><Pencil className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regularization Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingType ? 'Editar Tipo' : 'Novo Tipo de Regularização'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveType} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ex: Usucapião Extrajudicial" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={typeForm.description} onChange={(e) => setTypeForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Breve descrição" />
            </div>
            <div className="space-y-2">
              <Label>Checklist Padrão</Label>
              <p className="text-xs text-muted-foreground">Itens pré-preenchidos ao criar um processo</p>
              <div className="space-y-2">
                {typeForm.checklistItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={item} onChange={(e) => setTypeForm(p => ({ ...p, checklistItems: p.checklistItems.map((it, i) => i === idx ? e.target.value : it) }))} placeholder={`Item ${idx + 1}`} />
                    {typeForm.checklistItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setTypeForm(p => ({ ...p, checklistItems: p.checklistItems.filter((_, i) => i !== idx) }))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setTypeForm(p => ({ ...p, checklistItems: [...p.checklistItems, ''] }))}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar Item
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={typeSaving}>{typeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingType ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Template Dialog */}
      <Dialog open={tmplDialogOpen} onOpenChange={setTmplDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTmpl ? 'Editar Template' : 'Novo Template de Documento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTmpl} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={tmplForm.name} onChange={(e) => setTmplForm(p => ({ ...p, name: e.target.value }))} required placeholder="Proposta de Regularização" />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={tmplForm.type} onValueChange={(v) => setTmplForm(p => ({ ...p, type: v as DocTemplate['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="relatorio">Relatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={tmplForm.status} onValueChange={(v) => setTmplForm(p => ({ ...p, status: v as DocTemplate['status'] }))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <p className="text-xs text-muted-foreground">Use {'{{nome_variavel}}'} para campos dinâmicos. Ex: {'{{nome_cliente}}'}, {'{{valor_servico}}'}</p>
              <Textarea value={tmplForm.content} onChange={(e) => handleContentChange(e.target.value)} rows={12} placeholder="Digite o conteúdo do template..." className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label>Variáveis Detectadas</Label>
              <p className="text-xs text-muted-foreground">Variáveis encontradas no conteúdo. Marque quais são obrigatórias.</p>
              <div className="space-y-2">
                {tmplForm.variables.filter(v => v.name).map((v, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-muted">
                    <code className="text-sm font-mono text-primary">{`{{${v.name}}}`}</code>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={() => setTmplForm(p => ({
                          ...p,
                          variables: p.variables.map((vr, i) => i === idx ? { ...vr, required: !vr.required } : vr),
                        }))}
                        className="rounded"
                      />
                      Obrigatória
                    </label>
                  </div>
                ))}
                {tmplForm.variables.filter(v => v.name).length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">Nenhuma variável detectada. Use {'{{nome}}'} no conteúdo.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTmplDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={tmplSaving}>{tmplSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingTmpl ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
