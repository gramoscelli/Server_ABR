import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TransferTypesPage from './TransferTypesPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
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
    getTransferTypes: vi.fn().mockResolvedValue([
      { id: 1, name: 'Transferencia', is_active: true, description: 'Entre cuentas', color: '#3B82F6', order_index: 1 },
      { id: 2, name: 'Depósito', is_active: false, description: null, color: '#3B82F6', order_index: 2 },
    ]),
    createTransferType: vi.fn(),
    updateTransferType: vi.fn(),
    deleteTransferType: vi.fn(),
  },
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}))

describe('TransferTypesPage - Label renaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show "Tipos de Operaciones" as page title', async () => {
    render(<TransferTypesPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Tipos de Operaciones')
    expect(screen.queryByText('Tipos de Transferencias')).not.toBeInTheDocument()
  })

  it('should show "Gestiona los tipos de operaciones entre cuentas" as subtitle', async () => {
    render(<TransferTypesPage />)

    expect(await screen.findByText('Gestiona los tipos de operaciones entre cuentas')).toBeInTheDocument()
    expect(screen.queryByText(/tipos de transferencias entre cuentas/)).not.toBeInTheDocument()
  })

  it('should show "Tipos de Operaciones" as card title', async () => {
    render(<TransferTypesPage />)

    // Wait for data to load - there's an h1 and a CardTitle
    await screen.findByRole('heading', { level: 1 })

    const cardTitles = screen.getAllByText('Tipos de Operaciones')
    // Page heading + card title
    expect(cardTitles.length).toBeGreaterThanOrEqual(2)
  })

  it('should render transfer type items from the API', async () => {
    render(<TransferTypesPage />)

    expect(await screen.findByText('Transferencia')).toBeInTheDocument()
    expect(screen.getByText('Depósito')).toBeInTheDocument()
  })
})
