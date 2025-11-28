import { fetchWithAuth } from './auth'
import { API_ENDPOINTS } from '@/config/api'
import type {
  Supplier,
  SupplierCategory,
  SupplierQueryParams,
  CreateSupplierData,
  UpdateSupplierData,
  CreateSupplierCategoryData,
  PurchaseCategory,
  CreatePurchaseCategoryData,
  PurchaseRequest,
  PurchaseRequestQueryParams,
  CreatePurchaseRequestData,
  UpdatePurchaseRequestData,
  Quotation,
  QuotationQueryParams,
  CreateQuotationData,
  QuotationComparisonResponse,
  PurchaseOrder,
  PurchaseOrderQueryParams,
  CreatePurchaseOrderData,
  CreateExpenseFromOrderData,
  PurchaseSettings,
  PaginatedResponse,
  ApiResponse,
  PurchaseOrderStatus,
} from '@/types/purchases'

class PurchasesService {
  // ============================================================================
  // SETTINGS
  // ============================================================================
  async getSettings(): Promise<PurchaseSettings> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SETTINGS)
    const data: ApiResponse<PurchaseSettings> = await response.json()
    return data.data
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.SETTING_BY_KEY(key), {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.SETTINGS, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  }

  // ============================================================================
  // SUPPLIER CATEGORIES
  // ============================================================================
  async getSupplierCategories(isActive?: boolean): Promise<SupplierCategory[]> {
    const queryParams = new URLSearchParams()
    if (isActive !== undefined) queryParams.append('is_active', String(isActive))

    const url = `${API_ENDPOINTS.PURCHASES.SUPPLIER_CATEGORIES}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<SupplierCategory[]> = await response.json()
    return data.data
  }

  async createSupplierCategory(categoryData: CreateSupplierCategoryData): Promise<SupplierCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<SupplierCategory> = await response.json()
    return data.data
  }

  async updateSupplierCategory(id: number, categoryData: Partial<CreateSupplierCategoryData>): Promise<SupplierCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_CATEGORY_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<SupplierCategory> = await response.json()
    return data.data
  }

  async deleteSupplierCategory(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_CATEGORY_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // SUPPLIERS
  // ============================================================================
  async getSuppliers(params?: SupplierQueryParams): Promise<PaginatedResponse<Supplier>> {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.category_id) queryParams.append('category_id', String(params.category_id))
    if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active))
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.PURCHASES.SUPPLIERS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getSupplier(id: number): Promise<Supplier> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_BY_ID(id))
    const data: ApiResponse<Supplier> = await response.json()
    return data.data
  }

  async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIERS, {
      method: 'POST',
      body: JSON.stringify(supplierData),
    })
    const data: ApiResponse<Supplier> = await response.json()
    return data.data
  }

  async updateSupplier(id: number, supplierData: UpdateSupplierData): Promise<Supplier> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    })
    const data: ApiResponse<Supplier> = await response.json()
    return data.data
  }

  async deleteSupplier(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.SUPPLIER_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // PURCHASE CATEGORIES
  // ============================================================================
  async getPurchaseCategories(isActive?: boolean): Promise<PurchaseCategory[]> {
    const queryParams = new URLSearchParams()
    if (isActive !== undefined) queryParams.append('is_active', String(isActive))

    const url = `${API_ENDPOINTS.PURCHASES.CATEGORIES}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<PurchaseCategory[]> = await response.json()
    return data.data
  }

  async createPurchaseCategory(categoryData: CreatePurchaseCategoryData): Promise<PurchaseCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<PurchaseCategory> = await response.json()
    return data.data
  }

  async updatePurchaseCategory(id: number, categoryData: Partial<CreatePurchaseCategoryData>): Promise<PurchaseCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.CATEGORY_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<PurchaseCategory> = await response.json()
    return data.data
  }

  async deletePurchaseCategory(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.CATEGORY_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // PURCHASE REQUESTS
  // ============================================================================
  async getRequests(params?: PurchaseRequestQueryParams): Promise<PaginatedResponse<PurchaseRequest>> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.purchase_type) queryParams.append('purchase_type', params.purchase_type)
    if (params?.category_id) queryParams.append('category_id', String(params.category_id))
    if (params?.requested_by) queryParams.append('requested_by', String(params.requested_by))
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.priority) queryParams.append('priority', params.priority)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order)

    const url = `${API_ENDPOINTS.PURCHASES.REQUESTS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getPendingApprovalRequests(): Promise<{ data: PurchaseRequest[]; count: number }> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUESTS_PENDING_APPROVAL)
    return await response.json()
  }

  async getRequest(id: number): Promise<PurchaseRequest> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_BY_ID(id))
    const data: ApiResponse<PurchaseRequest> = await response.json()
    return data.data
  }

  async createRequest(requestData: CreatePurchaseRequestData): Promise<PurchaseRequest> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUESTS, {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
    const data: ApiResponse<PurchaseRequest> = await response.json()
    return data.data
  }

  async updateRequest(id: number, requestData: UpdatePurchaseRequestData): Promise<PurchaseRequest> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(requestData),
    })
    const data: ApiResponse<PurchaseRequest> = await response.json()
    return data.data
  }

  async submitRequest(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_SUBMIT(id), {
      method: 'POST',
    })
  }

  async approveRequest(id: number, comments?: string): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_APPROVE(id), {
      method: 'POST',
      body: JSON.stringify({ comments }),
    })
  }

  async rejectRequest(id: number, reason: string): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_REJECT(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async cancelRequest(id: number, reason?: string): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_CANCEL(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async deleteRequest(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_BY_ID(id), {
      method: 'DELETE',
    })
  }

  async generateRFQPDF(id: number, deadline: string, supplierIds: number[]): Promise<Blob> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_GENERATE_RFQ_PDF(id), {
      method: 'POST',
      body: JSON.stringify({ deadline, supplier_ids: supplierIds }),
    })
    return await response.blob()
  }

  async sendRFQEmail(id: number, deadline: string, supplierIds: number[]): Promise<{ success: boolean; results: any[] }> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_SEND_RFQ_EMAIL(id), {
      method: 'POST',
      body: JSON.stringify({ deadline, supplier_ids: supplierIds }),
    })
    const data = await response.json()
    return data
  }

  async sendRFQWhatsApp(id: number, deadline: string, supplierIds: number[]): Promise<{ success: boolean; results: any[] }> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.REQUEST_SEND_RFQ_WHATSAPP(id), {
      method: 'POST',
      body: JSON.stringify({ deadline, supplier_ids: supplierIds }),
    })
    const data = await response.json()
    return data
  }

  // ============================================================================
  // QUOTATIONS
  // ============================================================================
  async getQuotations(params?: QuotationQueryParams): Promise<PaginatedResponse<Quotation>> {
    const queryParams = new URLSearchParams()
    if (params?.purchase_request_id) queryParams.append('purchase_request_id', String(params.purchase_request_id))
    if (params?.supplier_id) queryParams.append('supplier_id', String(params.supplier_id))
    if (params?.status) queryParams.append('status', params.status)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.PURCHASES.QUOTATIONS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getQuotation(id: number): Promise<Quotation> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATION_BY_ID(id))
    const data: ApiResponse<Quotation> = await response.json()
    return data.data
  }

  async compareQuotations(purchaseRequestId: number): Promise<QuotationComparisonResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATIONS_COMPARE(purchaseRequestId))
    return await response.json()
  }

  async createQuotation(quotationData: CreateQuotationData): Promise<Quotation> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATIONS, {
      method: 'POST',
      body: JSON.stringify(quotationData),
    })
    const data: ApiResponse<Quotation> = await response.json()
    return data.data
  }

  async updateQuotation(id: number, quotationData: Partial<CreateQuotationData>): Promise<Quotation> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATION_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(quotationData),
    })
    const data: ApiResponse<Quotation> = await response.json()
    return data.data
  }

  async selectQuotation(id: number, selectionReason?: string): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATION_SELECT(id), {
      method: 'POST',
      body: JSON.stringify({ selection_reason: selectionReason }),
    })
  }

  async deleteQuotation(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.QUOTATION_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================
  async getOrders(params?: PurchaseOrderQueryParams): Promise<PaginatedResponse<PurchaseOrder>> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.supplier_id) queryParams.append('supplier_id', String(params.supplier_id))
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.PURCHASES.ORDERS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getOrder(id: number): Promise<PurchaseOrder> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.ORDER_BY_ID(id))
    const data: ApiResponse<PurchaseOrder> = await response.json()
    return data.data
  }

  async createOrder(orderData: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.ORDERS, {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
    const data: ApiResponse<PurchaseOrder> = await response.json()
    return data.data
  }

  async updateOrderStatus(id: number, status: PurchaseOrderStatus): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.ORDER_STATUS(id), {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async createExpenseFromOrder(id: number, expenseData: CreateExpenseFromOrderData): Promise<{ expense_id: number }> {
    const response = await fetchWithAuth(API_ENDPOINTS.PURCHASES.ORDER_TO_EXPENSE(id), {
      method: 'POST',
      body: JSON.stringify(expenseData),
    })
    const data = await response.json()
    return data.data
  }

  async deleteOrder(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.PURCHASES.ORDER_BY_ID(id), {
      method: 'DELETE',
    })
  }
}

export const purchasesService = new PurchasesService()
export default purchasesService
