import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Send,
  MessageSquare,
  Loader2,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type CommunicationType = 'newsletter' | 'aviso' | 'oferta' | 'personalizada';
type CommunicationTone = 'informativo' | 'comercial' | 'relacionamento';
type CommunicationAudience = 'all_partners' | 'partner_type' | 'all_clients' | 'manual';
type CommunicationStatus = 'rascunho' | 'pronta' | 'enviada';
type ContactType = 'partner' | 'client';

interface Communication {
  id: string;
  title: string;
  type: CommunicationType;
  tone: CommunicationTone;
  briefing_topic: string | null;
  briefing_points: string | null;
  generated_content: string | null;
  final_content: string | null;
  audience_type: CommunicationAudience;
  audience_filter: string | null;
  status: CommunicationStatus;
  created_at: string;
}

interface Recipient {
  id?: string;
  communication_id?: string;
  contact_type: ContactType;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  sent_at: string | null;
  last_interaction?: string | null;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  subtype?: string;
  last_interaction?: string | null;
}

const typeLabels: Record<CommunicationType, string> = {
  newsletter: 'Newsletter',
  aviso: 'Aviso',
  oferta: 'Oferta',
  personalizada: 'Personalizada',
};

const toneLabels: Record<CommunicationTone, string> = {
  informativo: 'Informativo',
  comercial: 'Comercial',
  relacionamento: 'Relacionamento',
};

const audienceLabels: Record<CommunicationAudience, string> = {
  all_partners: 'Todos os parceiros',
  partner_type: 'Por tipo de parceiro',
  all_clients: 'Todos os clientes',
  manual: 'Seleção manual',
};

const statusConfig: Record<CommunicationStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pronta: { label: 'Pronta', variant: 'outline' },
  enviada: { label: 'Enviada', variant: 'default' },
};

const partnerTypeLabels: Record<string, string> = {
  imobiliaria: 'Imobiliária',
  corretor_autonomo: 'Corretor Autônomo',
  assessor_investimento: 'Assessor de Investimento',
  arquiteto: 'Arquiteto',
  engenheiro: 'Engenheiro',
  contador: 'Contador',
  outro: 'Outro',
};

