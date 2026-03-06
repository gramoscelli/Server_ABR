import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddTransferTypeDialog } from './AddTransferTypeDialog'

describe('AddTransferTypeDialog - Label renaming', () => {
  it('should show "Nuevo Tipo de Operacion" when creating', () => {
    render(
      <AddTransferTypeDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(screen.getByText('Nuevo Tipo de Operación')).toBeInTheDocument()
    expect(screen.queryByText('Nuevo Tipo de Transferencia')).not.toBeInTheDocument()
  })

  it('should show "Editar Tipo de Operacion" when editing', () => {
    const existing = {
      id: 1,
      name: 'Depósito',
      color: '#3B82F6',
      description: 'Test',
      order_index: 1,
      is_active: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    render(
      <AddTransferTypeDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        transferType={existing}
      />
    )

    expect(screen.getByText('Editar Tipo de Operación')).toBeInTheDocument()
    expect(screen.queryByText('Editar Tipo de Transferencia')).not.toBeInTheDocument()
  })

  it('should show updated placeholders', () => {
    render(
      <AddTransferTypeDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )

    expect(screen.getByPlaceholderText('Ej: Depósito, Extracción, Transferencia')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Descripción opcional del tipo de operación...')).toBeInTheDocument()

    // Old placeholders should not exist
    expect(screen.queryByPlaceholderText(/transferencia interna/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/tipo de transferencia/i)).not.toBeInTheDocument()
  })
})
