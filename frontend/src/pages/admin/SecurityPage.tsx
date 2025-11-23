import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Users,
  Lock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SecurityPage() {
  const navigate = useNavigate()

  const securitySections = [
    {
      title: 'Roles de Usuario',
      description: 'Gestiona los roles del sistema y asigna usuarios a cada rol',
      icon: Shield,
      color: 'bg-purple-500',
      route: '/admin/roles',
      stats: 'Crear, editar y eliminar roles. Ver distribución de usuarios.',
    },
    {
      title: 'Permisos y Accesos',
      description: 'Configura permisos detallados para cada rol del sistema',
      icon: Lock,
      color: 'bg-blue-500',
      route: '/admin/roles',
      stats: 'Matriz de permisos por recurso: leer, crear, actualizar, eliminar.',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seguridad</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestión de roles, permisos y configuración de seguridad del sistema
        </p>
      </div>

      {/* Security Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {securitySections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800"
              onClick={() => navigate(section.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-gray-900 dark:text-white">
                      {section.title}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {section.stats && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    {section.stats}
                  </p>
                )}
                <Button variant="outline" className="w-full">
                  Administrar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Security Guidelines */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <Shield className="h-5 w-5" />
            Recomendaciones de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
          <p>
            * <strong>Principio de menor privilegio:</strong> Asigna a los usuarios solo los permisos necesarios para realizar sus tareas.
          </p>
          <p>
            * <strong>Revisión periódica:</strong> Revisa regularmente los roles y permisos asignados a cada usuario.
          </p>
          <p>
            * <strong>Roles predefinidos:</strong> Utiliza los roles predefinidos del sistema como base y personaliza según necesidades específicas.
          </p>
          <p>
            * <strong>Auditoría:</strong> Mantén un registro de cambios en roles y permisos para trazabilidad.
          </p>
        </CardContent>
      </Card>

      {/* Roles Overview */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Roles del Sistema</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Descripción de los roles predefinidos en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Administrador (root)</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Acceso total al sistema. Puede gestionar usuarios, roles, configuración y todos los módulos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Empleado Administrativo</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Acceso al módulo de contabilidad y funciones administrativas básicas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Empleado de Biblioteca</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Acceso al módulo de biblioteca para gestión de préstamos y recursos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Usuario Nuevo</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Usuario recién registrado sin permisos específicos. Requiere asignación de rol.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
