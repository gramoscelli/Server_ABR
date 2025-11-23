import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Building2,
  Shield,
  Clock,
  Save,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface SystemSettings {
  // General
  appName: string
  organizationName: string
  // Security
  minPasswordLength: number
  requireUppercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxLoginAttempts: number
  lockoutDuration: number
  // Session
  sessionTimeout: number
  refreshTokenExpiry: number
  // Features
  enableOAuth: boolean
  enableApiKeys: boolean
  enableEmailVerification: boolean
}

const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'Biblio-Server',
  organizationName: 'Asociación Bernardino Rivadavia',
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLoginAttempts: 5,
  lockoutDuration: 60,
  sessionTimeout: 60,
  refreshTokenExpiry: 168,
  enableOAuth: true,
  enableApiKeys: true,
  enableEmailVerification: true,
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const user = authService.getUser()
    const isRoot = user?.role === 'root'

    if (!isRoot) {
      navigate('/profile')
      return
    }

    // Simular carga de configuraciones (en un sistema real, esto vendría del backend)
    setTimeout(() => {
      setSettings(DEFAULT_SETTINGS)
      setOriginalSettings(DEFAULT_SETTINGS)
      setLoading(false)
    }, 500)
  }, [navigate])

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(changed)
  }, [settings, originalSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Simular guardado (en un sistema real, esto iría al backend)
      await new Promise(resolve => setTimeout(resolve, 1000))

      setOriginalSettings({ ...settings })
      setHasChanges(false)

      toast({
        title: 'Configuración guardada',
        description: 'Los cambios han sido aplicados exitosamente'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({ ...originalSettings })
    setHasChanges(false)
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración General</h1>
          <p className="mt-2 text-gray-600">Parámetros y preferencias del sistema</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Descartar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">Cargando configuración...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Información General
              </CardTitle>
              <CardDescription>
                Configuración básica de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">Nombre de la Aplicación</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => updateSetting('appName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nombre de la Organización</Label>
                  <Input
                    id="orgName"
                    value={settings.organizationName}
                    onChange={(e) => updateSetting('organizationName', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Seguridad
              </CardTitle>
              <CardDescription>
                Políticas de contraseñas y bloqueo de cuentas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Policy */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Política de Contraseñas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPassword">Longitud mínima</Label>
                    <Input
                      id="minPassword"
                      type="number"
                      min={6}
                      max={32}
                      value={settings.minPasswordLength}
                      onChange={(e) => updateSetting('minPasswordLength', parseInt(e.target.value) || 8)}
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reqUpper" className="cursor-pointer">Requerir mayúsculas</Label>
                      <Switch
                        id="reqUpper"
                        checked={settings.requireUppercase}
                        onCheckedChange={(checked) => updateSetting('requireUppercase', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reqNumbers" className="cursor-pointer">Requerir números</Label>
                      <Switch
                        id="reqNumbers"
                        checked={settings.requireNumbers}
                        onCheckedChange={(checked) => updateSetting('requireNumbers', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reqSpecial" className="cursor-pointer">Requerir caracteres especiales</Label>
                      <Switch
                        id="reqSpecial"
                        checked={settings.requireSpecialChars}
                        onCheckedChange={(checked) => updateSetting('requireSpecialChars', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Lockout */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Bloqueo de Cuentas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxAttempts">Máximo de intentos fallidos</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      min={3}
                      max={20}
                      value={settings.maxLoginAttempts}
                      onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-gray-500">Intentos antes de bloquear la cuenta</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockDuration">Duración del bloqueo (minutos)</Label>
                    <Input
                      id="lockDuration"
                      type="number"
                      min={5}
                      max={1440}
                      value={settings.lockoutDuration}
                      onChange={(e) => updateSetting('lockoutDuration', parseInt(e.target.value) || 60)}
                    />
                    <p className="text-xs text-gray-500">Tiempo que permanece bloqueada la cuenta</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Sesiones
              </CardTitle>
              <CardDescription>
                Configuración de tokens y tiempos de sesión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Expiración del token de acceso (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min={15}
                    max={1440}
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value) || 60)}
                  />
                  <p className="text-xs text-gray-500">Tiempo de vida del JWT (actualmente: 1 hora)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refreshExpiry">Expiración del refresh token (horas)</Label>
                  <Input
                    id="refreshExpiry"
                    type="number"
                    min={24}
                    max={720}
                    value={settings.refreshTokenExpiry}
                    onChange={(e) => updateSetting('refreshTokenExpiry', parseInt(e.target.value) || 168)}
                  />
                  <p className="text-xs text-gray-500">Tiempo de vida del token de renovación (actualmente: 7 días)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                Funcionalidades
              </CardTitle>
              <CardDescription>
                Activar o desactivar características del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="enableOAuth" className="cursor-pointer font-medium">
                      Autenticación OAuth
                    </Label>
                    <p className="text-sm text-gray-500">
                      Permitir inicio de sesión con Google, GitHub, Facebook, Microsoft
                    </p>
                  </div>
                  <Switch
                    id="enableOAuth"
                    checked={settings.enableOAuth}
                    onCheckedChange={(checked) => updateSetting('enableOAuth', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="enableApiKeys" className="cursor-pointer font-medium">
                      Claves API
                    </Label>
                    <p className="text-sm text-gray-500">
                      Permitir autenticación mediante claves API para integraciones
                    </p>
                  </div>
                  <Switch
                    id="enableApiKeys"
                    checked={settings.enableApiKeys}
                    onCheckedChange={(checked) => updateSetting('enableApiKeys', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="enableEmailVerify" className="cursor-pointer font-medium">
                      Verificación de Email
                    </Label>
                    <p className="text-sm text-gray-500">
                      Requerir verificación de correo electrónico al registrarse
                    </p>
                  </div>
                  <Switch
                    id="enableEmailVerify"
                    checked={settings.enableEmailVerification}
                    onCheckedChange={(checked) => updateSetting('enableEmailVerification', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Nota sobre la configuración</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Algunos cambios en la configuración pueden requerir reiniciar el servidor para aplicarse.
                    Las modificaciones en políticas de seguridad afectarán a nuevos usuarios y sesiones.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changes indicator */}
          {hasChanges && (
            <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg">
              <p className="text-sm text-yellow-800">
                Tienes cambios sin guardar
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
