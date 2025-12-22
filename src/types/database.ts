// Database types matching the Supabase schema

export type UserRole = 'admin' | 'personnel' | 'customer';

export type DocumentType = 'invoice' | 'contract' | 'receipt' | 'other';

export type RequestType = 'maintenance' | 'repair' | 'accident' | 'complaint' | 'information' | 'other';

export type RequestStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

export type ServiceType = 'maintenance' | 'repair' | 'tire_change' | 'oil_change' | 'inspection' | 'cleaning' | 'other';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  surname: string | null;
  company_name: string | null;
  role: UserRole;
  isCompany: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  plate_number: string;
  model_name: string;
  image_url: string | null;
  class: string | null;
  type: string | null;
  fuel_type: string | null;
  gear: string | null;
  person_capacity: string | null;
  trunk_capacity: string | null;
  other_details: Record<string, unknown> | null;
  created_at: string;
}

export interface CustomerVehicle {
  id: number;
  customer_id: string;
  vehicle_id: number;
  rental_start_date: string;
  rental_end_date: string | null;
  created_at: string;
  // Joined data
  customer?: Profile;
  vehicle?: Vehicle;
}

export interface Campaign {
  id: number;
  title: string;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: number;
  customer_id: string;
  vehicle_id: number | null;
  document_type: DocumentType;
  file_path: string;
  file_name: string | null;
  isSeen_customer: boolean;
  created_at: string;
  // Joined data
  customer?: Profile;
  vehicle?: Vehicle;
}

export interface Request {
  id: number;
  customer_id: string;
  vehicle_id: number | null;
  request_type: RequestType;
  status: RequestStatus;
  title: string | null;
  description: string | null;
  uploaded_images: string[] | null;
  created_at: string;
  // Joined data
  customer?: Profile;
  vehicle?: Vehicle;
  responses?: RequestResponse[];
}

export interface RequestResponse {
  id: number;
  request_id: number;
  admin_id: string;
  response_message: string;
  isSeen_customer: boolean;
  created_at: string;
  // Joined data
  admin?: Profile;
}

export interface ServiceHistory {
  id: number;
  vehicle_id: number;
  service_type: ServiceType;
  service_date: string;
  description: string | null;
  service_provider: string | null;
  created_at: string;
  // Joined data
  vehicle?: Vehicle;
}

// Form input types
export interface CreateVehicleInput {
  plate_number: string;
  model_name: string;
  image_url?: string | null;
  class?: string | null;
  type?: string | null;
  fuel_type?: string | null;
  gear?: string | null;
  person_capacity?: string | null;
  trunk_capacity?: string | null;
  other_details?: Record<string, unknown> | null;
}

export interface CreateCampaignInput {
  title: string;
  image_url?: string | null;
  target_url?: string | null;
  is_active?: boolean;
}

export interface CreateDocumentInput {
  customer_id: string;
  vehicle_id?: number | null;
  document_type: DocumentType;
  file_path: string;
  file_name?: string | null;
}

export interface CreateRequestResponseInput {
  request_id: number;
  admin_id: string;
  response_message: string;
}

export interface CreateServiceHistoryInput {
  vehicle_id: number;
  service_type: ServiceType;
  service_date: string;
  description?: string | null;
  service_provider?: string | null;
}

export interface CreateCustomerVehicleInput {
  customer_id: string;
  vehicle_id: number;
  rental_start_date: string;
  rental_end_date?: string | null;
}
