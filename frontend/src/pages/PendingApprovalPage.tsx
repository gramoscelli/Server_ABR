import { useNavigate } from 'react-router-dom'
import { Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService } from '@/lib/auth'

export default function PendingApprovalPage() {
  const navigate = useNavigate()
  const user = authService.getUser()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      authService.clearAuth()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-lg">
              <Clock className="h-12 w-12 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Cuenta Pendiente de Aprobación
          </h1>

          <p className="text-center text-gray-600 mb-6">
            Tu cuenta ha sido creada exitosamente, pero aún no ha sido aprobada por un administrador.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Usuario:</strong> {user?.username}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Estado:</strong> {user?.role}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-700 text-center">
              Un administrador revisará tu solicitud pronto. Recibirás un correo electrónico cuando tu cuenta sea aprobada.
            </p>

            <p className="text-sm text-gray-600 text-center">
              Mientras tanto, puedes cerrar sesión y volver más tarde.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Necesitas ayuda? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  )
}
