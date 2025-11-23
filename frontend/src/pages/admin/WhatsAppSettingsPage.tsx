import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageCircle,
  QrCode,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  LogOut,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

type ConnectionStatus = 'not_initialized' | 'connecting' | 'qr_ready' | 'connected' | 'disconnected'

interface WhatsAppStatus {
  sessionId: string
  active: boolean
  state: {
    status: ConnectionStatus
    qr?: string
    qrBase64?: string
    reason?: string
  }
  hasStoredSession?: boolean
}

export default function WhatsAppSettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Mensaje de prueba desde Biblio-Server')
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)

        // If QR is ready, also fetch the QR code
        if (data.state?.status === 'qr_ready' && data.sessionId) {
          const qrResponse = await fetchWithAuth(`/api/whatsapp/session/${data.sessionId}/qr`)
          if (qrResponse.ok) {
            const qrData = await qrResponse.json()
            if (qrData.qrBase64) {
              setQrBase64(qrData.qrBase64)
            }
          }
        } else {
          setQrBase64(null)
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const user = authService.getUser()
    if (user?.role !== 'root' && user?.role !== 'admin_employee') {
      navigate('/profile')
      return
    }
    loadStatus()
  }, [navigate, loadStatus])

  // Poll for status updates when connecting or waiting for QR scan
  useEffect(() => {
    if (status?.state?.status === 'connecting' || status?.state?.status === 'qr_ready') {
      const interval = setInterval(loadStatus, 3000)
      setPollingInterval(interval)
      return () => clearInterval(interval)
    } else if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [status?.state?.status, loadStatus])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/whatsapp/session/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: 'Conexion iniciada',
          description: 'Escanea el codigo QR con WhatsApp para conectar'
        })
        // Start polling for QR code
        setTimeout(loadStatus, 1000)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || data.error || 'No se pudo iniciar la conexion'
        })
      }
    } catch (error) {
      console.error('Error connecting:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de conexion al iniciar WhatsApp'
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!status?.sessionId) return

    setDisconnecting(true)
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/whatsapp/session/${status.sessionId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: 'Desconectado',
          description: 'WhatsApp ha sido desconectado correctamente'
        })
        setStatus(null)
        setQrBase64(null)
        loadStatus()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'No se pudo desconectar'
        })
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al desconectar WhatsApp'
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Ingresa el numero de telefono y el mensaje'
      })
      return
    }

    // Validate phone number (basic check)
    const cleanPhone = testPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast({
        variant: 'destructive',
        title: 'Numero invalido',
        description: 'El numero debe tener entre 10 y 15 digitos (codigo de pais + numero)'
      })
      return
    }

    setSendingTest(true)
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/whatsapp/message/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          to: cleanPhone,
          message: testMessage
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: 'Mensaje enviado',
          description: `Mensaje enviado correctamente a ${cleanPhone}`
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al enviar',
          description: data.message || data.error || 'No se pudo enviar el mensaje'
        })
      }
    } catch (error) {
      console.error('Error sending test message:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de conexion al enviar mensaje'
      })
    } finally {
      setSendingTest(false)
    }
  }

  const getStatusIcon = () => {
    if (!status) return <AlertTriangle className="h-5 w-5 text-gray-400" />

    switch (status.state?.status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'connecting':
      case 'qr_ready':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = () => {
    if (!status) return 'Estado desconocido'

    switch (status.state?.status) {
      case 'connected':
        return 'Conectado'
      case 'connecting':
        return 'Conectando...'
      case 'qr_ready':
        return 'Esperando escaneo del codigo QR'
      case 'disconnected':
        return `Desconectado${status.state.reason ? `: ${status.state.reason}` : ''}`
      case 'not_initialized':
        return status.hasStoredSession ? 'Sesion guardada disponible' : 'No inicializado'
      default:
        return 'Estado desconocido'
    }
  }

  const getStatusColor = () => {
    if (!status) return 'border-gray-200 bg-gray-50'

    switch (status.state?.status) {
      case 'connected':
        return 'border-green-200 bg-green-50'
      case 'connecting':
      case 'qr_ready':
        return 'border-blue-200 bg-blue-50'
      case 'disconnected':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-yellow-200 bg-yellow-50'
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
            <h1 className="text-3xl font-bold text-gray-900">Configuracion de WhatsApp</h1>
            <p className="mt-1 text-gray-600">Conecta WhatsApp para enviar notificaciones</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Cargando estado...
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Card */}
          <Card className={getStatusColor()}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div>
                    <h3 className="font-semibold">{getStatusText()}</h3>
                    <p className="text-sm text-gray-600">
                      Sesion: {status?.sessionId || 'N/A'}
                    </p>
                  </div>
                </div>
                {status?.state?.status === 'connected' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Wifi className="h-5 w-5" />
                    <span className="text-sm font-medium">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <WifiOff className="h-5 w-5" />
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Conexion WhatsApp
              </CardTitle>
              <CardDescription>
                Conecta tu cuenta de WhatsApp escaneando el codigo QR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code Section */}
              {status?.state?.status === 'qr_ready' && qrBase64 && (
                <div className="flex flex-col items-center p-6 bg-white border rounded-lg">
                  <QrCode className="h-6 w-6 text-gray-400 mb-2" />
                  <h4 className="font-medium mb-4">Escanea el codigo QR</h4>
                  <div className="p-4 bg-white rounded-lg shadow-sm border">
                    <img
                      src={qrBase64}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-4 text-center max-w-md">
                    Abre WhatsApp en tu telefono, ve a Configuracion &gt; Dispositivos vinculados &gt; Vincular un dispositivo y escanea el codigo
                  </p>
                </div>
              )}

              {/* Connecting State */}
              {status?.state?.status === 'connecting' && !qrBase64 && (
                <div className="flex flex-col items-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                  <h4 className="font-medium text-blue-900">Conectando...</h4>
                  <p className="text-sm text-blue-700 mt-2">
                    Esperando codigo QR del servidor de WhatsApp
                  </p>
                </div>
              )}

              {/* Connected State */}
              {status?.state?.status === 'connected' && (
                <div className="flex flex-col items-center p-6 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                  <h4 className="font-medium text-green-900">Conectado correctamente</h4>
                  <p className="text-sm text-green-700 mt-2">
                    WhatsApp esta listo para enviar mensajes
                  </p>
                </div>
              )}

              {/* Not Connected State */}
              {(!status?.state?.status || status?.state?.status === 'not_initialized' || status?.state?.status === 'disconnected') && (
                <div className="flex flex-col items-center p-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="font-medium text-gray-900">WhatsApp no conectado</h4>
                  <p className="text-sm text-gray-600 mt-2 mb-4">
                    {status?.hasStoredSession
                      ? 'Hay una sesion guardada. Haz clic en conectar para reconectar.'
                      : 'Conecta WhatsApp para comenzar a enviar notificaciones'}
                  </p>
                </div>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {status?.state?.status !== 'connected' && status?.state?.status !== 'connecting' && status?.state?.status !== 'qr_ready' && (
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar WhatsApp
                      </>
                    )}
                  </Button>
                )}

                {(status?.state?.status === 'connected' || status?.state?.status === 'qr_ready') && (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Desconectar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Message Card */}
          {status?.state?.status === 'connected' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  Enviar Mensaje de Prueba
                </CardTitle>
                <CardDescription>
                  Envia un mensaje de prueba para verificar la conexion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testPhone">Numero de telefono</Label>
                    <Input
                      id="testPhone"
                      placeholder="5491112345678"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Formato: codigo de pais + numero (sin + ni espacios)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testMessage">Mensaje</Label>
                    <Textarea
                      id="testMessage"
                      placeholder="Escribe tu mensaje..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testPhone || !testMessage}
                  className="w-full md:w-auto"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Mensaje de Prueba
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Informacion Importante</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">1.</span>
                  <span>WhatsApp Web permite vincular hasta 4 dispositivos adicionales.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">2.</span>
                  <span>El telefono principal debe permanecer conectado a internet para que funcione.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">3.</span>
                  <span>Los mensajes se envian desde la cuenta vinculada, no desde un numero separado.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">4.</span>
                  <span>Evita enviar mensajes masivos para no ser bloqueado por WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">!</span>
                  <span className="text-yellow-700">Esta es una integracion no oficial. Usa bajo tu responsabilidad.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
