import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Loader2, Plus, FileText, Download, Archive, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import DocumentWizard from '@/components/documents/DocumentWizard';

interface GeneratedDoc {
  id: string;
  template_id: string | null;
  client_id: string | null;
  type: string;
  title: string;
  variables_data: Record<string, string>;
  file_url: string | null;
  status: string;
  process_id: string | null;
  created_at: string;
  client_name?: string;
}

const TYPE_LABELS: Record<string, string> = { proposta: 'Proposta', contrato: 'Contrato', relatorio: 'Relatório' };
const STATUS_LABELS: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', assinado: 'Assinado', arquivado: 'Arquivado' };
const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviado: 'bg-blue-100 text-blue-800',
  assinado: 'bg-green-100 text-green-800',
  arquivado: 'bg-muted text-muted-foreground',
};

function PreviewContent({ doc }: { doc: GeneratedDoc }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!doc.template_id) {
        setContent(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('document_templates')
        .select('content')
        .eq('id', doc.template_id)
        .single();
      if (data?.content) {
        let processed = data.content;
        const vars = doc.variables_data || {};
        for (const [key, value] of Object.entries(vars)) {
          processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
        }
        setContent(processed);
      }
      setLoading(false);
    }
    load();
  }, [doc]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (!content) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold">{doc.title}</h2>
        <div className="prose prose-sm max-w-none">
          {Object.entries(doc.variables_data).map(([key, value]) => (
            <div key={key} className="mb-2">
              <span className="font-semibold text-muted-foreground">{key}: </span>
              <span className="whitespace-pre-wrap">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">{doc.title}</h2>
      <div className="border rounded-lg p-6 bg-white">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {content.split('\n').map((line, i) => {
            const isBold = line.startsWith('**') && line.endsWith('**');
            const text = isBold ? line.slice(2, -2) : line;
            if (isBold) return <p key={i} className="font-bold text-base mt-4 mb-1 border-b border-[hsl(var(--primary))] pb-1">{text}</p>;
            if (!line.trim()) return <br key={i} />;
            return <p key={i} className="mb-1">{text}</p>;
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<'proposta' | 'contrato'>('proposta');
  const [previewDoc, setPreviewDoc] = useState<GeneratedDoc | null>(null);

  async function loadDocs() {
    const { data: docsData } = await supabase
      .from('generated_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!docsData) { setLoading(false); return; }

    // Load client names
    const clientIds = [...new Set(docsData.filter(d => d.client_id).map(d => d.client_id!))];
    let clientMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds);
      clients?.forEach(c => clientMap.set(c.id, c.name));
    }

    setDocs(docsData.map(d => ({
      ...d,
      variables_data: (d.variables_data || {}) as Record<string, string>,
      client_name: d.client_id ? clientMap.get(d.client_id) || 'Cliente removido' : undefined,
    })));
    setLoading(false);
  }

  useEffect(() => { loadDocs(); }, []);

  async function handleStatusChange(docId: string, newStatus: 'rascunho' | 'enviado' | 'assinado' | 'arquivado') {
    const { error } = await supabase.from('generated_documents').update({ status: newStatus }).eq('id', docId);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado');
    loadDocs();
  }

  async function handleDownload(doc: GeneratedDoc) {
    if (!doc.file_url) { toast.error('PDF não disponível'); return; }
    const { data, error } = await supabase.storage.from('generated-documents').download(doc.file_url);
    if (error || !data) { toast.error('Erro ao baixar'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = `${doc.title}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = docs.filter(d => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return d.title.toLowerCase().includes(s) || (d.client_name || '').toLowerCase().includes(s);
    }
    return true;
  });

  function openWizard(type: 'proposta' | 'contrato') {
    setWizardType(type);
    setWizardOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Documentos</h1>
        <div className="flex gap-2">
          <Button onClick={() => openWizard('proposta')} size="sm">
            <Plus className="mr-1 h-3 w-3" /> Nova Proposta
          </Button>
          <Button onClick={() => openWizard('contrato')} variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" /> Novo Contrato
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por título ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="relatorio">Relatório</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="assinado">Assinado</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum documento encontrado</TableCell></TableRow>
              ) : filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[doc.type] || doc.type}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{doc.client_name || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Select value={doc.status} onValueChange={(v: string) => handleStatusChange(doc.id, v as 'rascunho' | 'enviado' | 'assinado' | 'arquivado')}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <Badge className={`${STATUS_COLORS[doc.status]} text-xs`}>{STATUS_LABELS[doc.status]}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.variables_data && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDoc(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {doc.file_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {doc.status !== 'arquivado' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(doc.id, 'arquivado' as const)}>
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DocumentWizard
            type={wizardType}
            onComplete={() => { setWizardOpen(false); loadDocs(); }}
            onCancel={() => setWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewDoc && <PreviewContent doc={previewDoc} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
