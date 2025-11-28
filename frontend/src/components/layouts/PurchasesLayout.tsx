import { ModuleLayout, NavigationItem } from '@/components/ModuleLayout'
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Settings,
} from 'lucide-react'

const navigation: NavigationItem[] = [
  {
    name: 'Panel Principal',
    href: '/purchases',
    icon: LayoutDashboard,
  },
  {
    name: 'Solicitudes',
    href: '/purchases/requests',
    icon: FileText,
  },
  {
    name: 'Proveedores',
    href: '/purchases/suppliers',
    icon: Users,
  },
  {
    name: 'Configuración',
    href: '/purchases/settings',
    icon: Settings,
  },
]

export function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout
      moduleName="Compras"
      moduleIcon={ShoppingCart}
      moduleColor="from-orange-500 to-orange-600"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  )
}
