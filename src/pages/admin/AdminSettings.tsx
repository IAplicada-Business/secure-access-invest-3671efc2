import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Save, MessageCircle, Plus, Pencil, Trash2, ClipboardList, FileText, User, Building2 } from 'lucide-react';
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

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  proposta: 'Proposta',
  contrato: 'Contrato',
  relatorio: 'Relatório',
};

const COMPANY_KEYS = [
  'company_name',
  'company_cnpj',
  'company_email',
  'company_phone',
  'company_address',
  'whatsapp_number',
] as const;

type CompanyKey = (typeof COMPANY_KEYS)[number];

const emptyCompany = {
  company_name: '',
  company_cnpj: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  whatsapp_number: '',
};

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // User profile
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Company profile (admin)
  const [company, setCompany] = useState(emptyCompany);
  const [companySaving, setCompanySaving] = useState(false);

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
    name: '',
    type: 'proposta' as DocTemplate['type'],
    content: '',
    status: 'rascunho' as DocTemplate['status'],
    variables: [{ name: '', required: true }] as Array<{ name: string; required: boolean }>,
  });
  const [tmplSaving, setTmplSaving] = useState(false);
  const [deleteTmplId, setDeleteTmplId] = useState<string | null>(null);
  const [tmplDeleting, setTmplDeleting] = useState(false);

  async function reloadTemplates() {
    const { data: tmpls } = await supabase.from('document_templates').select('*').order('name');
    setDocTemplates(
      (tmpls || []).map((t: any) => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
      })),
    );
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      const admin = Boolean(roleData);
      setIsAdmin(admin);

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle();
      setProfileName(profile?.name || user.user_metadata?.name || '');
      setProfileEmail(profile?.email || user.email || '');

      const { data: settingsRows } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [...COMPANY_KEYS]);
      const next = { ...emptyCompany };
      (settingsRows || []).forEach((row) => {
        if ((COMPANY_KEYS as readonly string[]).includes(row.key)) {
          next[row.key as CompanyKey] = row.value || '';
        }
      });
      setCompany(next);

      const { data: types } = await supabase.from('regularization_types').select('*').order('name');
      setRegTypes(
        (types || []).map((t: any) => ({
          ...t,
          checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [],
        })),
      );

      await reloadTemplates();
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setProfileSaving(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: profileName.trim() || null, email: profileEmail.trim() || null })
      .eq('id', userId);

    if (profileError) {
      toast.error('Erro ao salvar perfil: ' + profileError.message);
      setProfileSaving(false);
      return;
    }

    const authUpdates: { data?: { name: string }; email?: string; password?: string } = {
      data: { name: profileName.trim() },
    };
    if (profileEmail.trim()) authUpdates.email = profileEmail.trim();

    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        setProfileSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('As senhas não coincidem');
        setProfileSaving(false);
        return;
      }
      authUpdates.password = newPassword;
    }

    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    if (authError) {
      toast.error('Perfil salvo, mas auth falhou: ' + authError.message);
      setProfileSaving(false);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    toast.success('Perfil atualizado!');
    setProfileSaving(false);
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setCompanySaving(true);

    const rows = COMPANY_KEYS.map((key) => ({
      key,
      value: company[key].trim(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      toast.error('Erro ao salvar empresa: ' + error.message);
      setCompanySaving(false);
      return;
    }
    toast.success('Perfil da empresa salvo!');
    setCompanySaving(false);
  }

  // --- Regularization Types ---
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
    const payload = {
      name: typeForm.name.trim(),
      description: typeForm.description.trim() || null,
      checklist_template: typeForm.checklistItems.filter((i) => i.trim()),
    };
    if (editingType) {
      const { error } = await supabase.from('regularization_types').update(payload).eq('id', editingType.id);
      if (error) {
        toast.error('Erro ao atualizar');
        setTypeSaving(false);
        return;
      }
      toast.success('Tipo atualizado!');
    } else {
      const { error } = await supabase.from('regularization_types').insert(payload);
      if (error) {
        toast.error('Erro ao criar');
        setTypeSaving(false);
        return;
      }
      toast.success('Tipo criado!');
    }
    setTypeSaving(false);
    setTypeDialogOpen(false);
    const { data: types } = await supabase.from('regularization_types').select('*').order('name');
    setRegTypes(
      (types || []).map((t: any) => ({
        ...t,
        checklist_template: Array.isArray(t.checklist_template) ? t.checklist_template : [],
      })),
    );
  }

  async function toggleTypeActive(t: RegType) {
    await supabase.from('regularization_types').update({ is_active: !t.is_active }).eq('id', t.id);
    setRegTypes((prev) => prev.map((rt) => (rt.id === t.id ? { ...rt, is_active: !rt.is_active } : rt)));
    toast.success(t.is_active ? 'Tipo desativado' : 'Tipo ativado');
  }

  // --- Document Templates ---
  function openNewTmpl() {
    setEditingTmpl(null);
    setTmplForm({
      name: '',
      type: 'proposta',
      content: '',
      status: 'rascunho',
      variables: [{ name: '', required: true }],
    });
    setTmplDialogOpen(true);
  }

  function openEditTmpl(t: DocTemplate) {
    setEditingTmpl(t);
    setTmplForm({
      name: t.name,
      type: t.type,
      content: t.content,
      status: t.status,
      variables: t.variables.length > 0 ? [...t.variables] : [{ name: '', required: true }],
    });
    setTmplDialogOpen(true);
  }

  function detectVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  }

  function handleContentChange(content: string) {
    setTmplForm((p) => {
      const detected = detectVariables(content);
      const existingMap = new Map(p.variables.filter((v) => v.name).map((v) => [v.name, v]));
      const newVars = detected.map((name) => existingMap.get(name) || { name, required: true });
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
      variables: tmplForm.variables.filter((v) => v.name.trim()),
    };

    if (editingTmpl) {
      const { error } = await supabase.from('document_templates').update(payload).eq('id', editingTmpl.id);
      if (error) {
        toast.error('Erro ao atualizar');
        setTmplSaving(false);
        return;
      }
      toast.success('Template atualizado!');
    } else {
      const { error } = await supabase.from('document_templates').insert(payload);
      if (error) {
        toast.error('Erro ao criar');
        setTmplSaving(false);
        return;
      }
      toast.success('Template criado!');
    }
    setTmplSaving(false);
    setTmplDialogOpen(false);
    await reloadTemplates();
  }

  async function handleDeleteTmpl() {
    if (!deleteTmplId) return;
    setTmplDeleting(true);
    const { error } = await supabase.from('document_templates').delete().eq('id', deleteTmplId);
    if (error) {
      toast.error('Erro ao excluir template: ' + error.message);
      setTmplDeleting(false);
      return;
    }
    toast.success('Template excluído');
    setDeleteTmplId(null);
    setTmplDeleting(false);
    if (editingTmpl?.id === deleteTmplId) setTmplDialogOpen(false);
    await reloadTemplates();
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
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil, empresa e modelos operacionais da plataforma.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-0">
        <TabsList>
          <TabsTrigger value="perfil">
            <User className="h-3.5 w-3.5" /> Meu perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="empresa">
              <Building2 className="h-3.5 w-3.5" /> Empresa
            </TabsTrigger>
          )}
          <TabsTrigger value="templates">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="regularizacao">
            <ClipboardList className="h-3.5 w-3.5" /> Regularização
          </TabsTrigger>
        </TabsList>

        {/* ——— MEU PERFIL ——— */}
        <TabsContent value="perfil" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Meu perfil</CardTitle>
              <CardDescription>Atualize seu nome, e-mail e senha de acesso.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="w-full space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nome</Label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">E-mail</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-password">Nova senha</Label>
                    <Input
                      id="profile-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Deixe em branco para manter"
                      autoComplete="new-password"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-password-confirm">Confirmar senha</Label>
                    <Input
                      id="profile-password-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      className="w-full"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar perfil
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ——— EMPRESA (admin) ——— */}
        {isAdmin && (
          <TabsContent value="empresa" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Perfil da empresa</CardTitle>
                    <CardDescription>Dados institucionais da Tijolo em Capital. Somente administradores.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCompany} className="w-full space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="company-name">Nome da empresa</Label>
                      <Input
                        id="company-name"
                        value={company.company_name}
                        onChange={(e) => setCompany((p) => ({ ...p, company_name: e.target.value }))}
                        placeholder="Tijolo em Capital"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-cnpj">CNPJ</Label>
                      <Input
                        id="company-cnpj"
                        value={company.company_cnpj}
                        onChange={(e) => setCompany((p) => ({ ...p, company_cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Telefone</Label>
                      <Input
                        id="company-phone"
                        value={company.company_phone}
                        onChange={(e) => setCompany((p) => ({ ...p, company_phone: e.target.value }))}
                        placeholder="5511999999999"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-email">E-mail institucional</Label>
                      <Input
                        id="company-email"
                        type="email"
                        value={company.company_email}
                        onChange={(e) => setCompany((p) => ({ ...p, company_email: e.target.value }))}
                        placeholder="contato@empresa.com"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-address">Endereço</Label>
                      <Input
                        id="company-address"
                        value={company.company_address}
                        onChange={(e) => setCompany((p) => ({ ...p, company_address: e.target.value }))}
                        placeholder="Rua, número, cidade"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">WhatsApp de interesse</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Número que recebe as mensagens de interesse dos investidores no catálogo.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">Número (país + DDD + número)</Label>
                      <Input
                        id="whatsapp"
                        value={company.whatsapp_number}
                        onChange={(e) => setCompany((p) => ({ ...p, whatsapp_number: e.target.value }))}
                        placeholder="5511999999999"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={companySaving}>
                    {companySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar empresa
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ——— TEMPLATES ——— */}
        <TabsContent value="templates" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Templates de Documentos</CardTitle>
                    <CardDescription>Modelos para propostas, contratos e relatórios com variáveis dinâmicas</CardDescription>
                  </div>
                </div>
                <Button onClick={openNewTmpl} size="sm">
                  <Plus className="mr-1 h-3 w-3" /> Novo Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {docTemplates.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  Nenhum template cadastrado. Clique em &quot;Novo Template&quot; para começar.
                </p>
              ) : (
                <div className="space-y-3">
                  {docTemplates.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        t.status === 'ativo' ? 'bg-background' : 'bg-muted opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{t.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_TYPE_LABELS[t.type]}
                          </Badge>
                          {t.status === 'rascunho' && (
                            <Badge variant="secondary" className="text-xs">
                              Rascunho
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.variables.length} variáveis • {t.content.length} caracteres
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTmpl(t)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTmplId(t.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ——— REGULARIZAÇÃO ——— */}
        <TabsContent value="regularizacao" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
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
                <p className="py-6 text-center text-muted-foreground">Nenhum tipo cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {regTypes.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        t.is_active ? 'bg-background' : 'bg-muted opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{t.name}</p>
                          {!t.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.checklist_template.length} itens no checklist
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditType(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleTypeActive(t)}>
                          {t.is_active ? (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          ) : (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Regularization Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Editar Tipo' : 'Novo Tipo de Regularização'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveType} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="Ex: Usucapião Extrajudicial"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Breve descrição"
              />
            </div>
            <div className="space-y-2">
              <Label>Checklist Padrão</Label>
              <p className="text-xs text-muted-foreground">Itens pré-preenchidos ao criar um processo</p>
              <div className="space-y-2">
                {typeForm.checklistItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) =>
                        setTypeForm((p) => ({
                          ...p,
                          checklistItems: p.checklistItems.map((it, i) => (i === idx ? e.target.value : it)),
                        }))
                      }
                      placeholder={`Item ${idx + 1}`}
                    />
                    {typeForm.checklistItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setTypeForm((p) => ({
                            ...p,
                            checklistItems: p.checklistItems.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTypeForm((p) => ({ ...p, checklistItems: [...p.checklistItems, ''] }))}
              >
                <Plus className="mr-1 h-3 w-3" /> Adicionar Item
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={typeSaving}>
                {typeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingType ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Template Dialog */}
      <Dialog open={tmplDialogOpen} onOpenChange={setTmplDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTmpl ? 'Editar Template' : 'Novo Template de Documento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTmpl} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={tmplForm.name}
                  onChange={(e) => setTmplForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Proposta de Regularização"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={tmplForm.type}
                  onValueChange={(v) => setTmplForm((p) => ({ ...p, type: v as DocTemplate['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <Select
                value={tmplForm.status}
                onValueChange={(v) => setTmplForm((p) => ({ ...p, status: v as DocTemplate['status'] }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <p className="text-xs text-muted-foreground">
                Use {'{{nome_variavel}}'} para campos dinâmicos. Ex: {'{{nome_cliente}}'}, {'{{valor_servico}}'}
              </p>
              <Textarea
                value={tmplForm.content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={12}
                placeholder="Digite o conteúdo do template..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Variáveis Detectadas</Label>
              <p className="text-xs text-muted-foreground">
                Variáveis encontradas no conteúdo. Marque quais são obrigatórias.
              </p>
              <div className="space-y-2">
                {tmplForm.variables
                  .filter((v) => v.name)
                  .map((v, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-md bg-muted p-2">
                      <code className="font-mono text-sm text-primary">{`{{${v.name}}}`}</code>
                      <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={v.required}
                          onChange={() =>
                            setTmplForm((p) => ({
                              ...p,
                              variables: p.variables.map((vr, i) =>
                                i === idx ? { ...vr, required: !vr.required } : vr,
                              ),
                            }))
                          }
                          className="rounded"
                        />
                        Obrigatória
                      </label>
                    </div>
                  ))}
                {tmplForm.variables.filter((v) => v.name).length === 0 && (
                  <p className="py-2 text-xs text-muted-foreground">
                    Nenhuma variável detectada. Use {'{{nome}}'} no conteúdo.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {editingTmpl && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteTmplId(editingTmpl.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setTmplDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={tmplSaving}>
                  {tmplSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingTmpl ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTmplId} onOpenChange={(open) => !open && setDeleteTmplId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o modelo cadastrado. Documentos já gerados permanecem; apenas a ligação com o
              template é limpa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={tmplDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteTmpl();
              }}
              disabled={tmplDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tmplDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
