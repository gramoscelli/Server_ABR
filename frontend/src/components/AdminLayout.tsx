import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Users,
  Shield,
  Key,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  Lock,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wallet,
  ArrowLeftRight,
  BookUser,
  ChevronDown,
  Building2,
  Tag,
  Calculator
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { authService } from '@/lib/auth'

const navigation = [
  {
    name: 'Panel de Control',
    href: '/dashboard',
    icon: LayoutDashboard,
    adminOnly: true  // root y admin_employee tienen acceso al dashboard de caja
  },
  {
    name: 'Egresos',
    href: '/cash/expenses',
    icon: DollarSign,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Ingresos',
    href: '/cash/incomes',
    icon: Wallet,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Transferencias',
    href: '/cash/transfers',
    icon: ArrowLeftRight,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Cuentas',
    href: '/cash/accounts',
    icon: Building2,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Categorías',
    href: '/cash/categories',
    icon: Tag,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Tipos de Transferencias',
    href: '/cash/transfer-types',
    icon: ArrowLeftRight,
    adminOnly: true  // root y admin_employee
  },
  {
    name: 'Arqueos de Caja',
    href: '/cash/reconciliations',
    icon: Calculator,
    adminOnly: true  // root y admin_employee
  },
  { name: 'Usuarios', href: '/admin/users', icon: Users, adminOnly: true },
  { name: 'Socios', href: '/socios', icon: BookUser, libraryAccess: true },  // admin y library_employee
  { name: 'Roles', href: '/admin/roles', icon: Shield, rootOnly: true },  // Solo root
  { name: 'Claves API', href: '/admin/api-keys', icon: Key, rootOnly: true },  // Solo root
  { name: 'Configuración', href: '/admin/settings', icon: Settings, rootOnly: true },  // Solo root
]

const bottomNavigation = [
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
  { name: 'Cambiar Contraseña', href: '/change-password', icon: Lock },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Get user and check permissions
  const user = authService.getUser()
  const isRoot = user?.role === 'root'
  const isAdmin = user?.role === 'admin' || user?.role === 'root' || user?.role === 'admin_employee'
  const isLibraryEmployee = user?.role === 'library_employee'
  const isApprovedUser = user?.role && !['new_user'].includes(user.role.toLowerCase())
  const mustChangePassword = user?.must_change_password === true

  // Helper function to translate role names
  const translateRoleName = (roleName: string) => {
    const translations: Record<string, string> = {
      'root': 'Administrador',
      'admin_employee': 'Empleado de Administración',
      'library_employee': 'Empleado de Biblioteca',
      'new_user': 'Usuario Nuevo',
      'readonly': 'Solo Lectura'
    }
    return translations[roleName] || roleName
  }

  // Filter navigation based on user role
  const visibleNavigation = navigation.filter(item => {
    // Root-only items: only for root
    if ('rootOnly' in item && item.rootOnly && !isRoot) return false
    // Admin-only items: only for admin/root/admin_employee
    if ('adminOnly' in item && item.adminOnly && !isAdmin) return false
    // Library access items: for admin/root/admin_employee/library_employee
    if ('libraryAccess' in item && item.libraryAccess && !isAdmin && !isLibraryEmployee) return false
    return true
  })

  // If user must change password, don't show sidebar
  if (mustChangePassword) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Clear local auth data regardless of API call result
      authService.clearAuth()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <div className={cn(
        "sidebar-mobile fixed inset-0 z-40",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          {/* Mobile Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Servidor de Administración
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
            {visibleNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                  )} />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              )
            })}
          </nav>

        </div>
      </div>

      {/* Desktop sidebar - always visible on tablets and up */}
      <div className={cn(
        "sidebar-desktop transition-all duration-300",
        desktopSidebarCollapsed ? "lg:w-20" : "lg:w-72"
      )}>
        <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
          {/* Logo Header with modern design */}
          <div className={cn(
            "flex h-20 items-center border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20 transition-all duration-300",
            desktopSidebarCollapsed ? "justify-center px-4" : "justify-center px-6"
          )}>
            {!desktopSidebarCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Servidor de Administración
                </span>
              </div>
            ) : (
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
            )}
          </div>

          {/* Navigation with improved spacing and hover effects */}
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
            {visibleNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={desktopSidebarCollapsed ? item.name : ''}
                  className={cn(
                    "group flex items-center rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
                    desktopSidebarCollapsed ? "justify-center px-2" : "gap-4 px-4",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white hover:scale-105 hover:shadow-md"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400 group-hover:scale-110"
                  )} />
                  {!desktopSidebarCollapsed && (
                    <>
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "main-content transition-all duration-300",
        desktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
      )}>
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
              title={desktopSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {desktopSidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-700" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              )}
            </Button>
            <div className="flex-1" />

            {/* User menu dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hidden sm:flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 hover:from-blue-100 hover:to-purple-100 transition-all duration-200"
              >
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                  <UserCircle className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm text-left">
                  <p className="font-semibold text-gray-900">
                    {authService.getUser()?.username || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {translateRoleName(authService.getUser()?.role || '')}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-gray-500 transition-transform duration-200",
                  userMenuOpen && "rotate-180"
                )} />
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                      location.pathname === '/profile'
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <UserCircle className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>

                  <Link
                    to="/change-password"
                    onClick={() => setUserMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                      location.pathname === '/change-password'
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Cambiar Contraseña</span>
                  </Link>

                  <div className="h-px bg-gray-200 my-2" />

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
