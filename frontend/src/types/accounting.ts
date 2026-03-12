// Accounting Types

export interface TransferType {
  id: number
  name: string
  color: string
  description: string | null
  order_index: number
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface PlanDeCuentas {
  id: number
  codigo: number
  nombre: string
  tipo: 'activo' | 'pasivo' | 'ingreso' | 'egreso'
  grupo: string
  is_active: boolean
  created_at: string
  updated_at: string
  accounts?: Account[]  // Associated cash/bank account (0 or 1 via unique FK)
}

export interface Account {
  id: number
  name: string
  type: 'cash' | 'bank' | 'other'
  account_number: string | null
  bank_name: string | null
  currency: string
  initial_balance: string | number  // Backend may return as string
  current_balance: string | number  // Backend may return as string
  is_active: boolean
  notes: string | null
  plan_cta_id: number
  planCta?: PlanDeCuentas
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  amount: string | number
  origin_plan_cta_id: number | null
  destination_plan_cta_id: number | null
  plan_cta_id: number | null       // legacy
  account_id: number | null        // legacy
  date: string
  description: string | null
  attachment_url: string | null
  user_id: number
  created_at: string
  updated_at: string
  originPlanCta?: PlanDeCuentas
  destinationPlanCta?: PlanDeCuentas
  planCta?: PlanDeCuentas           // legacy
  account?: Account                 // legacy
}

export interface Income {
  id: number
  amount: string | number
  origin_plan_cta_id: number | null
  destination_plan_cta_id: number | null
  plan_cta_id: number | null       // legacy
  account_id: number | null        // legacy
  date: string
  description: string | null
  attachment_url: string | null
  user_id: number
  created_at: string
  updated_at: string
  originPlanCta?: PlanDeCuentas
  destinationPlanCta?: PlanDeCuentas
  planCta?: PlanDeCuentas           // legacy
  account?: Account                 // legacy
}

export interface Transfer {
  id: number
  amount: string | number
  origin_plan_cta_id: number | null
  destination_plan_cta_id: number | null
  from_account_id: number | null   // legacy
  to_account_id: number | null     // legacy
  transfer_type_id: number | null
  date: string
  description: string | null
  user_id: number
  created_at: string
  updated_at: string
  originPlanCta?: PlanDeCuentas
  destinationPlanCta?: PlanDeCuentas
  fromAccount?: Account             // legacy
  toAccount?: Account               // legacy
  transferType?: TransferType
}

export interface CashReconciliation {
  id: number
  account_id: number
  date: string
  opening_balance: string | number  // Balance al inicio del día
  closing_balance: string | number  // Balance real contado (arqueo físico)
  expected_balance: string | number // Balance esperado según sistema
  difference?: number               // Campo virtual: closing_balance - expected_balance
  notes: string | null
  user_id: number
  created_at: string
  updated_at: string
  account?: Account
  user?: {
    id: number
    name: string
  }
}

// API Response types
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
    totalAmount?: string
    count?: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface AccountsSummary {
  total: number
  totalBalance: string
  byType: {
    cash: number
    bank: number
    other: number
  }
}

export interface DashboardData {
  accounts: {
    list: Account[]
    summary: {
      total: number
      cash: number
      bank: number
      other: number
    }
  }
  balances: {
    total: string
    by_type: {
      cash: string
      bank: string
      other: string
    }
  }
  period: {
    start_date: string
    end_date: string
    total_expenses: string
    total_incomes: string
    net_result: string
    expenses_by_category: CategoryStat[]
    incomes_by_category: CategoryStat[]
  }
  recent_transactions: {
    expenses: Expense[]
    incomes: Income[]
    transfers: Transfer[]
  }
}

export interface CategoryStat {
  id: number
  name: string
  color: string
  total: string
  count: number
}

export interface MonthlyData {
  month: string
  expenses: string
  incomes: string
  net: string
}

export interface BalanceHistoryEntry {
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out'
  amount: number
  balance: number
}

export interface CalculatedBalance {
  opening_balance: string
  incomes: string
  expenses: string
  incoming_transfers: string
  outgoing_transfers: string
  expected_balance: string
}

// Query params types
export interface ExpenseQueryParams {
  start_date?: string
  end_date?: string
  plan_cta_id?: number
  account_id?: number
  min_amount?: number
  max_amount?: number
  page?: number
  limit?: number
}

export interface IncomeQueryParams {
  start_date?: string
  end_date?: string
  plan_cta_id?: number
  account_id?: number
  page?: number
  limit?: number
}

export interface TransferQueryParams {
  start_date?: string
  end_date?: string
  account_id?: number
  page?: number
  limit?: number
}

export interface AccountQueryParams {
  type?: 'cash' | 'bank' | 'other'
  is_active?: boolean
}

export interface CashReconciliationQueryParams {
  account_id?: number
  start_date?: string
  end_date?: string
}

export interface BalanceHistoryQueryParams {
  start_date?: string
  end_date?: string
}

export interface DashboardQueryParams {
  start_date?: string
  end_date?: string
}

export interface StatsQueryParams {
  start_date?: string
  end_date?: string
}

// Form data types
export interface CreateExpenseData {
  amount: number
  origin_plan_cta_id?: number | null
  destination_plan_cta_id?: number | null
  account_id?: number              // legacy compat
  date?: string
  description?: string
  attachment_url?: string
}

export interface UpdateExpenseData {
  amount?: number
  origin_plan_cta_id?: number | null
  destination_plan_cta_id?: number | null
  date?: string
  description?: string
  attachment_url?: string
}

export interface CreateIncomeData {
  amount: number
  origin_plan_cta_id?: number | null
  destination_plan_cta_id?: number | null
  account_id?: number              // legacy compat
  date?: string
  description?: string
  attachment_url?: string
}

export interface UpdateIncomeData {
  amount?: number
  origin_plan_cta_id?: number | null
  destination_plan_cta_id?: number | null
  date?: string
  description?: string
  attachment_url?: string
}

export interface CreateTransferData {
  amount: number
  origin_plan_cta_id?: number | null
  destination_plan_cta_id?: number | null
  from_account_id?: number         // legacy compat
  to_account_id?: number           // legacy compat
  transfer_type_id?: number | null
  date?: string
  description?: string
}

export interface CreateAccountData {
  name: string
  type?: 'cash' | 'bank' | 'other'
  account_number?: string
  bank_name?: string
  currency?: string
  initial_balance?: number
  is_active?: boolean
  notes?: string
  plan_cta_id: number
}

export interface UpdateAccountData {
  name?: string
  type?: 'cash' | 'bank' | 'other'
  account_number?: string
  bank_name?: string
  currency?: string
  is_active?: boolean
  notes?: string
  plan_cta_id?: number
}

export interface UpdateAccountBalanceData {
  new_balance: number
  notes?: string
}

export interface CreateTransferTypeData {
  name: string
  color?: string
  description?: string | null
  order_index?: number
  is_active?: boolean
}

export interface UpdateTransferTypeData {
  name?: string
  color?: string
  description?: string | null
  order_index?: number
  is_active?: boolean
}

export interface CreateCashReconciliationData {
  account_id: number
  date: string
  opening_balance: number
  closing_balance: number   // Balance real contado físicamente
  expected_balance: number  // Balance esperado según cálculo del sistema
  notes?: string | null
}

export interface UpdateCashReconciliationData {
  closing_balance?: number  // Solo se puede actualizar el balance real
  notes?: string | null
}
