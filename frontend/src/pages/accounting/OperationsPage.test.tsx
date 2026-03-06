import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OperationsPage from './OperationsPage'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock auth service
vi.mock('@/lib/auth', () => ({
  authService: {
    getUser: () => ({ role: 'root' }),
    getToken: () => 'fake-token',
  },
}))

// Mock accounting service
vi.mock('@/lib/accountingService', () => ({
  accountingService: {
    getIncomes: vi.fn().mockResolvedValue({ data: [] }),
    getExpenses: vi.fn().mockResolvedValue({ data: [] }),
    getTransfers: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}))

describe('OperationsPage - Label renaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show "Otra operacion" button instead of "Transferencia"', async () => {
    render(<OperationsPage />)

    // Wait for loading to finish
    await screen.findByText('Libro Diario')

    // The button should say "Otra operacion"
    expect(screen.getByText('Otra operación')).toBeInTheDocument()
    expect(screen.queryByText('Transferencia')).not.toBeInTheDocument()
  })

  it('should have filter combobox with default "Todas las operaciones"', async () => {
    render(<OperationsPage />)
    await screen.findByText('Libro Diario')

    // The filter trigger should show the default value
    const combobox = screen.getByRole('combobox')
    expect(combobox).toBeInTheDocument()
    expect(combobox).toHaveTextContent('Todas las operaciones')
  })

  it('should show "Total Otras Operaciones" in summary card', async () => {
    render(<OperationsPage />)
    await screen.findByText('Libro Diario')

    expect(screen.getByText('Total Otras Operaciones')).toBeInTheDocument()
    expect(screen.queryByText('Total Transferencias')).not.toBeInTheDocument()
  })

  it('should show correct empty state text', async () => {
    render(<OperationsPage />)

    // Wait for the empty state to appear
    const emptyText = await screen.findByText(/otra operación/i)
    expect(emptyText).toBeInTheDocument()
    expect(screen.queryByText(/ingreso, egreso o transferencia$/)).not.toBeInTheDocument()
  })

  it('should still show Ingreso and Egreso buttons unchanged', async () => {
    render(<OperationsPage />)
    await screen.findByText('Libro Diario')

    expect(screen.getByText('Ingreso')).toBeInTheDocument()
    expect(screen.getByText('Egreso')).toBeInTheDocument()
  })
})
