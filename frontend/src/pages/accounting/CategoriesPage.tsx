import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Edit,
  Trash2,
  Tag,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddCategoryDialog, CategoryFormData } from '@/components/cash/AddCategoryDialog'
import { accountingService } from '@/lib/accountingService'
import type { ExpenseCategory, IncomeCategory } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddExpenseCategoryOpen, setIsAddExpenseCategoryOpen] = useState(false)
  const [isAddIncomeCategoryOpen, setIsAddIncomeCategoryOpen] = useState(false)
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<ExpenseCategory | null>(null)
  const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null)
  const [activeTab, setActiveTab] = useState('expenses')

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchCategories()
  }, [navigate])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const [expenseResponse, incomeResponse] = await Promise.all([
        accountingService.getExpenseCategories(),
        accountingService.getIncomeCategories(),
      ])
      setExpenseCategories(expenseResponse || [])
      setIncomeCategories(incomeResponse || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpenseCategory = async (data: CategoryFormData) => {
    try {
      await accountingService.createExpenseCategory({
        name: data.name,
        color: data.color,
        description: data.description || null,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Categoría de egresos creada correctamente',
      })

      fetchCategories()
    } catch (error) {
      console.error('Error creating expense category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la categoría',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditExpenseCategory = async (data: CategoryFormData) => {
    if (!editingExpenseCategory) return

    try {
      await accountingService.updateExpenseCategory(editingExpenseCategory.id, {
        name: data.name,
        color: data.color,
        description: data.description || null,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Categoría de egresos actualizada correctamente',
      })

      setEditingExpenseCategory(null)
      fetchCategories()
    } catch (error) {
      console.error('Error updating expense category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la categoría',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteExpenseCategory = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deleteExpenseCategory(id)
      toast({
        title: 'Éxito',
        description: 'Categoría de egresos eliminada correctamente',
      })
      fetchCategories()
    } catch (error) {
      console.error('Error deleting expense category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la categoría',
        variant: 'destructive',
      })
    }
  }

  const handleAddIncomeCategory = async (data: CategoryFormData) => {
    try {
      await accountingService.createIncomeCategory({
        name: data.name,
        color: data.color,
        description: data.description || null,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Categoría de ingresos creada correctamente',
      })

      fetchCategories()
    } catch (error) {
      console.error('Error creating income category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la categoría',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditIncomeCategory = async (data: CategoryFormData) => {
    if (!editingIncomeCategory) return

    try {
      await accountingService.updateIncomeCategory(editingIncomeCategory.id, {
        name: data.name,
        color: data.color,
        description: data.description || null,
        is_active: data.is_active,
      })

      toast({
        title: 'Éxito',
        description: 'Categoría de ingresos actualizada correctamente',
      })

      setEditingIncomeCategory(null)
      fetchCategories()
    } catch (error) {
      console.error('Error updating income category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la categoría',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteIncomeCategory = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deleteIncomeCategory(id)
      toast({
        title: 'Éxito',
        description: 'Categoría de ingresos eliminada correctamente',
      })
      fetchCategories()
    } catch (error) {
      console.error('Error deleting income category:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la categoría',
        variant: 'destructive',
      })
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorías</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona las categorías de ingresos y egresos
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="expenses">Egresos</TabsTrigger>
            <TabsTrigger value="incomes">Ingresos</TabsTrigger>
          </TabsList>

          {/* Expense Categories Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setIsAddExpenseCategoryOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría de Egresos
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Categorías de Egresos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">Cargando...</p>
                  </div>
                ) : expenseCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <Tag className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay categorías de egresos</p>
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => setIsAddExpenseCategoryOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Categoría
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenseCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`p-4 rounded-lg border-2 ${
                          category.is_active
                            ? 'bg-white border-gray-200 hover:border-red-300'
                            : 'bg-gray-50 border-gray-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingExpenseCategory(category)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpenseCategory(category.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {category.description && (
                          <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Orden: {category.display_order}</span>
                          {!category.is_active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                              Inactiva
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Categories Tab */}
          <TabsContent value="incomes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsAddIncomeCategoryOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría de Ingresos
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Categorías de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">Cargando...</p>
                  </div>
                ) : incomeCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <Tag className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay categorías de ingresos</p>
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => setIsAddIncomeCategoryOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Categoría
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incomeCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`p-4 rounded-lg border-2 ${
                          category.is_active
                            ? 'bg-white border-gray-200 hover:border-green-300'
                            : 'bg-gray-50 border-gray-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingIncomeCategory(category)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIncomeCategory(category.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {category.description && (
                          <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Orden: {category.display_order}</span>
                          {!category.is_active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                              Inactiva
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AddCategoryDialog
          open={isAddExpenseCategoryOpen}
          onOpenChange={setIsAddExpenseCategoryOpen}
          onSubmit={handleAddExpenseCategory}
          type="expense"
        />
        <AddCategoryDialog
          open={isAddIncomeCategoryOpen}
          onOpenChange={setIsAddIncomeCategoryOpen}
          onSubmit={handleAddIncomeCategory}
          type="income"
        />
        <AddCategoryDialog
          open={!!editingExpenseCategory}
          onOpenChange={(open) => !open && setEditingExpenseCategory(null)}
          onSubmit={handleEditExpenseCategory}
          category={editingExpenseCategory}
          type="expense"
        />
        <AddCategoryDialog
          open={!!editingIncomeCategory}
          onOpenChange={(open) => !open && setEditingIncomeCategory(null)}
          onSubmit={handleEditIncomeCategory}
          category={editingIncomeCategory}
          type="income"
        />
      </div>
    </AdminLayout>
  )
}
