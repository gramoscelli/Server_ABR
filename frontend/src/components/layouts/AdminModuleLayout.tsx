import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import { Users, Shield, Key, Settings } from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Usuarios',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Roles',
    href: '/admin/roles',
    icon: Shield,
  },
  {
    name: 'Claves API',
    href: '/admin/api-keys',
    icon: Key,
  },
  {
    name: 'Configuración',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Administración"
      moduleColor="from-gray-700 to-gray-800"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
