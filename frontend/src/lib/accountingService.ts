import { fetchWithAuth } from './auth'
import { API_ENDPOINTS } from '@/config/api'
import type {
  Account,
  AccountQueryParams,
  AccountsSummary,
  ApiResponse,
  BalanceHistoryEntry,
  BalanceHistoryQueryParams,
  CalculatedBalance,
  CashReconciliation,
  CashReconciliationQueryParams,
  CategoryStat,
  CreateAccountData,
  CreateCashReconciliationData,
  CreateCategoryData,
  CreateExpenseData,
  CreateIncomeData,
  CreateTransferData,
  CreateTransferTypeData,
  DashboardData,
  DashboardQueryParams,
  Expense,
  ExpenseCategory,
  ExpenseQueryParams,
  Income,
  IncomeCategory,
  IncomeQueryParams,
  MonthlyData,
  PaginatedResponse,
  ReorderCategoriesData,
  StatsQueryParams,
  Transfer,
  TransferQueryParams,
  TransferType,
  UpdateAccountBalanceData,
  UpdateAccountData,
  UpdateCashReconciliationData,
  UpdateCategoryData,
  UpdateExpenseData,
  UpdateIncomeData,
  UpdateTransferTypeData,
} from '@/types/accounting'

class AccountingService {
  // Dashboard
  async getDashboard(params?: DashboardQueryParams): Promise<DashboardData> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)

    const url = `${API_ENDPOINTS.ACCOUNTING.DASHBOARD}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<DashboardData> = await response.json()
    return data.data
  }

  async getMonthlyData(params?: DashboardQueryParams): Promise<MonthlyData[]> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)

    const url = `${API_ENDPOINTS.ACCOUNTING.DASHBOARD_MONTHLY}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<MonthlyData[]> = await response.json()
    return data.data
  }

  // Accounts
  async getAccounts(
    params?: AccountQueryParams
  ): Promise<ApiResponse<Account[]> & { summary: AccountsSummary }> {
    const queryParams = new URLSearchParams()
    if (params?.type) queryParams.append('type', params.type)
    if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active))

    const url = `${API_ENDPOINTS.ACCOUNTING.ACCOUNTS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getAccount(id: number): Promise<Account> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.ACCOUNT_BY_ID(id))
    const data: ApiResponse<Account> = await response.json()
    return data.data
  }

  async createAccount(accountData: CreateAccountData): Promise<Account> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.ACCOUNTS, {
      method: 'POST',
      body: JSON.stringify(accountData),
    })
    const data: ApiResponse<Account> = await response.json()
    return data.data
  }

  async updateAccount(id: number, accountData: UpdateAccountData): Promise<Account> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.ACCOUNT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(accountData),
    })
    const data: ApiResponse<Account> = await response.json()
    return data.data
  }

  async updateAccountBalance(id: number, balanceData: UpdateAccountBalanceData): Promise<Account> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.ACCOUNT_BALANCE(id), {
      method: 'PUT',
      body: JSON.stringify(balanceData),
    })
    const data: ApiResponse<Account> = await response.json()
    return data.data
  }

  async deleteAccount(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.ACCOUNT_BY_ID(id), {
      method: 'DELETE',
    })
  }

  async getAccountBalanceHistory(
    id: number,
    params?: BalanceHistoryQueryParams
  ): Promise<BalanceHistoryEntry[]> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)

    const url = `${API_ENDPOINTS.ACCOUNTING.ACCOUNT_BALANCE_HISTORY(id)}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<BalanceHistoryEntry[]> = await response.json()
    return data.data
  }

  // Expenses
  async getExpenses(params?: ExpenseQueryParams): Promise<PaginatedResponse<Expense>> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.category_id) queryParams.append('category_id', String(params.category_id))
    if (params?.account_id) queryParams.append('account_id', String(params.account_id))
    if (params?.min_amount) queryParams.append('min_amount', String(params.min_amount))
    if (params?.max_amount) queryParams.append('max_amount', String(params.max_amount))
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.ACCOUNTING.EXPENSES}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getExpense(id: number): Promise<Expense> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_BY_ID(id))
    const data: ApiResponse<Expense> = await response.json()
    return data.data
  }

  async createExpense(expenseData: CreateExpenseData): Promise<Expense> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSES, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    })
    const data: ApiResponse<Expense> = await response.json()
    return data.data
  }

  async updateExpense(id: number, expenseData: UpdateExpenseData): Promise<Expense> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    })
    const data: ApiResponse<Expense> = await response.json()
    return data.data
  }

  async deleteExpense(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_BY_ID(id), {
      method: 'DELETE',
    })
  }

  async getExpenseStatsByCategory(params?: StatsQueryParams): Promise<{
    data: CategoryStat[]
    uncategorized: { total: string; count: number }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)

    const url = `${API_ENDPOINTS.ACCOUNTING.EXPENSES_STATS_BY_CATEGORY}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const result: ApiResponse<CategoryStat[]> & { uncategorized: { total: string; count: number } } =
      await response.json()
    return {
      data: result.data,
      uncategorized: result.uncategorized,
    }
  }

  // Incomes
  async getIncomes(params?: IncomeQueryParams): Promise<PaginatedResponse<Income>> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.category_id) queryParams.append('category_id', String(params.category_id))
    if (params?.account_id) queryParams.append('account_id', String(params.account_id))
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.ACCOUNTING.INCOMES}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getIncome(id: number): Promise<Income> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_BY_ID(id))
    const data: ApiResponse<Income> = await response.json()
    return data.data
  }

  async createIncome(incomeData: CreateIncomeData): Promise<Income> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOMES, {
      method: 'POST',
      body: JSON.stringify(incomeData),
    })
    const data: ApiResponse<Income> = await response.json()
    return data.data
  }

  async updateIncome(id: number, incomeData: UpdateIncomeData): Promise<Income> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(incomeData),
    })
    const data: ApiResponse<Income> = await response.json()
    return data.data
  }

  async deleteIncome(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // Transfers
  async getTransfers(params?: TransferQueryParams): Promise<PaginatedResponse<Transfer>> {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.account_id) queryParams.append('account_id', String(params.account_id))
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const url = `${API_ENDPOINTS.ACCOUNTING.TRANSFERS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    return await response.json()
  }

  async getTransfer(id: number): Promise<Transfer> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_BY_ID(id))
    const data: ApiResponse<Transfer> = await response.json()
    return data.data
  }

  async createTransfer(transferData: CreateTransferData): Promise<Transfer> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFERS, {
      method: 'POST',
      body: JSON.stringify(transferData),
    })
    const data: ApiResponse<Transfer> = await response.json()
    return data.data
  }

  async deleteTransfer(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORIES)
    const data: ApiResponse<ExpenseCategory[]> = await response.json()
    return data.data
  }

  async getExpenseCategory(id: number): Promise<ExpenseCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORY_BY_ID(id))
    const data: ApiResponse<ExpenseCategory> = await response.json()
    return data.data
  }

  async createExpenseCategory(categoryData: CreateCategoryData): Promise<ExpenseCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<ExpenseCategory> = await response.json()
    return data.data
  }

  async updateExpenseCategory(
    id: number,
    categoryData: UpdateCategoryData
  ): Promise<ExpenseCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORY_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<ExpenseCategory> = await response.json()
    return data.data
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORY_BY_ID(id), {
      method: 'DELETE',
    })
  }

  async reorderExpenseCategories(data: ReorderCategoriesData): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.EXPENSE_CATEGORIES_REORDER, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Income Categories
  async getIncomeCategories(): Promise<IncomeCategory[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_CATEGORIES)
    const data: ApiResponse<IncomeCategory[]> = await response.json()
    return data.data
  }

  async getIncomeCategory(id: number): Promise<IncomeCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_CATEGORY_BY_ID(id))
    const data: ApiResponse<IncomeCategory> = await response.json()
    return data.data
  }

  async createIncomeCategory(categoryData: CreateCategoryData): Promise<IncomeCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<IncomeCategory> = await response.json()
    return data.data
  }

  async updateIncomeCategory(id: number, categoryData: UpdateCategoryData): Promise<IncomeCategory> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_CATEGORY_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
    const data: ApiResponse<IncomeCategory> = await response.json()
    return data.data
  }

  async deleteIncomeCategory(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.INCOME_CATEGORY_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // Transfer Types
  async getTransferTypes(): Promise<TransferType[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_TYPES)
    const data: ApiResponse<TransferType[]> = await response.json()
    return data.data
  }

  async getTransferType(id: number): Promise<TransferType> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_TYPE_BY_ID(id))
    const data: ApiResponse<TransferType> = await response.json()
    return data.data
  }

  async createTransferType(typeData: CreateTransferTypeData): Promise<TransferType> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_TYPES, {
      method: 'POST',
      body: JSON.stringify(typeData),
    })
    const data: ApiResponse<TransferType> = await response.json()
    return data.data
  }

  async updateTransferType(id: number, typeData: UpdateTransferTypeData): Promise<TransferType> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_TYPE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(typeData),
    })
    const data: ApiResponse<TransferType> = await response.json()
    return data.data
  }

  async deleteTransferType(id: number): Promise<void> {
    await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.TRANSFER_TYPE_BY_ID(id), {
      method: 'DELETE',
    })
  }

  // Cash Reconciliations
  async getCashReconciliations(
    params?: CashReconciliationQueryParams
  ): Promise<CashReconciliation[]> {
    const queryParams = new URLSearchParams()
    if (params?.account_id) queryParams.append('account_id', String(params.account_id))
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)

    const url = `${API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATIONS}${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<CashReconciliation[]> = await response.json()
    return data.data
  }

  async getCashReconciliation(id: number): Promise<CashReconciliation> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_ID(id))
    const data: ApiResponse<CashReconciliation> = await response.json()
    return data.data
  }

  async getCashReconciliationByDate(
    date: string,
    accountId: number
  ): Promise<CashReconciliation | null> {
    const url = `${API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_DATE(date)}?account_id=${accountId}`
    const response = await fetchWithAuth(url)
    const data: ApiResponse<CashReconciliation | null> = await response.json()
    return data.data
  }

  async createCashReconciliation(
    reconciliationData: CreateCashReconciliationData
  ): Promise<CashReconciliation> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATIONS, {
      method: 'POST',
      body: JSON.stringify(reconciliationData),
    })
    const data: ApiResponse<CashReconciliation> = await response.json()
    return data.data
  }

  async updateCashReconciliation(
    id: number,
    reconciliationData: UpdateCashReconciliationData
  ): Promise<CashReconciliation> {
    const response = await fetchWithAuth(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(reconciliationData),
    })
    const data: ApiResponse<CashReconciliation> = await response.json()
    return data.data
  }

  async calculateExpectedBalance(accountId: number, date: string): Promise<CalculatedBalance> {
    const response = await fetchWithAuth(
      API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_CALCULATE(accountId, date)
    )
    const data: ApiResponse<CalculatedBalance> = await response.json()
    return data.data
  }
}

export const accountingService = new AccountingService()
