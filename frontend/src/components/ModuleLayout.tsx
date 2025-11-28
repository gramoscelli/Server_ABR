import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Header } from '@/components/Header'
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
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    return stored === 'true'
  })
  const location = useLocation()
  const { effectiveTheme } = useTheme()

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(desktopSidebarCollapsed))
  }, [desktopSidebarCollapsed])

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
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />

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
