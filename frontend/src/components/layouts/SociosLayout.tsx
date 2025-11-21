import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import { BookUser, BarChart3 } from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Socios',
    href: '/socios',
    icon: BookUser,
  },
  {
    name: 'Reportes',
    href: '/socios/reports',
    icon: BarChart3,
  },
]

export function SociosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Socios"
      moduleColor="from-blue-500 to-blue-600"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
