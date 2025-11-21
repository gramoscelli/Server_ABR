import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import { LayoutDashboard, Users, Shield, Settings } from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Panel Principal',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Usuarios',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Seguridad',
    href: '/admin/security',
    icon: Shield,
  },
  {
    name: 'Sistema',
    href: '/admin/system',
    icon: Settings,
  },
]

export function AdminModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Administración"
      moduleIcon={Settings}
      moduleColor="from-gray-700 to-gray-800"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
