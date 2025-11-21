import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  ArrowLeftRight,
  Building2,
  Tag,
  Calculator,
} from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Panel de Control',
    href: '/accounting/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Egresos',
    href: '/accounting/expenses',
    icon: DollarSign,
  },
  {
    name: 'Ingresos',
    href: '/accounting/incomes',
    icon: Wallet,
  },
  {
    name: 'Transferencias',
    href: '/accounting/transfers',
    icon: ArrowLeftRight,
  },
  {
    name: 'Cuentas',
    href: '/accounting/accounts',
    icon: Building2,
  },
  {
    name: 'Categorías',
    href: '/accounting/categories',
    icon: Tag,
  },
  {
    name: 'Tipos de Transferencias',
    href: '/accounting/transfer-types',
    icon: ArrowLeftRight,
  },
  {
    name: 'Arqueos de Caja',
    href: '/accounting/reconciliations',
    icon: Calculator,
  },
]

export function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Contabilidad"
      moduleColor="from-purple-500 to-purple-600"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
