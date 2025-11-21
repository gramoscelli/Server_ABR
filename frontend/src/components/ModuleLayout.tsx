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
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getRoleDisplayName } from '@/lib/utils'
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
}

export function ModuleLayout({
  children,
  moduleName,
  moduleIcon: ModuleIcon,
  moduleColor,
  navigation,
}: ModuleLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme, effectiveTheme } = useTheme()

  const user = authService.getUser()

  // Get theme-appropriate sidebar colors
  const getSidebarColor = () => {
    if (effectiveTheme === 'dark') {
      // Dark theme: use darker, more muted colors
      const darkColors: { [key: string]: string } = {
        'from-blue-500 to-blue-600': 'from-blue-900 to-blue-950',
        'from-green-500 to-emerald-600': 'from-green-900 to-emerald-950',
        'from-purple-500 to-purple-600': 'from-purple-900 to-purple-950',
        'from-gray-700 to-gray-800': 'from-gray-800 to-gray-900',
      }
      return darkColors[moduleColor] || moduleColor
    } else {
      // Light theme: use lighter, softer colors
      const lightColors: { [key: string]: string } = {
        'from-blue-500 to-blue-600': 'from-blue-400 to-blue-500',
        'from-green-500 to-emerald-600': 'from-green-400 to-emerald-500',
        'from-purple-500 to-purple-600': 'from-purple-400 to-purple-500',
        'from-gray-700 to-gray-800': 'from-gray-600 to-gray-700',
      }
      return lightColors[moduleColor] || moduleColor
    }
  }

  const sidebarColor = getSidebarColor()

  // Close menu when clicking outside
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
        <div className={`flex flex-col h-screen bg-gradient-to-br ${sidebarColor} shadow-2xl`}>
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
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          `hidden lg:flex flex-col bg-gradient-to-br ${sidebarColor} shadow-2xl transition-all duration-300`,
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
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center h-16 px-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-700 dark:text-gray-200 mr-2"
            >
              <Menu className="h-6 w-6" />
            </Button>

            {/* User menu - always pushed to the right */}
            <div className="relative ml-auto" ref={userMenuRef}>
              <Button
                variant="ghost"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex flex-col items-start gap-0 px-3 py-2 h-auto text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  <span className="font-semibold">{user?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-7">{user?.role ? getRoleDisplayName(user.role) : ''}</span>
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <button
                    onClick={() => {
                      navigate('/')
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Home className="h-4 w-4" />
                    Ir al Inicio
                  </button>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircle className="h-4 w-4" />
                    Mi Perfil
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

                  <Link
                    to="/change-password"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Lock className="h-4 w-4" />
                    Cambiar Contraseña
                  </Link>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Salir
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
