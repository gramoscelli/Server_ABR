import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Key,
  Database,
  Server,
  Mail,
  Bell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SystemPage() {
  const navigate = useNavigate()

  const systemSections = [
    {
      title: 'Claves API',
      description: 'Gestiona las claves de API para integraciones externas',
      icon: Key,
      color: 'bg-orange-500',
      route: '/admin/api-keys',
    },
    {
      title: 'Configuración General',
      description: 'Parámetros y configuración global del sistema',
      icon: Settings,
      color: 'bg-blue-500',
      route: '/admin/settings',
    },
    {
      title: 'Base de Datos',
      description: 'Gestión y mantenimiento de la base de datos',
      icon: Database,
      color: 'bg-purple-500',
      coming_soon: true,
    },
    {
      title: 'Correo Electrónico',
      description: 'Configuración de servidor SMTP y plantillas de email',
      icon: Mail,
      color: 'bg-green-500',
      coming_soon: true,
    },
    {
      title: 'Notificaciones',
      description: 'Configuración de sistema de notificaciones',
      icon: Bell,
      color: 'bg-yellow-500',
      coming_soon: true,
    },
    {
      title: 'Servidor',
      description: 'Información y estado del servidor',
      icon: Server,
      color: 'bg-red-500',
      coming_soon: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sistema</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configuración general del sistema y gestión de servicios
        </p>
      </div>

      {/* System Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card
              key={index}
              className={`${!section.coming_soon ? 'cursor-pointer hover:shadow-lg' : 'opacity-75'} transition-shadow dark:bg-gray-800`}
              onClick={() => !section.coming_soon && section.route && navigate(section.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      {section.title}
                      {section.coming_soon && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                          Próximamente
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!section.coming_soon ? (
                  <Button variant="outline" className="w-full">
                    Configurar
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    En desarrollo
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* System Information */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Información del Sistema</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Detalles técnicos y estado del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Versión del Sistema:</span>
                <span className="font-semibold text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Node.js:</span>
                <span className="font-semibold text-gray-900 dark:text-white">v20.x</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Base de Datos:</span>
                <span className="font-semibold text-gray-900 dark:text-white">PostgreSQL</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Entorno:</span>
                <span className="font-semibold text-gray-900 dark:text-white">Producción</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Estado del Servidor:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">● En línea</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Última actualización:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Note */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Server className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                Mantenimiento del Sistema
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                Realiza copias de seguridad periódicas y mantén el sistema actualizado.
                Revisa los logs regularmente para detectar posibles problemas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
