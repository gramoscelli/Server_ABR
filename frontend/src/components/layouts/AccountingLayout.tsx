import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import {
  LayoutDashboard,
  BookOpenText,
  Building2,
  FileText,
  Settings,
  DollarSign,
} from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Panel Principal',
    href: '/accounting/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Operaciones',
    href: '/accounting/operations',
    icon: BookOpenText,
  },
  {
    name: 'Cuentas',
    href: '/accounting/accounts',
    icon: Building2,
  },
  {
    name: 'Reportes',
    href: '/accounting/reports',
    icon: FileText,
  },
  {
    name: 'Configuración',
    href: '/accounting/settings',
    icon: Settings,
  },
]

export function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Contabilidad"
      moduleIcon={DollarSign}
      moduleColor="from-purple-500 to-purple-600"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
