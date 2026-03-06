import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddTransferDialog } from './AddTransferDialog'

// Mock accounting service
vi.mock('@/lib/accountingService', () => ({
  accountingService: {
    getAccounts: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'Caja', type: 'cash', currency: 'ARS', current_balance: '10000' },
        { id: 2, name: 'Banco', type: 'bank', currency: 'ARS', current_balance: '50000' },
      ],
    }),
    getTransferTypes: vi.fn().mockResolvedValue([
      { id: 1, name: 'Transferencia', is_active: true },
      { id: 2, name: 'Depósito', is_active: true },
    ]),
  },
}))

describe('AddTransferDialog - Label renaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show "Agregar Otra Operacion" as dialog title', async () => {
    render(
      <AddTransferDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(await screen.findByText('Agregar Otra Operación')).toBeInTheDocument()
    expect(screen.queryByText('Agregar Transferencia')).not.toBeInTheDocument()
  })

  it('should show "Tipo de Operacion" label', async () => {
    render(
      <AddTransferDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(await screen.findByText('Tipo de Operación (Opcional)')).toBeInTheDocument()
    expect(screen.queryByText('Tipo de Transferencia (Opcional)')).not.toBeInTheDocument()
  })

  it('should show "Agregar Operacion" on submit button', async () => {
    render(
      <AddTransferDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(await screen.findByText('Agregar Operación')).toBeInTheDocument()
    expect(screen.queryByText('Agregar Transferencia')).not.toBeInTheDocument()
  })

  it('should show "Descripcion de la operacion" as placeholder', async () => {
    render(
      <AddTransferDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    // Wait for dialog to render
    await screen.findByText('Agregar Otra Operación')

    const textarea = screen.getByPlaceholderText('Descripción de la operación')
    expect(textarea).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Descripción de la transferencia')).not.toBeInTheDocument()
  })

  it('should not render when open is false', () => {
    render(
      <AddTransferDialog open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(screen.queryByText('Agregar Otra Operación')).not.toBeInTheDocument()
  })
})
