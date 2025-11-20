import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { User, Mail, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth'

interface UserProfile {
  id: number
  username: string
  email: string | null
  nombre: string | null
  apellido: string | null
  whatsapp: string | null
  role: string
  oauth_only: boolean
  avatar_url: string | null
  created_at: string
  last_login: string | null
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    whatsapp: ''
  })
  const { toast } = useToast()

  // Load user profile
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setFormData({
          nombre: data.user.nombre || '',
          apellido: data.user.apellido || '',
          email: data.user.email || '',
          whatsapp: data.user.whatsapp || ''
        })
      } else {
        throw new Error('Failed to load profile')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el perfil'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfRes.json()

      // Update profile
      const response = await fetchWithAuth('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        toast({
          title: 'Éxito',
          description: 'Perfil actualizado correctamente'
        })
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar el perfil')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al actualizar el perfil'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        apellido: profile.apellido || '',
        email: profile.email || '',
        whatsapp: profile.whatsapp || ''
      })
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando perfil...</div>
        </div>
      </AdminLayout>
    )
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error al cargar el perfil</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="mt-2 text-gray-600">
            Administra tu información personal y configuración de cuenta
          </p>
        </div>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información de la Cuenta
            </CardTitle>
            <CardDescription>
              Tu nombre de usuario es único y no puede ser modificado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                value={profile.username}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">
                El nombre de usuario no puede ser modificado
              </p>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Input
                id="role"
                value={profile.role}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">
                  {profile.oauth_only ? 'Cuenta OAuth' : 'Información de Seguridad'}
                </h4>
                <p className="text-sm text-blue-800 mt-1">
                  {profile.oauth_only
                    ? 'Esta cuenta usa autenticación OAuth. El email está vinculado a tu proveedor OAuth y no puede ser modificado.'
                    : 'Por seguridad, el email asociado a tu cuenta no puede ser modificado. Si necesitas cambiar tu email, contacta a un administrador.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tus datos personales de contacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Tu nombre"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Tu apellido"
                />
              </div>

              {/* Email - Always disabled */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  El email no puede ser modificado por seguridad. Contacta a un administrador si necesitas cambiarlo.
                </p>
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500">
                  Formato internacional (ej: +549261234567)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving}
                >
                  Restablecer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fecha de creación:</span>
              <span className="font-medium">
                {new Date(profile.created_at).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {profile.last_login && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Último acceso:</span>
                <span className="font-medium">
                  {new Date(profile.last_login).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
