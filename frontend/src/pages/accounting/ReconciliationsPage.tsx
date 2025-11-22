import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  Calculator,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddReconciliationDialog, ReconciliationFormData } from '@/components/cash/AddReconciliationDialog'
import { accountingService } from '@/lib/accountingService'
import type { CashReconciliation } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

export default function ReconciliationsPage() {
  const navigate = useNavigate()
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddReconciliationOpen, setIsAddReconciliationOpen] = useState(false)
  const [editingReconciliation, setEditingReconciliation] = useState<CashReconciliation | null>(null)

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchReconciliations()
  }, [navigate, selectedDate])

  const fetchReconciliations = async () => {
    try {
      setLoading(true)

      // Get the start and end of the selected month
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await accountingService.getCashReconciliations({
        start_date: startDateStr,
        end_date: endDateStr,
      })
      setReconciliations(response || [])
    } catch (error) {
      console.error('Error fetching reconciliations:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los arqueos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddReconciliation = async (data: ReconciliationFormData) => {
    try {
      await accountingService.createCashReconciliation({
        account_id: data.account_id,
        date: data.date,
        opening_balance: data.opening_balance,
        closing_balance: data.closing_balance,
        expected_balance: data.expected_balance,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Arqueo de caja creado correctamente',
      })

      fetchReconciliations()
    } catch (error) {
      console.error('Error creating reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el arqueo de caja',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditReconciliation = async (data: ReconciliationFormData) => {
    if (!editingReconciliation) return

    try {
      await accountingService.updateCashReconciliation(editingReconciliation.id, {
        closing_balance: data.closing_balance,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Arqueo de caja actualizado correctamente',
      })

      setEditingReconciliation(null)
      fetchReconciliations()
    } catch (error) {
      console.error('Error updating reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el arqueo de caja',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteReconciliation = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este arqueo de caja? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deleteCashReconciliation(id)
      toast({
        title: 'Éxito',
        description: 'Arqueo de caja eliminado correctamente',
      })
      fetchReconciliations()
    } catch (error) {
      console.error('Error deleting reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el arqueo de caja',
        variant: 'destructive',
      })
    }
  }

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Arqueos de Caja</h1>
              <p className="mt-1 text-sm text-gray-500 capitalize">{monthYear}</p>
            </div>
            <CompactDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setIsAddReconciliationOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Arqueo
          </Button>
        </div>

        {/* Reconciliations List */}
        <Card>
          <CardHeader>
            <CardTitle>Arqueos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-500">Cargando...</p>
              </div>
            ) : reconciliations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                  <Calculator className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No hay arqueos de caja en este periodo</p>
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  onClick={() => setIsAddReconciliationOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Arqueo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reconciliations.map((reconciliation) => {
                  const expected = Number(reconciliation.expected_balance) || 0
                  const closing = Number(reconciliation.closing_balance) || 0
                  const difference = closing - expected
                  const isBalanced = difference === 0

                  return (
                    <div
                      key={reconciliation.id}
                      className={`p-4 rounded-lg border-2 ${
                        isBalanced
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isBalanced ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            )}
                            <h3 className="font-semibold text-gray-900">
                              {reconciliation.account?.name || 'Cuenta desconocida'}
                            </h3>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-2">
                            <div>
                              <p className="text-xs text-gray-500">Esperado</p>
                              <p className="font-semibold text-gray-900">
                                ${expected.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Real</p>
                              <p className="font-semibold text-gray-900">
                                ${closing.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Diferencia</p>
                              <p className={`font-semibold ${
                                isBalanced
                                  ? 'text-green-600'
                                  : difference > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              {reconciliation.date ? new Date(reconciliation.date + 'T00:00:00').toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }) : 'Sin fecha'}
                            </span>
                            {reconciliation.user && (
                              <>
                                <span>•</span>
                                <span>Por: {reconciliation.user.name}</span>
                              </>
                            )}
                          </div>

                          {reconciliation.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              {reconciliation.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingReconciliation(reconciliation)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReconciliation(reconciliation.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddReconciliationDialog
          open={isAddReconciliationOpen}
          onOpenChange={setIsAddReconciliationOpen}
          onSubmit={handleAddReconciliation}
        />
        <AddReconciliationDialog
          open={!!editingReconciliation}
          onOpenChange={(open) => !open && setEditingReconciliation(null)}
          onSubmit={handleEditReconciliation}
          reconciliation={editingReconciliation}
        />
      </div>
  )
}
