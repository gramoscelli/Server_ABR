import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddPlanCuentaDialog, PlanCuentaFormData } from '@/components/cash/AddPlanCuentaDialog'
import { accountingService } from '@/lib/accountingService'
import type { PlanDeCuentas } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [planDeCuentas, setPlanDeCuentas] = useState<{ activo: PlanDeCuentas[]; pasivo: PlanDeCuentas[]; egreso: PlanDeCuentas[]; ingreso: PlanDeCuentas[] }>({ activo: [], pasivo: [], egreso: [], ingreso: [] })
  const [loading, setLoading] = useState(true)
  const [isAddPlanCuentaOpen, setIsAddPlanCuentaOpen] = useState(false)
  const [editingPlanCuenta, setEditingPlanCuenta] = useState<PlanDeCuentas | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchData()
  }, [navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [activoResponse, pasivoResponse, egresoResponse, ingresoResponse] = await Promise.all([
        accountingService.getPlanDeCuentas({ tipo: 'activo' }),
        accountingService.getPlanDeCuentas({ tipo: 'pasivo' }),
        accountingService.getPlanDeCuentas({ tipo: 'egreso' }),
        accountingService.getPlanDeCuentas({ tipo: 'ingreso' }),
      ])
      setPlanDeCuentas({ activo: activoResponse || [], pasivo: pasivoResponse || [], egreso: egresoResponse || [], ingreso: ingresoResponse || [] })
    } catch (error) {
      console.error('Error fetching plan de cuentas:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el plan de cuentas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlanCuenta = async (data: PlanCuentaFormData) => {
    try {
      await accountingService.createPlanDeCuentas({
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        grupo: data.grupo,
      })

      toast({
        title: 'Éxito',
        description: 'Cuenta creada correctamente',
      })

      fetchData()
    } catch (error) {
      console.error('Error creating plan de cuentas:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la cuenta',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditPlanCuenta = async (data: PlanCuentaFormData) => {
    if (!editingPlanCuenta) return

    try {
      await accountingService.updatePlanDeCuentas(editingPlanCuenta.id, {
        nombre: data.nombre,
      })

      toast({
        title: 'Éxito',
        description: 'Cuenta actualizada correctamente',
      })

      setEditingPlanCuenta(null)
      fetchData()
    } catch (error) {
      console.error('Error updating plan de cuentas:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuenta',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeletePlanCuenta = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deletePlanDeCuentas(id)
      toast({
        title: 'Éxito',
        description: 'Cuenta eliminada correctamente',
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting plan de cuentas:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la cuenta',
        variant: 'destructive',
      })
    }
  }

  const openAddPlanCuenta = () => {
    setIsAddPlanCuentaOpen(true)
  }

  const renderPlanSection = (
    title: string,
    codeRange: string,
    cuentas: PlanDeCuentas[],
    colorClass: string,
    bgClass: string,
    borderFirst: boolean = false,
  ) => (
    <div className={borderFirst ? '' : 'pt-6 border-t'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-lg ${colorClass}`}>{title} ({codeRange})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openAddPlanCuenta()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : cuentas.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No hay cuentas en esta sección</p>
      ) : (
        <div className="space-y-2">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <div>
                <span className={`font-mono font-semibold ${colorClass}`}>{cuenta.codigo}</span>
                <span className="ml-2 text-gray-900">{cuenta.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${bgClass} px-2 py-1 rounded`}>{cuenta.grupo}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPlanCuenta(cuenta)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePlanCuenta(cuenta.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Plan de Cuentas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona el plan de cuentas para clasificar operaciones contables
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan de Cuentas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderPlanSection('Activo', '1xxx', planDeCuentas.activo, 'text-blue-600', 'bg-blue-100 text-blue-700', true)}
          {renderPlanSection('Pasivo', '2xxx', planDeCuentas.pasivo, 'text-orange-600', 'bg-orange-100 text-orange-700')}
          {renderPlanSection('Ingresos', '4xxx', planDeCuentas.ingreso, 'text-green-600', 'bg-green-100 text-green-700')}
          {renderPlanSection('Egresos', '5xxx', planDeCuentas.egreso, 'text-red-600', 'bg-red-100 text-red-700')}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddPlanCuentaDialog
        open={isAddPlanCuentaOpen}
        onOpenChange={setIsAddPlanCuentaOpen}
        onSubmit={handleAddPlanCuenta}
      />
      <AddPlanCuentaDialog
        open={!!editingPlanCuenta}
        onOpenChange={(open) => !open && setEditingPlanCuenta(null)}
        onSubmit={handleEditPlanCuenta}
        cuenta={editingPlanCuenta}
      />
    </div>
  )
}
