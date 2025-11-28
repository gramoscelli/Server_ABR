import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { authService } from '@/lib/auth'
import {
  Users,
  BookOpen,
  DollarSign,
  ShoppingCart,
  Settings,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { getRoleDisplayName } from '@/lib/utils'

interface Module {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  color: string
  bgGradient: string
  allowedRoles: string[]
}

const modules: Module[] = [
  {
    id: 'socios',
    name: 'Socios',
    description: 'Gestión de socios y cuotas',
    icon: Users,
    path: '/socios',
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-blue-600',
    allowedRoles: ['root', 'admin_employee', 'library_employee'],
  },
  {
    id: 'library',
    name: 'Biblioteca',
    description: 'Catálogo y préstamos de libros',
    icon: BookOpen,
    path: '/library',
    color: 'text-green-600',
    bgGradient: 'from-green-500 to-emerald-600',
    allowedRoles: ['root', 'admin_employee', 'library_employee'],
  },
  {
    id: 'accounting',
    name: 'Contabilidad',
    description: 'Sistema de gestión contable',
    icon: DollarSign,
    path: '/accounting',
    color: 'text-purple-600',
    bgGradient: 'from-purple-500 to-purple-600',
    allowedRoles: ['root', 'admin_employee'],
  },
  {
    id: 'purchases',
    name: 'Compras',
    description: 'Gestión de compras y proveedores',
    icon: ShoppingCart,
    path: '/purchases',
    color: 'text-orange-600',
    bgGradient: 'from-orange-500 to-orange-600',
    allowedRoles: ['root', 'admin_employee', 'board_member'],
  },
  {
    id: 'admin',
    name: 'Administración',
    description: 'Usuarios, roles y configuración',
    icon: Settings,
    path: '/admin',
    color: 'text-gray-600',
    bgGradient: 'from-gray-700 to-gray-800',
    allowedRoles: ['root'],
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const user = authService.getUser()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const handleModuleClick = (path: string) => {
    navigate(path)
  }

  const canAccessModule = (module: Module) => {
    if (!user) return false
    return module.allowedRoles.includes(user.role)
  }

  const accessibleModules = modules.filter(canAccessModule)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <Header
        leftContent={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              Sistema de Gestión
            </h1>
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Bienvenido, {user.username}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Selecciona el módulo con el que deseas trabajar
          </p>
        </div>

        {accessibleModules.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Settings className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No tienes acceso a ningún módulo del sistema
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Contacta al administrador para solicitar permisos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {accessibleModules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleModuleClick(module.path)}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                {/* Content */}
                <div className="relative p-8 flex flex-col items-center text-center">
                  {/* Icon */}
                  <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-br ${module.bgGradient} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <module.icon className="h-12 w-12 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {module.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {module.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    Acceder
                    <svg
                      className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Rol actual: <span className="font-semibold text-gray-700 dark:text-gray-300">{getRoleDisplayName(user.role)}</span></p>
        </div>
      </div>
    </div>
  )
}
