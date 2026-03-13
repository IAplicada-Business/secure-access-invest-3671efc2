import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, ArrowRight, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EditingDoc {
  id: string;
  template_id: string | null;
  client_id: string | null;
  type: string;
  title: string;
  variables_data: Record<string, string>;
}

interface Props {
  type: 'proposta' | 'contrato';
  onComplete: () => void;
  onCancel: () => void;
  preselectedClientId?: string;
  preselectedProcessId?: string;
  preselectedScope?: string;
  editingDoc?: EditingDoc;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: Array<{ name: string; required: boolean; type?: string }>;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf_cnpj: string | null;
}

export default function DocumentWizard({ type, onComplete, onCancel, preselectedClientId, preselectedProcessId, preselectedScope, editingDoc }: Props) {
  const [step, setStep] = useState(editingDoc ? 2 : 1);

  // Step 1
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(editingDoc?.client_id || preselectedClientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(editingDoc?.template_id || '');
  const [clientSearch, setClientSearch] = useState('');

  // Step 2
  const [variablesData, setVariablesData] = useState<Record<string, string>>(editingDoc?.variables_data || {});

  // Step 3/4
  const [previewContent, setPreviewContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState(editingDoc?.title || '');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: clientsData }, { data: templatesData }] = await Promise.all([
      supabase.from('clients').select('id, name, phone, email, cpf_cnpj').order('name'),
      supabase.from('document_templates').select('*').eq('status', 'ativo').eq('type', type).order('name'),
    ]);
    setClients((clientsData || []) as Client[]);
    setTemplates((templatesData || []).map((t: any) => ({
      ...t,
      variables: Array.isArray(t.variables) ? t.variables : [],
    })));
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      // Pre-populate auto variables
      const autoVars: Record<string, string> = {};
      if (selectedClient) {
        autoVars['nome_cliente'] = selectedClient.name;
        autoVars['telefone_cliente'] = selectedClient.phone;
        autoVars['email_cliente'] = selectedClient.email || '';
        autoVars['cpf_cnpj_cliente'] = selectedClient.cpf_cnpj || '';
      }
      autoVars['data'] = new Date().toLocaleDateString('pt-BR');
      if (preselectedScope) {
        autoVars['escopo_servico'] = preselectedScope;
      }
      setVariablesData(autoVars);
      setTitle(`${type === 'proposta' ? 'Proposta' : 'Contrato'} - ${selectedClient?.name || 'Cliente'}`);
    }
  }

  function goToStep2() {
    if (!selectedClientId || !selectedTemplateId) {
      toast.error('Selecione cliente e template');
      return;
    }
    handleTemplateSelect(selectedTemplateId);
    setStep(2);
  }

  function goToStep3() {
    // Check required vars
    if (selectedTemplate) {
      const missing = selectedTemplate.variables
        .filter(v => v.required && !variablesData[v.name]?.trim())
        .map(v => v.name);
      if (missing.length > 0) {
        toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
        return;
      }
    }

    // Generate preview
    let content = selectedTemplate?.content || '';
    for (const [key, value] of Object.entries(variablesData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value || `[${key}]`);
    }
    setPreviewContent(content);
    setStep(3);
  }

  async function handleGenerate() {
    if (!selectedTemplate || !selectedClientId) return;
    setGenerating(true);

    try {
      // Call edge function to generate PDF
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: {
          content: selectedTemplate.content,
          variables_data: variablesData,
          title,
        },
      });

      if (error) throw error;

      // Save generated document record
      const { error: insertError } = await supabase.from('generated_documents').insert({
        template_id: selectedTemplateId,
        client_id: selectedClientId,
        type,
        title,
        variables_data: variablesData,
        file_url: data.file_url,
        status: 'rascunho',
        process_id: preselectedProcessId || null,
      });

      if (insertError) throw insertError;

      toast.success('Documento gerado com sucesso!');
      setStep(4);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setGenerating(false);
    }
  }

  // Determine field type for a variable
  function getFieldType(varName: string): 'textarea' | 'number' | 'date' | 'select' | 'text' {
    if (['narrativa_caso', 'escopo_servico', 'objeto_contrato', 'clausulas_variaveis'].includes(varName)) return 'textarea';
    if (['valor_servico', 'valor_total'].includes(varName)) return 'number';
    if (['prazo_entrega', 'validade_proposta', 'prazo_execucao'].includes(varName)) return 'date';
    if (['condicoes_pagamento', 'forma_pagamento'].includes(varName)) return 'select';
    return 'text';
  }

  const paymentOptions = ['À vista', 'Parcelado 2x', 'Parcelado 3x', 'Entrada + Parcelas', 'A combinar'];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s === step ? 'bg-primary text-primary-foreground' :
              s < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 && 'Contexto'}
          {step === 2 && 'Campos Variáveis'}
          {step === 3 && 'Preview'}
          {step === 4 && 'Concluído'}
        </span>
      </div>

      {/* Step 1: Context */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">
            {type === 'proposta' ? 'Nova Proposta' : 'Novo Contrato'}
          </h2>

          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Input
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="mb-2"
            />
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
              <SelectContent>
                {filteredClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template *</Label>
            {templates.length === 0 ? (
              <p className="text-sm text-destructive">Nenhum template ativo do tipo "{type}". Cadastre em Configurações.</p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione o template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.variables.length} variáveis)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Título do documento</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`${type === 'proposta' ? 'Proposta' : 'Contrato'} - Nome do cliente`}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={goToStep2} disabled={!selectedClientId || !selectedTemplateId}>
              Próximo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Variables */}
      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Preencha os campos</h2>
          <p className="text-sm text-muted-foreground">
            Os dados do cliente foram preenchidos automaticamente. Complete os demais campos.
          </p>

          {selectedTemplate.variables.map(v => {
            const fieldType = getFieldType(v.name);
            const label = v.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            return (
              <div key={v.name} className="space-y-2">
                <Label className="flex items-center gap-1">
                  {label}
                  {v.required && <span className="text-destructive">*</span>}
                </Label>

                {fieldType === 'textarea' ? (
                  <Textarea
                    value={variablesData[v.name] || ''}
                    onChange={e => setVariablesData(p => ({ ...p, [v.name]: e.target.value }))}
                    rows={4}
                    placeholder={`Digite ${label.toLowerCase()}...`}
                  />
                ) : fieldType === 'number' ? (
                  <Input
                    type="number"
                    value={variablesData[v.name] || ''}
                    onChange={e => setVariablesData(p => ({ ...p, [v.name]: e.target.value }))}
                    placeholder="0,00"
                  />
                ) : fieldType === 'date' ? (
                  <Input
                    type="date"
                    value={variablesData[v.name] || ''}
                    onChange={e => setVariablesData(p => ({ ...p, [v.name]: e.target.value }))}
                  />
                ) : fieldType === 'select' ? (
                  <Select value={variablesData[v.name] || ''} onValueChange={val => setVariablesData(p => ({ ...p, [v.name]: val }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {paymentOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={variablesData[v.name] || ''}
                    onChange={e => setVariablesData(p => ({ ...p, [v.name]: e.target.value }))}
                    placeholder={label}
                  />
                )}
              </div>
            );
          })}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={goToStep3}>
              Preview <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Preview do Documento</h2>
          <p className="text-sm text-muted-foreground">Revise o conteúdo antes de gerar o PDF.</p>

          <Card className="border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-display text-xl font-bold mb-4">{title}</h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {previewContent}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Ajustar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
              ) : (
                <><FileText className="mr-1 h-4 w-4" /> Gerar PDF</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="text-center space-y-4 py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold">Documento Gerado!</h2>
          <p className="text-muted-foreground">
            O PDF foi gerado e salvo. Você pode baixá-lo na listagem de documentos.
          </p>
          <Button onClick={onComplete}>Concluir</Button>
        </div>
      )}
    </div>
  );
}
