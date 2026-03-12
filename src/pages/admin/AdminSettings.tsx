import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Save, MessageCircle, Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface RegType {
  id: string;
  name: string;
  description: string | null;
  checklist_template: string[];
  is_active: boolean;
  created_at: string;
}

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

  useEffect(() => {
    async function load() {
      const { data: settingsData } = await supabase
        .from('settings').select('*').eq('key', 'whatsapp_number').single();
      if (settingsData) setWhatsappNumber(settingsData.value);

      const { data: types } = await supabase
        .from('regularization_types').select('*').order('name');
      setRegTypes((types || []).map((t: any) => ({
        ...t,
        checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [],
      })));

      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert(
      { key: 'whatsapp_number', value: whatsappNumber },
      { onConflict: 'key' }
    );
    if (error) { toast.error('Erro ao salvar configurações'); setSaving(false); return; }
    toast.success('Configurações salvas!');
    setSaving(false);
  }

  function openNewType() {
    setEditingType(null);
    setTypeForm({ name: '', description: '', checklistItems: [''] });
    setTypeDialogOpen(true);
  }

  function openEditType(t: RegType) {
    setEditingType(t);
    setTypeForm({
      name: t.name,
      description: t.description || '',
      checklistItems: t.checklist_template.length > 0 ? [...t.checklist_template] : [''],
    });
    setTypeDialogOpen(true);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault();
    if (!typeForm.name.trim()) return;
    setTypeSaving(true);
    const checklistTemplate = typeForm.checklistItems.filter(i => i.trim());
    const payload = {
      name: typeForm.name.trim(),
      description: typeForm.description.trim() || null,
      checklist_template: checklistTemplate,
    };

    if (editingType) {
      const { error } = await supabase.from('regularization_types').update(payload).eq('id', editingType.id);
      if (error) { toast.error('Erro ao atualizar'); setTypeSaving(false); return; }
      toast.success('Tipo atualizado!');
    } else {
      const { error } = await supabase.from('regularization_types').insert(payload);
      if (error) { toast.error('Erro ao criar'); setTypeSaving(false); return; }
      toast.success('Tipo criado!');
    }

    setTypeSaving(false);
    setTypeDialogOpen(false);
    // Reload
    const { data: types } = await supabase.from('regularization_types').select('*').order('name');
    setRegTypes((types || []).map((t: any) => ({
      ...t, checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [],
    })));
  }

  async function toggleTypeActive(t: RegType) {
    await supabase.from('regularization_types').update({ is_active: !t.is_active }).eq('id', t.id);
    setRegTypes(prev => prev.map(rt => rt.id === t.id ? { ...rt, is_active: !rt.is_active } : rt));
    toast.success(t.is_active ? 'Tipo desativado' : 'Tipo ativado');
  }

  function addChecklistField() {
    setTypeForm(p => ({ ...p, checklistItems: [...p.checklistItems, ''] }));
  }

  function updateChecklistField(idx: number, value: string) {
    setTypeForm(p => ({ ...p, checklistItems: p.checklistItems.map((item, i) => i === idx ? value : item) }));
  }

  function removeChecklistField(idx: number) {
    setTypeForm(p => ({ ...p, checklistItems: p.checklistItems.filter((_, i) => i !== idx) }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Número que receberá as mensagens de interesse dos investidores</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp (com DDD e código do país)</Label>
            <Input id="whatsapp" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="5511999999999" />
            <p className="text-xs text-muted-foreground">Formato: código do país + DDD + número (sem espaços ou caracteres especiais)</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Regularization Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Tipos de Regularização</CardTitle>
                <CardDescription>Cadastre os tipos de serviço e seus checklists padrão</CardDescription>
              </div>
            </div>
            <Button onClick={openNewType} size="sm">
              <Plus className="mr-1 h-3 w-3" /> Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {regTypes.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Nenhum tipo cadastrado. Clique em "Novo Tipo" para começar.</p>
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

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Editar Tipo' : 'Novo Tipo de Regularização'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveType} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ex: Usucapião Extrajudicial" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={typeForm.description} onChange={(e) => setTypeForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Breve descrição do tipo de serviço" />
            </div>
            <div className="space-y-2">
              <Label>Checklist Padrão</Label>
              <p className="text-xs text-muted-foreground">Itens que serão pré-preenchidos ao criar um processo deste tipo</p>
              <div className="space-y-2">
                {typeForm.checklistItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={item} onChange={(e) => updateChecklistField(idx, e.target.value)} placeholder={`Item ${idx + 1}`} />
                    {typeForm.checklistItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistField(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addChecklistField}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar Item
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={typeSaving}>
                {typeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingType ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
