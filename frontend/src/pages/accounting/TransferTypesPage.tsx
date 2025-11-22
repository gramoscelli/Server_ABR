import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddTransferTypeDialog, TransferTypeFormData } from '@/components/cash/AddTransferTypeDialog'
import { accountingService } from '@/lib/accountingService'
import type { TransferType } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

export default function TransferTypesPage() {
  const navigate = useNavigate()
  const [transferTypes, setTransferTypes] = useState<TransferType[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddTransferTypeOpen, setIsAddTransferTypeOpen] = useState(false)
  const [editingTransferType, setEditingTransferType] = useState<TransferType | null>(null)

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchTransferTypes()
  }, [navigate])

  const fetchTransferTypes = async () => {
    try {
      setLoading(true)
      const response = await accountingService.getTransferTypes()
      setTransferTypes(response || [])
    } catch (error) {
      console.error('Error fetching transfer types:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tipos de transferencias',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransferType = async (data: TransferTypeFormData) => {
    try {
      await accountingService.createTransferType({
        name: data.name,
        description: data.description || undefined,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Tipo de transferencia creado correctamente',
      })

      fetchTransferTypes()
    } catch (error) {
      console.error('Error creating transfer type:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el tipo de transferencia',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditTransferType = async (data: TransferTypeFormData) => {
    if (!editingTransferType) return

    try {
      await accountingService.updateTransferType(editingTransferType.id, {
        name: data.name,
        description: data.description || undefined,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Tipo de transferencia actualizado correctamente',
      })

      setEditingTransferType(null)
      fetchTransferTypes()
    } catch (error) {
      console.error('Error updating transfer type:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el tipo de transferencia',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteTransferType = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este tipo de transferencia? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deleteTransferType(id)
      toast({
        title: 'Éxito',
        description: 'Tipo de transferencia eliminado correctamente',
      })
      fetchTransferTypes()
    } catch (error) {
      console.error('Error deleting transfer type:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el tipo de transferencia',
        variant: 'destructive',
      })
    }
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tipos de Transferencias</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los tipos de transferencias entre cuentas
            </p>
          </div>
          <Button
            className="bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => setIsAddTransferTypeOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>

        {/* Transfer Types List */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Transferencias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-500">Cargando...</p>
              </div>
            ) : transferTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                  <ArrowLeftRight className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No hay tipos de transferencias</p>
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  onClick={() => setIsAddTransferTypeOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Tipo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {transferTypes.map((transferType) => (
                  <div
                    key={transferType.id}
                    className={`p-4 rounded-lg border-2 ${
                      transferType.is_active
                        ? 'bg-white border-gray-200 hover:border-gray-400'
                        : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                          <ArrowLeftRight className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{transferType.name}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTransferType(transferType)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransferType(transferType.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {transferType.description && (
                      <p className="text-sm text-gray-600 mb-2">{transferType.description}</p>
                    )}

                    {!transferType.is_active && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                          Inactivo
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddTransferTypeDialog
          open={isAddTransferTypeOpen}
          onOpenChange={setIsAddTransferTypeOpen}
          onSubmit={handleAddTransferType}
        />
        <AddTransferTypeDialog
          open={!!editingTransferType}
          onOpenChange={(open) => !open && setEditingTransferType(null)}
          onSubmit={handleEditTransferType}
          transferType={editingTransferType}
        />
      </div>
  )
}
