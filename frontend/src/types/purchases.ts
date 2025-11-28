// Purchases Module Types

// ============================================================================
// BASE TYPES
// ============================================================================

export type TaxCondition = 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final' | 'otro'
export type BankAccountType = 'caja_ahorro' | 'cuenta_corriente'
export type PurchaseType = 'direct' | 'price_competition' | 'tender'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type PurchaseRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_quotation'
  | 'quotation_received'
  | 'in_evaluation'
  | 'order_created'
  | 'completed'
  | 'cancelled'

export type QuotationStatus = 'received' | 'under_review' | 'selected' | 'rejected'
export type RfqStatus = 'open' | 'closed' | 'cancelled'

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'partially_received'
  | 'received'
  | 'invoiced'
  | 'paid'
  | 'cancelled'

// ============================================================================
// SUPPLIER TYPES
// ============================================================================

export interface SupplierCategory {
  id: number
  name: string
  description: string | null
  color: string
  order_index: number
  is_active: boolean
  supplier_count?: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  business_name: string
  trade_name: string | null
  cuit: string | null
  tax_condition: TaxCondition
  category_id: number | null
  contact_name: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  website: string | null
  bank_name: string | null
  bank_account_type: BankAccountType | null
  bank_account_number: string | null
  bank_cbu: string | null
  bank_alias: string | null
  payment_terms: string | null
  notes: string | null
  rating: number | null
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  category?: SupplierCategory
}

// ============================================================================
// PURCHASE CATEGORY TYPES
// ============================================================================

export interface PurchaseCategory {
  id: number
  name: string
  parent_id: number | null
  color: string
  expense_category_id: number | null
  order_index: number
  is_active: boolean
  subcategories?: PurchaseCategory[]
  created_at: string
  updated_at: string
}

// ============================================================================
// PURCHASE REQUEST TYPES
// ============================================================================

