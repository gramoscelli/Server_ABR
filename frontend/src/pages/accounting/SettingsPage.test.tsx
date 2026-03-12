import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from './SettingsPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('SettingsPage - Label renaming', () => {
  it('should show "Tipos de Operaciones" instead of "Tipos de Transferencias"', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Tipos de Operaciones')).toBeInTheDocument()
    expect(screen.queryByText('Tipos de Transferencias')).not.toBeInTheDocument()
  })

  it('should show updated description for operation types', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Define los tipos de operaciones entre cuentas')).toBeInTheDocument()
    expect(screen.queryByText('Define los tipos de transferencias entre cuentas')).not.toBeInTheDocument()
  })

  it('should show "Tipos de Operaciones" in the info card', () => {
    render(<SettingsPage />)

    // The info card has a <strong> with "Tipos de Operaciones:"
    const matches = screen.getAllByText((content) =>
      content.includes('Tipos de Operaciones')
    )
    // Card title + info card strong = at least 2 matches
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('should still show Cuentas and Categorias sections unchanged', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Cuentas')).toBeInTheDocument()
    expect(screen.getByText('Plan de Cuentas')).toBeInTheDocument()
  })
})
