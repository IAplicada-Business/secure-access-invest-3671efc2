import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, PropertyStatus, PropertyType, RiskLevel, PropertySubmission } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Upload, X, Save, Eye, ClipboardList, MessageCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'outro', label: 'Outro' },
];

const riskLevels: { value: RiskLevel; label: string }[] = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
];

export default function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'novo';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    neighborhood: '',
    acquisition_cost: '',
    regularization_cost: '',
    projected_value: '',
    regularization_time: '',
    risks: '',
    property_type: 'outro' as PropertyType,
    status: 'draft' as PropertyStatus,
    images: [] as string[],
    cover_image: '',
    // New fields
    highlight_tag: '',
    investor_notes: '',
    latitude: '',
    longitude: '',
    risk_level: 'medio' as RiskLevel,
    has_matricula: false,
    has_planta: false,
    has_iptu: false,
    has_certidoes: false,
  });

  useEffect(() => {
    if (isEditing) {
      loadProperty();
    }
  }, [id]);

  async function loadProperty() {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast.error('Imóvel não encontrado');
      navigate('/admin/imoveis');
      return;
    }

    const property = data as Property;
    setForm({
      title: property.title,
      description: property.description || '',
      address: property.address || '',
      city: property.city || '',
      neighborhood: property.neighborhood || '',
      acquisition_cost: property.acquisition_cost?.toString() || '',
      regularization_cost: property.regularization_cost?.toString() || '',
      projected_value: property.projected_value?.toString() || '',
      regularization_time: property.regularization_time || '',
      risks: property.risks || '',
      property_type: property.property_type,
      status: property.status,
      images: property.images || [],
      cover_image: property.cover_image || '',
      // New fields
      highlight_tag: property.highlight_tag || '',
      investor_notes: property.investor_notes || '',
      latitude: property.latitude?.toString() || '',
      longitude: property.longitude?.toString() || '',
      risk_level: property.risk_level || 'medio',
      has_matricula: property.has_matricula || false,
      has_planta: property.has_planta || false,
      has_iptu: property.has_iptu || false,
      has_certidoes: property.has_certidoes || false,
    });
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Erro ao fazer upload: ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      newImages.push(publicUrl);
    }

    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...newImages],
      cover_image: prev.cover_image || newImages[0] || '',
    }));
    setUploading(false);
    toast.success('Imagens enviadas com sucesso!');
  }

  function removeImage(url: string) {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== url),
      cover_image: prev.cover_image === url ? (prev.images[0] || '') : prev.cover_image,
    }));
  }

  function setCoverImage(url: string) {
    setForm(prev => ({ ...prev, cover_image: url }));
  }

  async function handleSubmit(e: React.FormEvent, publish = false) {
    e.preventDefault();
    setSaving(true);

    const data = {
      title: form.title,
      description: form.description || null,
      address: form.address || null,
      city: form.city || null,
      neighborhood: form.neighborhood || null,
      acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
      regularization_cost: form.regularization_cost ? parseFloat(form.regularization_cost) : null,
      projected_value: form.projected_value ? parseFloat(form.projected_value) : null,
      regularization_time: form.regularization_time || null,
      risks: form.risks || null,
      property_type: form.property_type,
      status: publish ? 'published' : form.status,
      images: form.images,
      cover_image: form.cover_image || null,
      // New fields
      highlight_tag: form.highlight_tag || null,
      investor_notes: form.investor_notes || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      risk_level: form.risk_level,
      has_matricula: form.has_matricula,
      has_planta: form.has_planta,
      has_iptu: form.has_iptu,
      has_certidoes: form.has_certidoes,
    };

    let error;

    if (isEditing) {
      const result = await supabase
        .from('properties')
        .update(data)
        .eq('id', id);
      error = result.error;
    } else {
      const result = await supabase
        .from('properties')
        .insert(data);
      error = result.error;
    }

    if (error) {
      toast.error('Erro ao salvar imóvel: ' + error.message);
      setSaving(false);
      return;
    }

    toast.success(publish ? 'Imóvel publicado!' : 'Imóvel salvo!');
    navigate('/admin/imoveis');
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/imoveis">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">
          {isEditing ? 'Editar Imóvel' : 'Novo Imóvel'}
        </h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Casa no Centro com potencial de regularização"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o imóvel e seu potencial para investidores..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_type">Tipo de Imóvel</Label>
                <Select 
                  value={form.property_type} 
                  onValueChange={(v) => setForm(prev => ({ ...prev, property_type: v as PropertyType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.neighborhood}
                    onChange={(e) => setForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Investimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="acquisition_cost">Valor de Aquisição (R$)</Label>
                  <Input
                    id="acquisition_cost"
                    type="number"
                    step="0.01"
                    value={form.acquisition_cost}
                    onChange={(e) => setForm(prev => ({ ...prev, acquisition_cost: e.target.value }))}
                    placeholder="150000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regularization_cost">Custo de Regularização (R$)</Label>
                  <Input
                    id="regularization_cost"
                    type="number"
                    step="0.01"
                    value={form.regularization_cost}
                    onChange={(e) => setForm(prev => ({ ...prev, regularization_cost: e.target.value }))}
                    placeholder="25000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projected_value">Valor Projetado (R$)</Label>
                  <Input
                    id="projected_value"
                    type="number"
                    step="0.01"
                    value={form.projected_value}
                    onChange={(e) => setForm(prev => ({ ...prev, projected_value: e.target.value }))}
                    placeholder="250000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regularization_time">Prazo Estimado de Regularização</Label>
                <Input
                  id="regularization_time"
                  value={form.regularization_time}
                  onChange={(e) => setForm(prev => ({ ...prev, regularization_time: e.target.value }))}
                  placeholder="Ex: 6 a 12 meses"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risks">Riscos Mapeados</Label>
                <Textarea
                  id="risks"
                  value={form.risks}
                  onChange={(e) => setForm(prev => ({ ...prev, risks: e.target.value }))}
                  placeholder="Descreva os principais riscos identificados..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Clique para enviar imagens
                        </span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt=""
                        className={`h-24 w-full object-cover rounded-lg ${
                          form.cover_image === img ? 'ring-2 ring-primary' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setCoverImage(img)}
                          title="Definir como capa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => removeImage(img)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.cover_image === img && (
                        <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          Capa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complementary Info - NEW SECTION */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações Complementares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="highlight_tag">Tag de Destaque</Label>
                  <Input
                    id="highlight_tag"
                    value={form.highlight_tag}
                    onChange={(e) => setForm(prev => ({ ...prev, highlight_tag: e.target.value }))}
                    placeholder="Ex: OPORTUNIDADE, NOVO"
                  />
                  <p className="text-xs text-muted-foreground">
                    Será exibido como badge no card do imóvel
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk_level">Nível de Risco</Label>
                  <Select 
                    value={form.risk_level} 
                    onValueChange={(v) => setForm(prev => ({ ...prev, risk_level: v as RiskLevel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {riskLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="investor_notes">Notas para o Investidor</Label>
                <Textarea
                  id="investor_notes"
                  value={form.investor_notes}
                  onChange={(e) => setForm(prev => ({ ...prev, investor_notes: e.target.value }))}
                  placeholder="Notas visíveis apenas na ficha completa do investidor..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="-23.5505"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="-46.6333"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Documentação Disponível</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_matricula"
                      checked={form.has_matricula}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_matricula: !!checked }))}
                    />
                    <label
                      htmlFor="has_matricula"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Matrícula
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_planta"
                      checked={form.has_planta}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_planta: !!checked }))}
                    />
                    <label
                      htmlFor="has_planta"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Planta Aprovada
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_iptu"
                      checked={form.has_iptu}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_iptu: !!checked }))}
                    />
                    <label
                      htmlFor="has_iptu"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      IPTU em Dia
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_certidoes"
                      checked={form.has_certidoes}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_certidoes: !!checked }))}
                    />
                    <label
                      htmlFor="has_certidoes"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Certidões
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/imoveis')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar como Rascunho
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Publicar
          </Button>
        </div>
      </form>
    </div>
  );
}