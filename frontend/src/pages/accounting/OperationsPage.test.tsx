import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  getAsientos: vi.fn().mockResolvedValue({
    success: true,
    data: [],
    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    summary: { totalDebe: '0.00', totalHaber: '0.00', count: 0 },
  }),
  getCuentas: vi.fn().mockResolvedValue({ success: true, data: [] }),
  confirmarAsiento: vi.fn(),
  anularAsiento: vi.fn(),
  deleteAsiento: vi.fn(),
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}))

describe('OperationsPage (Asientos)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the asientos page title', async () => {
    render(<OperationsPage />)
    await screen.findByText(/asiento/i)
  })
})
