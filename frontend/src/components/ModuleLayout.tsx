import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Lock,
  Home,
  Grid3x3,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { authService } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface ModuleLayoutProps {
  children: React.ReactNode
  moduleName: string
  moduleIcon: React.ComponentType<{ className?: string }>
  moduleColor: string
  navigation: NavigationItem[]
  bottomNavigation?: NavigationItem[]
}

export function ModuleLayout({
  children,
  moduleName,
  moduleIcon: ModuleIcon,
  moduleColor,
  navigation,
  bottomNavigation = [
    { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    { name: 'Cambiar Contraseña', href: '/change-password', icon: Lock },
  ]
}: ModuleLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const moduleMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const user = authService.getUser()

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(event.target as Node)) {
        setModuleMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    authService.clearAuth()
    navigate('/login')
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={`flex flex-col h-screen bg-gradient-to-br ${moduleColor} shadow-2xl`}>
          {/* Mobile Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <ModuleIcon className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">{moduleName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-white/20 text-white shadow-lg ring-2 ring-white/30"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Mobile Bottom Navigation */}
          <div className="border-t border-white/10 p-4 space-y-2">
            <Button
              variant="ghost"
              onClick={handleGoHome}
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            >
              <Home className="h-5 w-5 mr-3" />
              Inicio
            </Button>
            {bottomNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-200 hover:text-white hover:bg-red-500/30"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          `hidden lg:flex flex-col bg-gradient-to-br ${moduleColor} shadow-2xl transition-all duration-300`,
          desktopSidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Desktop Header */}
        <div className={cn(
          "flex h-20 items-center border-b border-white/10 transition-all duration-300",
          desktopSidebarCollapsed ? "flex-col justify-center gap-2 px-4" : "justify-between px-6"
        )}>
          {desktopSidebarCollapsed ? (
            <ModuleIcon className="h-8 w-8 text-white" />
          ) : (
            <div className="flex items-center gap-3">
              <ModuleIcon className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">{moduleName}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            {desktopSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          {navigation.map((item) => {
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
                    ? "bg-white/20 text-white shadow-lg ring-2 ring-white/30 scale-105"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:scale-105"
                )}
              >
                <item.icon className="h-5 w-5" />
                {!desktopSidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Bottom Navigation */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <Button
            variant="ghost"
            onClick={handleGoHome}
            title={desktopSidebarCollapsed ? 'Inicio' : ''}
            className={cn(
              "w-full text-white/80 hover:text-white hover:bg-white/10",
              desktopSidebarCollapsed ? "justify-center px-2" : "justify-start"
            )}
          >
            <Home className="h-5 w-5" />
            {!desktopSidebarCollapsed && <span className="ml-3">Inicio</span>}
          </Button>
          {bottomNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              title={desktopSidebarCollapsed ? item.name : ''}
              className={cn(
                "flex items-center rounded-xl py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all",
                desktopSidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"
              )}
            >
              <item.icon className="h-5 w-5" />
              {!desktopSidebarCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
          <Button
            variant="ghost"
            onClick={handleLogout}
            title={desktopSidebarCollapsed ? 'Cerrar Sesión' : ''}
            className={cn(
              "w-full text-red-200 hover:text-white hover:bg-red-500/30",
              desktopSidebarCollapsed ? "justify-center px-2" : "justify-start"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!desktopSidebarCollapsed && <span className="ml-3">Cerrar Sesión</span>}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </Button>

              {/* Module Switcher */}
              <div className="relative" ref={moduleMenuRef}>
                <Button
                  variant="outline"
                  onClick={() => setModuleMenuOpen(!moduleMenuOpen)}
                  className="flex items-center gap-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Cambiar módulo</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {moduleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <button
                      onClick={() => {
                        navigate('/')
                        setModuleMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Inicio
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2"
              >
                <UserCircle className="h-5 w-5" />
                <span className="hidden sm:inline">{user?.username}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircle className="h-4 w-4" />
                    Mi Perfil
                  </Link>
                  <Link
                    to="/change-password"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Lock className="h-4 w-4" />
                    Cambiar Contraseña
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                  {/* Theme selector */}
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tema</p>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors",
                          theme === 'light'
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Sun className="h-4 w-4" />
                        <span>Claro</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors",
                          theme === 'dark'
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Moon className="h-4 w-4" />
                        <span>Oscuro</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors",
                          theme === 'system'
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Monitor className="h-4 w-4" />
                        <span>Auto</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
