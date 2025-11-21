import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  Plus,
  Edit,
  Trash2,
  Building2,
  Briefcase,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddAccountDialog, AccountFormData } from '@/components/cash/AddAccountDialog'
import { accountingService } from '@/lib/accountingService'
import type { Account } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

export default function AccountsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'cash' | 'bank' | 'other'>('all')

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchAccounts()
  }, [navigate])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await accountingService.getAccounts()
      setAccounts(response.data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuentas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (data: AccountFormData) => {
    try {
      await accountingService.createAccount({
        name: data.name,
        type: data.type,
        account_number: data.account_number || undefined,
        bank_name: data.bank_name || undefined,
        currency: data.currency,
        initial_balance: Number(data.initial_balance),
        is_active: data.is_active,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Cuenta creada correctamente',
      })

      fetchAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la cuenta',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditAccount = async (data: AccountFormData) => {
    if (!editingAccount) return

    try {
      await accountingService.updateAccount(editingAccount.id, {
        name: data.name,
        type: data.type,
        account_number: data.account_number || undefined,
        bank_name: data.bank_name || undefined,
        currency: data.currency,
        is_active: data.is_active,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Cuenta actualizada correctamente',
      })

      setEditingAccount(null)
      fetchAccounts()
    } catch (error) {
      console.error('Error updating account:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuenta',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) return

    try {
      await accountingService.deleteAccount(id)
      toast({
        title: 'Éxito',
        description: 'Cuenta eliminada correctamente',
      })
      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la cuenta',
        variant: 'destructive',
      })
    }
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Wallet className="h-5 w-5" />
      case 'bank':
        return <Building2 className="h-5 w-5" />
      default:
        return <Briefcase className="h-5 w-5" />
    }
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'cash':
        return 'Efectivo'
      case 'bank':
        return 'Banco'
      default:
        return 'Otro'
    }
  }

  const filteredAccounts = filterType === 'all'
    ? accounts
    : accounts.filter(acc => acc.type === filterType)

  const totalBalance = filteredAccounts.reduce(
    (sum, acc) => sum + Number(acc.current_balance || 0),
    0
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cuentas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona tus cuentas de efectivo y bancarias
            </p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsAddAccountOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            size="sm"
          >
            Todas
          </Button>
          <Button
            variant={filterType === 'cash' ? 'default' : 'outline'}
            onClick={() => setFilterType('cash')}
            size="sm"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Efectivo
          </Button>
          <Button
            variant={filterType === 'bank' ? 'default' : 'outline'}
            onClick={() => setFilterType('bank')}
            size="sm"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Banco
          </Button>
          <Button
            variant={filterType === 'other' ? 'default' : 'outline'}
            onClick={() => setFilterType('other')}
            size="sm"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Otro
          </Button>
        </div>

        {/* Total Balance Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Balance Total</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ${totalBalance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {filteredAccounts.length} cuenta{filteredAccounts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle>Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-500">Cargando...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                  <Wallet className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No hay cuentas disponibles</p>
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  onClick={() => setIsAddAccountOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cuenta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-4 rounded-lg border-2 ${
                      account.is_active
                        ? 'bg-white border-gray-200 hover:border-blue-300'
                        : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{account.name}</h3>
                          <p className="text-xs text-gray-500">{getAccountTypeLabel(account.type)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAccount(account)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          ${(Number(account.current_balance) || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{account.currency}</p>
                      </div>

                      {account.type === 'bank' && (
                        <div className="pt-2 border-t text-xs text-gray-600">
                          {account.bank_name && <p>Banco: {account.bank_name}</p>}
                          {account.account_number && <p>Cuenta: {account.account_number}</p>}
                        </div>
                      )}

                      {account.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-600">{account.notes}</p>
                        </div>
                      )}

                      {!account.is_active && (
                        <div className="pt-2">
                          <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            Inactiva
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddAccountDialog
          open={isAddAccountOpen}
          onOpenChange={setIsAddAccountOpen}
          onSubmit={handleAddAccount}
        />
        <AddAccountDialog
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          onSubmit={handleEditAccount}
          account={editingAccount}
        />
      </div>
    </AdminLayout>
  )
}
