import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, CheckCircle, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type PropertyType = 'casa' | 'terreno' | 'apartamento' | 'comercial' | 'outro';

const propertyTypeLabels: Record<PropertyType, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
  comercial: 'Comercial',
  outro: 'Outro',
};

export default function PropertySubmission() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(true);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    property_type: 'casa' as PropertyType,
    address: '',
    neighborhood: '',
    city: '',
    acquisition_cost: '',
    description: '',
    matricula_status: 'nao',
    has_planta: false,
    has_iptu: false,
    has_certidoes: false,
    irregularity_notes: '',
    broker_name: '',
    broker_phone: '',
    broker_company: '',
    owner_name: '',
  });

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        navigate('/link-invalido');
        return;
      }

      const { data, error } = await supabase
        .from('submission_links')
        .select('id')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        navigate('/link-invalido');
        return;
      }

      setLinkId(data.id);
      setValidating(false);
    }

    validateToken();
  }, [token, navigate]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const fileName = `submissions/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      newUrls.push(urlData.publicUrl);
    }

    setImageUrls(prev => [...prev, ...newUrls]);
    setUploadingImages(false);
    e.target.value = '';
  }

  function removeImage(index: number) {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.broker_name.trim() || !form.broker_phone.trim()) {
      toast.error('Nome e telefone do corretor são obrigatórios');
      return;
    }

    if (!form.city.trim()) {
      toast.error('Cidade é obrigatória');
      return;
    }

    setSubmitting(true);

    try {
      const title = `${propertyTypeLabels[form.property_type]} - ${form.neighborhood || form.city}`;
      const costValue = form.acquisition_cost ? parseFloat(form.acquisition_cost) : null;

      // 1. Insert property with pending_review status
      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          title,
          property_type: form.property_type,
          address: form.address || null,
          neighborhood: form.neighborhood || null,
          city: form.city,
          acquisition_cost: costValue,
          description: form.description || null,
          has_matricula: form.matricula_status === 'sim',
          has_planta: form.has_planta,
          has_iptu: form.has_iptu,
          has_certidoes: form.has_certidoes,
          images: imageUrls,
          cover_image: imageUrls[0] || null,
          status: 'pending_review' as const,
        })
        .select('id')
        .single();

      if (propError) throw propError;

      // 2. Insert property submission details
      const { error: subError } = await supabase
        .from('property_submissions')
        .insert({
          property_id: property.id,
          submission_link_id: linkId,
          broker_name: form.broker_name.trim(),
          broker_phone: form.broker_phone.trim(),
          broker_company: form.broker_company.trim() || null,
          owner_name: form.owner_name.trim() || null,
          irregularity_notes: form.irregularity_notes.trim() || null,
          matricula_status: form.matricula_status,
        });

      if (subError) throw subError;

      // 3. Create notification
      await supabase.from('notifications').insert({
        type: 'new_property_submission',
        title: `Nova submissão: ${title}`,
        message: `Corretor ${form.broker_name} enviou um imóvel em ${form.city}`,
        metadata: {
          property_id: property.id,
          broker_name: form.broker_name,
          broker_company: form.broker_company || null,
        },
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo className="h-12 opacity-50" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Imóvel Enviado!</h2>
            <p className="text-muted-foreground">
              Sua submissão foi recebida com sucesso. Nossa equipe irá analisar os dados e entrar em contato em breve.
            </p>
            <Button onClick={() => { setSuccess(false); setForm({ property_type: 'casa', address: '', neighborhood: '', city: '', acquisition_cost: '', description: '', matricula_status: 'nao', has_planta: false, has_iptu: false, has_certidoes: false, irregularity_notes: '', broker_name: '', broker_phone: '', broker_company: '', owner_name: '' }); setImageUrls([]); }}>
              Enviar Outro Imóvel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <Logo className="h-7 w-28" />
            <p className="text-xs text-muted-foreground mt-0.5">Submissão de Imóveis</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo do Imóvel *</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm(p => ({ ...p, property_type: v as PropertyType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(propertyTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número" maxLength={255} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={(e) => setForm(p => ({ ...p, neighborhood: e.target.value }))} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} required maxLength={100} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor Aproximado (R$)</Label>
                <Input type="number" value={form.acquisition_cost} onChange={(e) => setForm(p => ({ ...p, acquisition_cost: e.target.value }))} placeholder="Ex: 150000" min={0} />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o imóvel, condições, metragem..." rows={4} maxLength={2000} />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Fotos do Imóvel</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="image-upload" disabled={uploadingImages} />
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {uploadingImages ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingImages ? 'Enviando...' : 'Clique para adicionar fotos'}
                    </span>
                  </label>
                </div>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documentation Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Select value={form.matricula_status} onValueChange={(v) => setForm(p => ({ ...p, matricula_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_planta} onChange={(e) => setForm(p => ({ ...p, has_planta: e.target.checked }))} className="rounded border-border" />
                  <span className="text-sm">Planta Aprovada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_iptu} onChange={(e) => setForm(p => ({ ...p, has_iptu: e.target.checked }))} className="rounded border-border" />
                  <span className="text-sm">IPTU em Dia</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_certidoes} onChange={(e) => setForm(p => ({ ...p, has_certidoes: e.target.checked }))} className="rounded border-border" />
                  <span className="text-sm">Certidões</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Observações sobre irregularidades</Label>
                <Textarea value={form.irregularity_notes} onChange={(e) => setForm(p => ({ ...p, irregularity_notes: e.target.value }))} placeholder="Descreva o que está irregular ou faltando..." rows={3} maxLength={1000} />
              </div>
            </CardContent>
          </Card>

          {/* Broker Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Corretor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.broker_name} onChange={(e) => setForm(p => ({ ...p, broker_name: e.target.value }))} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Telefone / WhatsApp *</Label>
                <Input value={form.broker_phone} onChange={(e) => setForm(p => ({ ...p, broker_phone: e.target.value }))} placeholder="5511999999999" required maxLength={20} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imobiliária</Label>
                  <Input value={form.broker_company} onChange={(e) => setForm(p => ({ ...p, broker_company: e.target.value }))} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Proprietário</Label>
                  <Input value={form.owner_name} onChange={(e) => setForm(p => ({ ...p, owner_name: e.target.value }))} maxLength={100} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar Imóvel para Avaliação
          </Button>
        </form>
      </div>
    </div>
  );
}