export default function AdminCommunications() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Wizard state
  const [wizardType, setWizardType] = useState<CommunicationType>('newsletter');
  const [wizardTone, setWizardTone] = useState<CommunicationTone>('informativo');
  const [wizardAudience, setWizardAudience] = useState<CommunicationAudience>('all_partners');
  const [wizardPartnerType, setWizardPartnerType] = useState('');
  const [wizardTopic, setWizardTopic] = useState('');
  const [wizardPoints, setWizardPoints] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [finalContent, setFinalContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Detail/send view
  const [viewComm, setViewComm] = useState<Communication | null>(null);
  const [viewRecipients, setViewRecipients] = useState<Recipient[]>([]);
  const [viewOpen, setViewOpen] = useState(false);

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Contacts without phone
  const [contactsWithoutPhone, setContactsWithoutPhone] = useState<{ name: string; type: string }[]>([]);
  const [showExcluded, setShowExcluded] = useState(false);

  const fetchCommunications = useCallback(async () => {
    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar comunicações'); return; }
    setCommunications((data || []) as unknown as Communication[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCommunications(); }, [fetchCommunications]);

  // Load contacts for step 4
  const loadContacts = useCallback(async () => {
    const allContacts: Contact[] = [];
    const excluded: { name: string; type: string }[] = [];

    // Partners
    const { data: partners } = await supabase
      .from('partners')
      .select('id, name, phone, type')
      .eq('status', 'active');

    if (partners) {
      // Get last interaction for each partner
      const partnerIds = partners.map(p => p.id);
      const { data: interactions } = await supabase
        .from('partner_interactions')
        .select('partner_id, interaction_date')
        .in('partner_id', partnerIds)
        .order('interaction_date', { ascending: false });

      const lastInteractionMap: Record<string, string> = {};
      interactions?.forEach(i => {
        if (!lastInteractionMap[i.partner_id]) lastInteractionMap[i.partner_id] = i.interaction_date;
      });

      partners.forEach(p => {
        if (wizardAudience === 'partner_type' && wizardPartnerType && p.type !== wizardPartnerType) return;
        if (!p.phone || p.phone.trim() === '') {
          excluded.push({ name: p.name, type: 'Parceiro' });
          return;
        }
        allContacts.push({
          id: p.id,
          name: p.name,
          phone: p.phone,
          type: 'partner',
          subtype: partnerTypeLabels[p.type] || p.type,
          last_interaction: lastInteractionMap[p.id] || null,
        });
      });
    }

    // Clients (only for all_clients or manual)
    if (wizardAudience === 'all_clients' || wizardAudience === 'manual') {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, phone, type')
        .eq('status', 'active');

      if (clients) {
        const clientIds = clients.map(c => c.id);
        const { data: interactions } = await supabase
          .from('client_interactions')
          .select('client_id, interaction_date')
          .in('client_id', clientIds)
          .order('interaction_date', { ascending: false });

        const lastInteractionMap: Record<string, string> = {};
        interactions?.forEach(i => {
          if (!lastInteractionMap[i.client_id]) lastInteractionMap[i.client_id] = i.interaction_date;
        });

        clients.forEach(c => {
          if (!c.phone || c.phone.trim() === '') {
            excluded.push({ name: c.name, type: 'Cliente' });
            return;
          }
          allContacts.push({
            id: c.id,
            name: c.name,
            phone: c.phone,
            type: 'client',
            subtype: c.type,
            last_interaction: lastInteractionMap[c.id] || null,
          });
        });
      }
    }

    setContacts(allContacts);
    setContactsWithoutPhone(excluded);
    setShowExcluded(false);

    // Auto-select all for non-manual audiences
    if (wizardAudience !== 'manual') {
      setSelectedContactIds(new Set(allContacts.map(c => c.id)));
    }
  }, [wizardAudience, wizardPartnerType]);

  const handleGenerate = async () => {
    if (!wizardTopic.trim()) { toast.error('Informe o tema principal'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-communication', {
        body: { type: wizardType, tone: wizardTone, topic: wizardTopic, points: wizardPoints },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedContent(data.content);
      setFinalContent(data.content);
      toast.success('Texto gerado com sucesso!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar texto');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!finalContent.trim()) { toast.error('O texto final está vazio'); return; }
    setSaving(true);
    try {
      const title = wizardTopic.slice(0, 80) || 'Comunicação sem título';
      const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id));

      const { data: comm, error: commError } = await supabase
        .from('communications')
        .insert({
          title,
          type: wizardType,
          tone: wizardTone,
          briefing_topic: wizardTopic,
          briefing_points: wizardPoints || null,
          generated_content: generatedContent || null,
          final_content: finalContent,
          audience_type: wizardAudience,
          audience_filter: wizardAudience === 'partner_type' ? wizardPartnerType : null,
          status: 'pronta' as CommunicationStatus,
        } as any)
        .select()
        .single();

      if (commError) throw commError;

      // Insert recipients
      if (selectedContacts.length > 0) {
        const recipientRows = selectedContacts.map(c => ({
          communication_id: (comm as any).id,
          contact_type: c.type,
          contact_id: c.id,
          contact_name: c.name,
          contact_phone: c.phone,
        }));
        const { error: recError } = await supabase
          .from('communication_recipients')
          .insert(recipientRows as any);
        if (recError) throw recError;
      }

      toast.success('Comunicação salva com sucesso!');
      setWizardOpen(false);
      resetWizard();
      fetchCommunications();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setWizardType('newsletter');
    setWizardTone('informativo');
    setWizardAudience('all_partners');
    setWizardPartnerType('');
    setWizardTopic('');
    setWizardPoints('');
    setGeneratedContent('');
    setFinalContent('');
    setContacts([]);
    setSelectedContactIds(new Set());
  };

  const openView = async (comm: Communication) => {
    setViewComm(comm);
    const { data } = await supabase
      .from('communication_recipients')
      .select('*')
      .eq('communication_id', comm.id)
      .order('contact_name');
    setViewRecipients((data || []) as unknown as Recipient[]);
    setViewOpen(true);
  };

  const markAsSent = async (recipient: Recipient) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('communication_recipients')
      .update({ sent_at: now } as any)
      .eq('id', recipient.id!);
    if (error) { toast.error('Erro ao marcar como enviado'); return; }

    // Register interaction
    const interactionData = {
      note: `Newsletter — ${viewComm?.title}`,
      type: 'other',
      interaction_date: now,
    };

    if (recipient.contact_type === 'partner') {
      await supabase.from('partner_interactions').insert({ ...interactionData, partner_id: recipient.contact_id });
    } else {
      await supabase.from('client_interactions').insert({ ...interactionData, client_id: recipient.contact_id });
    }

    // Update local state
    setViewRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, sent_at: now } : r));

    // Check if all sent
    const updated = viewRecipients.map(r => r.id === recipient.id ? { ...r, sent_at: now } : r);
    if (updated.every(r => r.sent_at)) {
      await supabase.from('communications').update({ status: 'enviada' } as any).eq('id', viewComm!.id);
      fetchCommunications();
    }

    toast.success(`Marcado como enviado para ${recipient.contact_name}`);
  };

  const buildWhatsAppUrl = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Texto copiado!');
  };

  const handleDuplicate = async (comm: Communication) => {
    const { error } = await supabase
      .from('communications')
      .insert({
        title: `${comm.title} (cópia)`,
        type: comm.type,
        tone: comm.tone,
        briefing_topic: comm.briefing_topic,
        briefing_points: comm.briefing_points,
        generated_content: comm.generated_content,
        final_content: comm.final_content,
        audience_type: comm.audience_type,
        audience_filter: comm.audience_filter,
        status: 'rascunho' as CommunicationStatus,
      } as any);
    if (error) { toast.error('Erro ao duplicar'); return; }
    toast.success('Comunicação duplicada');
    fetchCommunications();
  };

  // Step navigation
  const canAdvance = () => {
    if (step === 1) return true;
    if (step === 2) return wizardTopic.trim().length > 0;
    if (step === 3) return finalContent.trim().length > 0;
    if (step === 4) return selectedContactIds.size > 0;
    return true;
  };

  const goNext = async () => {
    if (step === 3) {
      // Load contacts before going to step 4
      await loadContacts();
    }
    setStep(s => s + 1);
  };

  // ── Render ──

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            s === step ? 'bg-primary text-primary-foreground' :
            s < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {s < step ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 5 && <div className={`w-8 h-0.5 ${s < step ? 'bg-primary/40' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configuração</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de comunicação</Label>
          <Select value={wizardType} onValueChange={(v) => setWizardType(v as CommunicationType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tom</Label>
          <Select value={wizardTone} onValueChange={(v) => setWizardTone(v as CommunicationTone)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(toneLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Público-alvo</Label>
        <Select value={wizardAudience} onValueChange={(v) => setWizardAudience(v as CommunicationAudience)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(audienceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {wizardAudience === 'partner_type' && (
        <div className="space-y-2">
          <Label>Tipo de parceiro</Label>
          <Select value={wizardPartnerType} onValueChange={setWizardPartnerType}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(partnerTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Briefing para a IA</h3>
      <div className="space-y-2">
        <Label>Tema principal *</Label>
        <Input
          value={wizardTopic}
          onChange={(e) => setWizardTopic(e.target.value)}
          placeholder="Ex: atualização sobre regularização extrajudicial, novos imóveis disponíveis..."
        />
      </div>
      <div className="space-y-2">
        <Label>Pontos que devem aparecer</Label>
        <Textarea
          value={wizardPoints}
          onChange={(e) => setWizardPoints(e.target.value)}
          placeholder="Ex: mencionar prazo de 90 dias, citar a plataforma de imóveis, agradecer a parceria..."
          rows={4}
        />
      </div>
      <Button onClick={handleGenerate} disabled={generating || !wizardTopic.trim()} className="w-full">
        {generating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Gerar com IA</>
        )}
      </Button>
      {generatedContent && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground mb-2">✨ Texto gerado — avance para revisar</p>
          <p className="text-sm whitespace-pre-wrap">{generatedContent.slice(0, 200)}...</p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Revisão e ajuste</h3>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          Gerar novamente
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Texto da comunicação</Label>
        <Textarea
          value={finalContent}
          onChange={(e) => setFinalContent(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
      </div>
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Preview WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#e5ddd5] rounded-lg p-4">
            <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[90%] ml-auto shadow-sm">
              <p className="text-sm whitespace-pre-wrap text-[#303030]">{finalContent || 'O texto aparecerá aqui...'}</p>
              <p className="text-[10px] text-[#999] text-right mt-1">agora</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Destinatários</h3>
      {contactsWithoutPhone.length > 0 && (
        <Collapsible open={showExcluded} onOpenChange={setShowExcluded}>
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                <strong>{contactsWithoutPhone.length}</strong> contato{contactsWithoutPhone.length !== 1 ? 's' : ''} excluído{contactsWithoutPhone.length !== 1 ? 's' : ''} por não ter telefone cadastrado.
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2 h-auto py-1 px-2 text-xs">
                  {showExcluded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {showExcluded ? 'Ocultar' : 'Ver quais'}
                </Button>
              </CollapsibleTrigger>
            </AlertDescription>
          </Alert>
          <CollapsibleContent>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10 p-3 mt-2">
              <p className="text-xs text-muted-foreground mb-2">Cadastre o telefone destes contatos no CRM para incluí-los:</p>
              <ul className="space-y-1">
                {contactsWithoutPhone.map((c, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{c.type}</Badge>
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {wizardAudience !== 'manual' ? (
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Esta mensagem será enviada para <strong>{contacts.length}</strong> contato{contacts.length !== 1 ? 's' : ''}.
          </p>
        </div>
      ) : null}
      <div className="max-h-[400px] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {wizardAudience === 'manual' && <TableHead className="w-10"></TableHead>}
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Última interação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map(c => (
              <TableRow key={c.id}>
                {wizardAudience === 'manual' && (
                  <TableCell>
                    <Checkbox
                      checked={selectedContactIds.has(c.id)}
                      onCheckedChange={(checked) => {
                        setSelectedContactIds(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(c.id); else next.delete(c.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {c.type === 'partner' ? 'Parceiro' : 'Cliente'}
                    {c.subtype ? ` • ${c.subtype}` : ''}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.last_interaction
                    ? format(new Date(c.last_interaction), "dd/MM/yyyy", { locale: ptBR })
                    : 'Sem registro'}
                </TableCell>
              </TableRow>
            ))}
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={wizardAudience === 'manual' ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Nenhum contato encontrado com telefone cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {wizardAudience === 'manual' && (
        <p className="text-sm text-muted-foreground">
          {selectedContactIds.size} contato{selectedContactIds.size !== 1 ? 's' : ''} selecionado{selectedContactIds.size !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Finalização</h3>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Texto final</p>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(finalContent)}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap">{finalContent}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>{selectedContactIds.size}</strong> destinatário{selectedContactIds.size !== 1 ? 's' : ''} • Tipo: {typeLabels[wizardType]} • Tom: {toneLabels[wizardTone]}
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Salvar comunicação
      </Button>
    </div>
  );

  // ── View/Send dialog ──
  const renderViewDialog = () => (
    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{viewComm?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant={statusConfig[viewComm?.status || 'rascunho'].variant}>
              {statusConfig[viewComm?.status || 'rascunho'].label}
            </Badge>
            <Badge variant="secondary">{typeLabels[viewComm?.type || 'newsletter']}</Badge>
            <Badge variant="outline">{toneLabels[viewComm?.tone || 'informativo']}</Badge>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex justify-between items-start mb-2">
              <Label className="text-xs text-muted-foreground">Texto da comunicação</Label>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(viewComm?.final_content || '')}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{viewComm?.final_content}</p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Destinatários ({viewRecipients.length})</h4>
            <div className="space-y-2">
              {viewRecipients.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.contact_name}</p>
                    <p className="text-xs text-muted-foreground">{r.contact_phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.sent_at ? (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Enviado
                      </Badge>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={buildWhatsAppUrl(r.contact_phone, viewComm?.final_content || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => markAsSent(r)}
                        >
                          <Send className="h-3 w-3" />
                          Enviado
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comunicações</h1>
          <p className="text-muted-foreground">Gere e envie comunicações via WhatsApp com ajuda da IA.</p>
        </div>
        <Button onClick={() => { resetWizard(); setWizardOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nova Comunicação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pronta">Pronta</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listing */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (() => {
                const filtered = communications.filter(c => {
                  if (filterStatus !== 'all' && c.status !== filterStatus) return false;
                  if (filterSearch && !c.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
                  return true;
                });
                if (filtered.length === 0) return (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {communications.length === 0 ? 'Nenhuma comunicação criada ainda.' : 'Nenhuma comunicação encontrada com esses filtros.'}
                    </TableCell>
                  </TableRow>
                );
                return filtered.map(comm => (
                <TableRow key={comm.id} className="cursor-pointer" onClick={() => openView(comm)}>
                  <TableCell className="font-medium">{comm.title}</TableCell>
                  <TableCell><Badge variant="secondary">{typeLabels[comm.type]}</Badge></TableCell>
                  <TableCell className="text-sm">{audienceLabels[comm.audience_type]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(comm.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[comm.status].variant}>{statusConfig[comm.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(comm); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Nova Comunicação</DialogTitle>
          </DialogHeader>
          {renderStepIndicator()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {step < 5 ? (
              <Button onClick={goNext} disabled={!canAdvance()}>
                Avançar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {renderViewDialog()}
    </div>
  );
}
