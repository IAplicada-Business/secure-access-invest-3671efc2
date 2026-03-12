import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Archive,
  MessageCircle,
  Eye,
  FileText,
  Map,
  Receipt,
  FileCheck,
  Inbox,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface SubmissionWithProperty {
  id: string;
  broker_name: string;
  broker_phone: string;
  broker_company: string | null;
  owner_name: string | null;
  irregularity_notes: string | null;
  matricula_status: string;
  created_at: string;
  property_id: string;
  properties: {
    id: string;
    title: string;
    property_type: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    acquisition_cost: number | null;
    description: string | null;
    has_matricula: boolean | null;
    has_planta: boolean | null;
    has_iptu: boolean | null;
    has_certidoes: boolean | null;
    images: string[] | null;
    cover_image: string | null;
    status: string | null;
  };
}

const propertyTypeLabels: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
  comercial: 'Comercial',
  outro: 'Outro',
};

const matriculaLabels: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
  parcial: 'Parcial',
};

export default function AdminSubmissions() {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithProperty | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_submissions')
        .select(`
          *,
          properties (
            id, title, property_type, address, neighborhood, city,
            acquisition_cost, description, has_matricula, has_planta,
            has_iptu, has_certidoes, images, cover_image, status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter only pending_review
      return ((data || []) as unknown as SubmissionWithProperty[]).filter(
        s => s.properties?.status === 'pending_review'
      );
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, type')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ propertyId, submissionId }: { propertyId: string; submissionId: string }) => {
      const { error: propError } = await supabase
        .from('properties')
        .update({ status: 'draft' })
        .eq('id', propertyId);
      if (propError) throw propError;

      if (selectedPartnerId) {
        const { error: subError } = await supabase
          .from('property_submissions')
          .update({ partner_id: selectedPartnerId })
          .eq('id', submissionId);
        if (subError) throw subError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      toast.success('Imóvel aprovado como rascunho!');
      setSelectedSubmission(null);
      setSelectedPartnerId(null);
    },
    onError: () => toast.error('Erro ao aprovar'),
  });

  const archiveMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'archived' })
        .eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      toast.success('Imóvel arquivado');
      setSelectedSubmission(null);
    },
    onError: () => toast.error('Erro ao arquivar'),
  });

  function contactBroker(sub: SubmissionWithProperty) {
    const phone = sub.broker_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${sub.broker_name}! Estamos analisando o imóvel "${sub.properties.title}" que você enviou. Podemos conversar?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Submissões de Corretores</h1>
        <Badge variant="secondary" className="text-sm">
          {submissions.length} pendente{submissions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">Nenhuma submissão pendente</p>
            <p className="text-sm">Novas submissões de corretores aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead className="hidden md:table-cell">Corretor</TableHead>
                  <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sub.properties.cover_image ? (
                          <img src={sub.properties.cover_image} alt="" className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{sub.properties.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {propertyTypeLabels[sub.properties.property_type || ''] || 'Outro'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="text-sm">{sub.broker_name}</p>
                        {sub.broker_company && (
                          <p className="text-xs text-muted-foreground">{sub.broker_company}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {sub.properties.city || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {formatDate(sub.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSubmission(sub)} title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => approveMutation.mutate({ propertyId: sub.property_id, submissionId: sub.id })} title="Aprovar" className="text-primary hover:text-primary">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => archiveMutation.mutate(sub.property_id)} title="Arquivar" className="text-muted-foreground">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => { setSelectedSubmission(null); setSelectedPartnerId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSubmission.properties.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Images */}
                {selectedSubmission.properties.images && selectedSubmission.properties.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedSubmission.properties.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="rounded-lg aspect-square object-cover w-full" />
                    ))}
                  </div>
                )}

                {/* Property Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{propertyTypeLabels[selectedSubmission.properties.property_type || ''] || 'Outro'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <p className="font-medium">{formatCurrency(selectedSubmission.properties.acquisition_cost)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="font-medium">
                      {[selectedSubmission.properties.address, selectedSubmission.properties.neighborhood, selectedSubmission.properties.city].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                  {selectedSubmission.properties.description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Descrição:</span>
                      <p className="font-medium">{selectedSubmission.properties.description}</p>
                    </div>
                  )}
                </div>

                {/* Documentation */}
                <div>
                  <h4 className="font-semibold mb-2">Documentação</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Matrícula', value: matriculaLabels[selectedSubmission.matricula_status] || 'Não', icon: FileText },
                      { label: 'Planta Aprovada', value: selectedSubmission.properties.has_planta ? 'Sim' : 'Não', icon: Map },
                      { label: 'IPTU em Dia', value: selectedSubmission.properties.has_iptu ? 'Sim' : 'Não', icon: Receipt },
                      { label: 'Certidões', value: selectedSubmission.properties.has_certidoes ? 'Sim' : 'Não', icon: FileCheck },
                    ].map((doc) => (
                      <div key={doc.label} className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                        <doc.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{doc.label}:</span>
                        <span className={`text-sm font-medium ${doc.value === 'Sim' ? 'text-primary' : doc.value === 'Parcial' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {doc.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {selectedSubmission.irregularity_notes && (
                    <div className="mt-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive">Irregularidades:</p>
                      <p className="text-sm mt-1">{selectedSubmission.irregularity_notes}</p>
                    </div>
                  )}
                </div>

                {/* Broker Info */}
                <div>
                  <h4 className="font-semibold mb-2">Corretor</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> <p className="font-medium">{selectedSubmission.broker_name}</p></div>
                    <div><span className="text-muted-foreground">Telefone:</span> <p className="font-medium">{selectedSubmission.broker_phone}</p></div>
                    {selectedSubmission.broker_company && (
                      <div><span className="text-muted-foreground">Imobiliária:</span> <p className="font-medium">{selectedSubmission.broker_company}</p></div>
                    )}
                    {selectedSubmission.owner_name && (
                      <div><span className="text-muted-foreground">Proprietário:</span> <p className="font-medium">{selectedSubmission.owner_name}</p></div>
                    )}
                  </div>
                </div>

                {/* Partner Link */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Vincular Parceiro
                  </h4>
                  <Select value={selectedPartnerId || ''} onValueChange={(v) => setSelectedPartnerId(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um parceiro (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Opcional — vincule o parceiro que originou esta submissão.</p>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => contactBroker(selectedSubmission)} className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contatar Corretor
                </Button>
                <Button variant="outline" onClick={() => archiveMutation.mutate(selectedSubmission.property_id)} disabled={archiveMutation.isPending}>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </Button>
                <Button onClick={() => approveMutation.mutate({ propertyId: selectedSubmission.property_id, submissionId: selectedSubmission.id })} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Aprovar (Rascunho)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
