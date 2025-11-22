import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import { BookOpen, Library, Users, BarChart3 } from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Catálogo',
    href: '/library/catalog',
    icon: BookOpen,
  },
  {
    name: 'Préstamos',
    href: '/library/loans',
    icon: Library,
  },
  {
    name: 'Lectores',
    href: '/library/readers',
    icon: Users,
  },
  {
    name: 'Reportes',
    href: '/library/reports',
    icon: BarChart3,
  },
]

export function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Biblioteca"
      moduleIcon={BookOpen}
      moduleColor="from-green-500 to-emerald-600"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
