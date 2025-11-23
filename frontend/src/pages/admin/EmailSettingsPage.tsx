import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  Server,
  Key,
  Send,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface EmailSettings {
  provider: 'smtp' | 'resend'
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_password: string
  smtp_from_email: string
  smtp_from_name: string
  resend_api_key: string
  enabled: boolean
}

const DEFAULT_SETTINGS: EmailSettings = {
  provider: 'smtp',
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: 'Biblio Admin',
  resend_api_key: '',
  enabled: false,
}

export default function EmailSettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<EmailSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{
    status: string
    message: string
  } | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    if (user?.role !== 'root') {
      navigate('/profile')
      return
    }
    loadSettings()
    loadStatus()
  }, [navigate])

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(changed)
  }, [settings, originalSettings])

  const loadSettings = async () => {
    try {
      const response = await fetchWithAuth('/api/settings/email')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setOriginalSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading email settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la configuración de email'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStatus = async () => {
    try {
      const response = await fetchWithAuth('/api/settings/email/status')
      if (response.ok) {
        const data = await response.json()
        setEmailStatus(data)
      }
    } catch (error) {
      console.error('Error loading email status:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setOriginalSettings({ ...settings })
        setHasChanges(false)
        toast({
          title: 'Configuración guardada',
          description: 'Los cambios de email han sido aplicados'
        })
        loadStatus()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'No se pudo guardar la configuración'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de conexión al guardar'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Ingresa una dirección de email válida para la prueba'
      })
      return
    }

    setTesting(true)
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ testEmail })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Email enviado',
          description: `Email de prueba enviado a ${testEmail}`
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al enviar',
          description: data.message || 'No se pudo enviar el email de prueba'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de conexión al enviar email de prueba'
      })
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const getStatusIcon = () => {
    if (!emailStatus) return null
    switch (emailStatus.status) {
      case 'configured':
      case 'env_configured':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'disabled':
        return <XCircle className="h-5 w-5 text-gray-400" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/system')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Email</h1>
            <p className="mt-1 text-gray-600">Configura el servidor de correo para enviar notificaciones</p>
          </div>
        </div>
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

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">Cargando configuración...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Card */}
          <Card className={emailStatus?.status === 'configured' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <h3 className="font-semibold">{emailStatus?.message || 'Estado desconocido'}</h3>
                  <p className="text-sm text-gray-600">
                    {settings.enabled ? 'El servicio de email está habilitado' : 'El servicio de email está deshabilitado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enable/Disable Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Servicio de Email
              </CardTitle>
              <CardDescription>
                Activa o desactiva el envío de emails desde el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="enabled" className="font-medium cursor-pointer">
                    Habilitar envío de emails
                  </Label>
                  <p className="text-sm text-gray-500">
                    Cuando está deshabilitado, los emails se registran en la consola pero no se envían
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSetting('enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Proveedor de Email</CardTitle>
              <CardDescription>
                Selecciona el método de envío de emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.provider === 'smtp'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateSetting('provider', 'smtp')}
                >
                  <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">SMTP</h4>
                      <p className="text-sm text-gray-500">Servidor de correo tradicional</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.provider === 'resend'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateSetting('provider', 'resend')}
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-6 w-6 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">Resend</h4>
                      <p className="text-sm text-gray-500">API de email moderna</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMTP Settings */}
          {settings.provider === 'smtp' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  Configuración SMTP
                </CardTitle>
                <CardDescription>
                  Configura la conexión con tu servidor de correo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">Servidor SMTP</Label>
                    <Input
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      value={settings.smtp_host}
                      onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">Puerto</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      placeholder="587"
                      value={settings.smtp_port}
                      onChange={(e) => updateSetting('smtp_port', parseInt(e.target.value) || 587)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="smtp_secure" className="cursor-pointer">Usar SSL/TLS</Label>
                    <p className="text-sm text-gray-500">Puerto 465 usa SSL, puerto 587 usa STARTTLS</p>
                  </div>
                  <Switch
                    id="smtp_secure"
                    checked={settings.smtp_secure}
                    onCheckedChange={(checked) => updateSetting('smtp_secure', checked)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">Usuario</Label>
                    <Input
                      id="smtp_user"
                      placeholder="tu@email.com"
                      value={settings.smtp_user}
                      onChange={(e) => updateSetting('smtp_user', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">Contraseña</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      placeholder="••••••••"
                      value={settings.smtp_password}
                      onChange={(e) => updateSetting('smtp_password', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Para Gmail, usa una contraseña de aplicación</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_from_email">Email remitente</Label>
                    <Input
                      id="smtp_from_email"
                      placeholder="noreply@tudominio.com"
                      value={settings.smtp_from_email}
                      onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_from_name">Nombre remitente</Label>
                    <Input
                      id="smtp_from_name"
                      placeholder="Biblio Admin"
                      value={settings.smtp_from_name}
                      onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resend Settings */}
          {settings.provider === 'resend' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-purple-600" />
                  Configuración Resend
                </CardTitle>
                <CardDescription>
                  Configura tu API Key de Resend para enviar emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend_api_key">API Key</Label>
                  <Input
                    id="resend_api_key"
                    type="password"
                    placeholder="re_••••••••"
                    value={settings.resend_api_key}
                    onChange={(e) => updateSetting('resend_api_key', e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Obtén tu API Key en{' '}
                    <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      resend.com
                    </a>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend_from_email">Email remitente</Label>
                    <Input
                      id="resend_from_email"
                      placeholder="noreply@tudominio.com"
                      value={settings.smtp_from_email}
                      onChange={(e) => updateSetting('smtp_from_email', e.target.value)}
                    />
                    <p className="text-xs text-gray-500">O usa onboarding@resend.dev para pruebas</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resend_from_name">Nombre remitente</Label>
                    <Input
                      id="resend_from_name"
                      placeholder="Biblio Admin"
                      value={settings.smtp_from_name}
                      onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-600" />
                Probar Configuración
              </CardTitle>
              <CardDescription>
                Envía un email de prueba para verificar la configuración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="tu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  onClick={handleTest}
                  disabled={testing || !settings.enabled}
                  variant="outline"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Prueba
                    </>
                  )}
                </Button>
              </div>
              {!settings.enabled && (
                <p className="text-sm text-yellow-600 mt-2">
                  Habilita el servicio de email para enviar pruebas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Common SMTP Servers Reference */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Servidores SMTP Comunes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white rounded-lg">
                  <h4 className="font-semibold">Gmail</h4>
                  <p className="text-gray-600">smtp.gmail.com:587</p>
                  <p className="text-xs text-gray-500">Requiere contraseña de aplicación</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <h4 className="font-semibold">Outlook/Hotmail</h4>
                  <p className="text-gray-600">smtp.office365.com:587</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <h4 className="font-semibold">Yahoo</h4>
                  <p className="text-gray-600">smtp.mail.yahoo.com:587</p>
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