export interface PurchaseRequestItem {
  id: number
  request_id: number
  description: string
  quantity: number | string
  unit: string
  estimated_unit_price: number | string | null
  specifications: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface PurchaseRequestHistory {
  id: number
  purchase_request_id: number
  action: string
  from_status: string | null
  to_status: string
  comments: string | null
  user_id: number
  created_at: string
  user?: UserBasicInfo
}

export interface UserBasicInfo {
  id: number
  username: string
  email?: string
  full_name?: string
}

export interface PurchaseRequest {
  id: number
  request_number: string
  title: string
  description: string
  justification: string | null
  category_id: number | null
  estimated_amount: number | string
  currency: string
  purchase_type: PurchaseType
  priority: Priority
  status: PurchaseRequestStatus
  preferred_supplier_id: number | null
  required_date: string | null
  attachment_url: string | null
  requested_by: number
  approved_by: number | null
  approved_at: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  category?: PurchaseCategory
  preferredSupplier?: Supplier
  items?: PurchaseRequestItem[]
  history?: PurchaseRequestHistory[]
  requestedBy?: UserBasicInfo
  approvedBy?: UserBasicInfo
  quotations_count?: number
}

// ============================================================================
// QUOTATION TYPES
// ============================================================================

export interface QuotationRequest {
  id: number
  rfq_number: string
  purchase_request_id: number
  title: string
  specifications: string | null
  deadline: string
  status: RfqStatus
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  purchaseRequest?: PurchaseRequest
  invitedSuppliers?: RfqSupplier[]
  quotations?: Quotation[]
}

export interface RfqSupplier {
  id: number
  quotation_request_id: number
  supplier_id: number
  invited_at: string
  notified: boolean
  notified_at: string | null
  responded: boolean
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface QuotationItem {
  id: number
  quotation_id: number
  request_item_id: number | null
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
  total_price?: number | string
  notes: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface Quotation {
  id: number
  quotation_number: string | null
  quotation_request_id: number | null
  purchase_request_id: number
  supplier_id: number
  subtotal: number | string
  tax_amount: number | string
  total_amount: number | string
  currency: string
  payment_terms: string | null
  delivery_time: string | null
  valid_until: string | null
  status: QuotationStatus
  is_selected: boolean
  selection_reason: string | null
  attachment_url: string | null
  notes: string | null
  received_by: number
  received_at: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  purchaseRequest?: PurchaseRequest
  quotationRequest?: QuotationRequest
  items?: QuotationItem[]
  // Comparison fields (added by API)
  difference_from_min?: string
  percentage_above_min?: string
  is_lowest?: boolean
}

// ============================================================================
// PURCHASE ORDER TYPES
// ============================================================================

export interface PurchaseOrderItem {
  id: number
  order_id: number
  quotation_item_id: number | null
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
  total_price?: number | string
  received_quantity: number | string
  notes: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: number
  order_number: string
  purchase_request_id: number
  quotation_id: number | null
  supplier_id: number
  subtotal: number | string
  tax_amount: number | string
  total_amount: number | string
  currency: string
  payment_terms: string | null
  status: PurchaseOrderStatus
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  delivery_address: string | null
  delivery_notes: string | null
  account_id: number | null
  expense_id: number | null
  invoice_number: string | null
  invoice_date: string | null
  invoice_attachment_url: string | null
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  supplier?: Supplier
  purchaseRequest?: PurchaseRequest
  quotation?: Quotation
  items?: PurchaseOrderItem[]
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface PurchaseSettings {
  direct_purchase_limit: { value: string; description: string }
  min_quotations_required: { value: string; description: string }
  quotation_validity_days: { value: string; description: string }
  require_board_approval_above: { value: string; description: string }
  [key: string]: { value: string; description?: string }
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  summary?: {
    totalEstimated?: string
    totalAmount?: string
    count?: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface QuotationComparisonResponse {
  success: boolean
  data: Quotation[]
  summary: {
    count: number
    minAmount: string
    maxAmount: string
    avgAmount: string
    spread: string
  }
}

// ============================================================================
// QUERY PARAMS TYPES
// ============================================================================

export interface SupplierQueryParams {
  search?: string
  category_id?: number
  is_active?: boolean
  page?: number
  limit?: number
}

export interface PurchaseRequestQueryParams {
  status?: PurchaseRequestStatus
  purchase_type?: PurchaseType
  category_id?: number
  requested_by?: number
  start_date?: string
  end_date?: string
  priority?: Priority
  search?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'ASC' | 'DESC'
}

export interface QuotationQueryParams {
  purchase_request_id?: number
  supplier_id?: number
  status?: QuotationStatus
  page?: number
  limit?: number
}

export interface PurchaseOrderQueryParams {
  status?: PurchaseOrderStatus
  supplier_id?: number
  start_date?: string
  end_date?: string
  search?: string
  page?: number
  limit?: number
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface CreateSupplierData {
  business_name: string
  trade_name?: string
  cuit?: string
  tax_condition?: TaxCondition
  category_id?: number
  contact_name?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  website?: string
  bank_name?: string
  bank_account_type?: BankAccountType
  bank_account_number?: string
  bank_cbu?: string
  bank_alias?: string
  payment_terms?: string
  notes?: string
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  rating?: number
  is_active?: boolean
}

export interface CreateSupplierCategoryData {
  name: string
  description?: string
  color?: string
  order_index?: number
}

export interface CreatePurchaseCategoryData {
  name: string
  parent_id?: number
  color?: string
  expense_category_id?: number
  order_index?: number
}

export interface PurchaseRequestItemData {
  description: string
  quantity?: number
  unit?: string
  estimated_unit_price?: number
  specifications?: string
}

export interface CreatePurchaseRequestData {
  title: string
  description: string
  justification?: string
  category_id?: number
  estimated_amount: number
  currency?: string
  purchase_type?: PurchaseType
  priority?: Priority
  preferred_supplier_id?: number
  required_date?: string
  attachment_url?: string
  notes?: string
  items?: PurchaseRequestItemData[]
}

export interface UpdatePurchaseRequestData extends Partial<CreatePurchaseRequestData> {}

export interface QuotationItemData {
  request_item_id?: number
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  notes?: string
}

export interface CreateQuotationData {
  quotation_number?: string
  quotation_request_id?: number
  purchase_request_id: number
  supplier_id: number
  subtotal?: number
  tax_amount?: number
  total_amount: number
  payment_terms?: string
  delivery_time?: string
  valid_until?: string
  attachment_url?: string
  notes?: string
  received_at?: string
  items?: QuotationItemData[]
}

export interface PurchaseOrderItemData {
  quotation_item_id?: number
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  notes?: string
}

export interface CreatePurchaseOrderData {
  purchase_request_id: number
  quotation_id?: number
  supplier_id: number
  subtotal?: number
  tax_amount?: number
  total_amount: number
  payment_terms?: string
  expected_delivery_date?: string
  delivery_address?: string
  delivery_notes?: string
  notes?: string
  items?: PurchaseOrderItemData[]
}

export interface CreateExpenseFromOrderData {
  account_id: number
  category_id?: number
  invoice_number?: string
  invoice_date?: string
  invoice_attachment_url?: string
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

export const REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente de aprobacion',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  in_quotation: 'En cotizacion',
  quotation_received: 'Cotizaciones recibidas',
  in_evaluation: 'En evaluacion',
  order_created: 'Orden creada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const REQUEST_STATUS_COLORS: Record<PurchaseRequestStatus, string> = {
  draft: 'gray',
  pending_approval: 'yellow',
  approved: 'green',
  rejected: 'red',
  in_quotation: 'blue',
  quotation_received: 'indigo',
  in_evaluation: 'purple',
  order_created: 'cyan',
  completed: 'emerald',
  cancelled: 'slate',
}

export const ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  confirmed: 'Confirmada',
  partially_received: 'Recibida parcialmente',
  received: 'Recibida',
  invoiced: 'Facturada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
}

export const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  direct: 'Compra Directa',
  price_competition: 'Concurso de Precios',
  tender: 'Licitacion',
}

export const TAX_CONDITION_LABELS: Record<TaxCondition, string> = {
  responsable_inscripto: 'Responsable Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
  otro: 'Otro',
}
