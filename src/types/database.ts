export type PropertyStatus = 'draft' | 'published' | 'sold' | 'archived' | 'pending_review';
export type PropertyType = 'casa' | 'terreno' | 'apartamento' | 'comercial' | 'outro';
export type RiskLevel = 'baixo' | 'medio' | 'alto';

export type ClientType = 'investor' | 'incorporator' | 'individual';
export type ClientStatus = 'prospect' | 'active' | 'completed';
export type InteractionType = 'meeting' | 'whatsapp' | 'email' | 'call' | 'other';
export type DocumentCategory = 'rg' | 'cpf' | 'matricula' | 'contract' | 'proposal' | 'other';

export type PartnerType = 'imobiliaria' | 'corretor_autonomo' | 'assessor_investimento' | 'arquiteto' | 'engenheiro' | 'contador' | 'outro';
export type PartnerStatus = 'active' | 'inactive';

export type DocumentTemplateType = 'proposta' | 'contrato' | 'relatorio';
export type DocumentTemplateStatus = 'ativo' | 'rascunho';
export type GeneratedDocumentStatus = 'rascunho' | 'enviado' | 'assinado' | 'arquivado';

export type ServiceType = 'regularizacao' | 'venda_plataforma' | 'consultoria' | 'outro';
export type ExpenseCategory = 'salario' | 'comissao_paga' | 'fornecedor' | 'escritorio' | 'marketing' | 'outro';
export type CommissionStatus = 'pending' | 'paid';

// --- Core entities ---

export interface Property {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  acquisition_cost: number | null;
  regularization_cost: number | null;
  projected_value: number | null;
  regularization_time: string | null;
  risks: string | null;
  property_type: PropertyType;
  status: PropertyStatus;
  images: string[];
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  highlight_tag: string | null;
  investor_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  risk_level: RiskLevel | null;
  has_matricula: boolean;
  has_planta: boolean;
  has_iptu: boolean;
  has_certidoes: boolean;
  has_retrofit: boolean;
  retrofit_investment: number | null;
  retrofit_completion_time: string | null;
  retrofit_appreciation: string | null;
  retrofit_image: string | null;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  cpf_cnpj: string | null;
  phone: string;
  email: string | null;
  origin: string | null;
  partner_name: string | null;
  partner_id: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  phone: string;
  email: string | null;
  affiliated_agency: string | null;
  website: string | null;
  creci: string | null;
  commission_rate: number | null;
  notes: string | null;
  status: PartnerStatus;
  parent_partner_id: string | null;
  created_at: string;
}

// --- Tracking ---

export interface AccessLink {
  id: string;
  token: string;
  investor_name: string;
  investor_email: string | null;
  investor_phone: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  client_id: string | null;
}

export interface PageView {
  id: string;
  access_link_id: string | null;
  property_id: string | null;
  time_spent_seconds: number;
  viewed_at: string;
}

export interface CtaClick {
  id: string;
  access_link_id: string | null;
  property_id: string | null;
  clicked_at: string;
}

export interface Notification {
  id: string;
  type: 'hot_lead' | 'new_view' | 'system';
  title: string;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- Documents ---

export interface ClientDocument {
  id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  category: DocumentCategory;
  uploaded_at: string;
}

export interface ClientInteraction {
  id: string;
  client_id: string;
  type: InteractionType;
  note: string;
  interaction_date: string;
  created_at: string;
}

export interface PartnerInteraction {
  id: string;
  partner_id: string;
  type: InteractionType;
  note: string;
  interaction_date: string;
  created_at: string;
}

// --- Settings & Submissions ---

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionLink {
  id: string;
  token: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface PropertySubmission {
  id: string;
  property_id: string;
  submission_link_id: string | null;
  broker_name: string;
  broker_phone: string;
  broker_company: string | null;
  owner_name: string | null;
  irregularity_notes: string | null;
  matricula_status: string;
  created_at: string;
  partner_id: string | null;
}

// --- Finance ---

export interface Revenue {
  id: string;
  client_id: string | null;
  partner_id: string | null;
  service_type: ServiceType;
  amount: number;
  received_at: string;
  notes: string | null;
  created_at: string;
  payment_type?: string | null;
  category?: string | null;
  entrada?: number | null;
  installment_count?: number;
  installment_number?: number;
  parent_revenue_id?: string | null;
  due_date?: string | null;
}

export interface Commission {
  id: string;
  partner_id: string;
  client_id: string | null;
  revenue_id: string;
  rate: number;
  amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  related_commission_id: string | null;
  created_at: string;
  payment_type?: string | null;
  installment_count?: number;
  installment_number?: number;
  parent_expense_id?: string | null;
  recurrence_months?: number | null;
  due_date?: string | null;
}

// --- Document Templates & Generated Documents ---

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentTemplateType;
  content: string;
  variables: Array<{ name: string; required: boolean; type?: string }>;
  status: DocumentTemplateStatus;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  template_id: string | null;
  client_id: string | null;
  type: DocumentTemplateType;
  title: string;
  variables_data: Record<string, string>;
  file_url: string | null;
  status: GeneratedDocumentStatus;
  process_id: string | null;
  created_at: string;
}
