import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator'

export default function ChangePasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = authService.getUser()

  // Check if user must change password (from backend)
  const mustChangePassword = user?.must_change_password === true
  // Also allow forced change from navigation state (backward compatibility)
  const isForcedChange = mustChangePassword || (location.state as any)?.forcedChange || false

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<any>(null)
  const { toast } = useToast()

  // Prevent navigation away if forced change
  useEffect(() => {
    if (isForcedChange) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = ''
      }
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isForcedChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate password strength
    if (!passwordValidation || !passwordValidation.valid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La nueva contraseña no cumple con los requisitos de seguridad'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Las contraseñas no coinciden'
      })
      return
    }

    // Solo validar la contraseña actual si NO es un cambio forzado
    if (!isForcedChange && currentPassword === newPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La nueva contraseña debe ser diferente a la actual'
      })
      return
    }

    setLoading(true)

    try {
      const csrfRes = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          currentPassword: isForcedChange ? '' : currentPassword,
          newPassword
        })
      })

      if (response.ok) {
        const data = await response.json()

        toast({
          title: 'Éxito',
          description: 'Contraseña actualizada correctamente'
        })

        // Si era un cambio forzado, cerrar sesión y redirigir al login
        if (isForcedChange) {
          setTimeout(() => {
            authService.clearAuth()
            navigate('/login', {
              replace: true,
              state: { message: 'Contraseña cambiada. Por favor, inicia sesión con tu nueva contraseña.' }
            })
          }, 1500)
        } else {
          // Update user in store to remove must_change_password flag
          if (data.user) {
            authService.setUser(data.user)
          }
          // Limpiar el formulario
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        }
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al cambiar la contraseña'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al cambiar la contraseña'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cambiar Contraseña</h1>
          <p className="mt-2 text-gray-600">
            {isForcedChange
              ? 'Debes cambiar tu contraseña para continuar'
              : 'Actualiza tu contraseña de acceso al sistema'}
          </p>
        </div>

        {isForcedChange && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Cambio de contraseña obligatorio</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Un administrador ha cambiado tu contraseña. Por seguridad, debes establecer una nueva contraseña
                antes de continuar usando el sistema.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Seguridad de la Cuenta
            </CardTitle>
            <CardDescription>
              {isForcedChange
                ? 'Ingresa una nueva contraseña segura'
                : 'Por seguridad, necesitas ingresar tu contraseña actual para cambiarla'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contraseña Actual - solo si NO es cambio forzado */}
              {!isForcedChange && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      placeholder="Ingresa tu contraseña actual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Nueva Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Ingresa tu nueva contraseña"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator
                  password={newPassword}
                  onValidationChange={setPasswordValidation}
                />
              </div>

              {/* Confirmar Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Confirma tu nueva contraseña"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="mt-2">
                    {newPassword === confirmPassword ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Las contraseñas coinciden</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>Las contraseñas no coinciden</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className={isForcedChange ? 'w-full' : 'flex-1'}
                >
                  {loading ? 'Actualizando...' : (isForcedChange ? 'Establecer Nueva Contraseña' : 'Cambiar Contraseña')}
                </Button>
                {!isForcedChange && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={loading}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
