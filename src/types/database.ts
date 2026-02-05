export type PropertyStatus = 'draft' | 'published' | 'sold' | 'archived';
export type PropertyType = 'casa' | 'terreno' | 'apartamento' | 'comercial' | 'outro';
export type RiskLevel = 'baixo' | 'medio' | 'alto';

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
  // New fields - Sprint 1
  highlight_tag: string | null;
  investor_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  risk_level: RiskLevel | null;
  has_matricula: boolean;
  has_planta: boolean;
  has_iptu: boolean;
  has_certidoes: boolean;
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

export interface AccessLink {
  id: string;
  token: string;
  investor_name: string;
  investor_email: string | null;
  investor_phone: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface PageView {
  id: string;
  access_link_id: string | null;
  property_id: string | null;
  time_spent_seconds: number;
  viewed_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
