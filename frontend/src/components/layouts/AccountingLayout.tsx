import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import {
  LayoutDashboard,
  BookOpenText,
  BookUp2,
  FileText,
  Settings,
  DollarSign,
  Calculator,
  List,
  Scale,
  Banknote,
} from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Panel Principal',
    href: '/accounting/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Asientos',
    href: '/accounting/operations',
    icon: BookOpenText,
  },
  {
    name: 'Movimientos de Caja',
    href: '/accounting/cash-movements',
    icon: Banknote,
  },
  {
    name: 'Pase al Diario',
    href: '/accounting/subdiario',
    icon: BookUp2,
  },
  {
    name: 'Plan de Cuentas',
    href: '/accounting/categories',
    icon: List,
  },
  {
    name: 'Saldos',
    href: '/accounting/balances',
    icon: Scale,
  },
  {
    name: 'Arqueos de Caja',
    href: '/accounting/reconciliations',
    icon: Calculator,
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
