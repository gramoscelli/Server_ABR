import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from './SettingsPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('SettingsPage', () => {
  it('should show Plan de Cuentas section', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Plan de Cuentas')).toBeInTheDocument()
  })

  it('should show updated descriptions for double-entry system', () => {
    render(<SettingsPage />)

    expect(screen.getByText(/partida doble/)).toBeInTheDocument()
  })
})
