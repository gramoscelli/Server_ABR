import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserCircle,
  ChevronDown,
  Lock,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Home,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getRoleDisplayName } from '@/lib/utils'
import { authService } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { ProfileDialog } from './ProfileDialog'
import { ChangePasswordDialog } from './ChangePasswordDialog'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  leftContent?: React.ReactNode
}

export function Header({ onMenuClick, showMenuButton = false, leftContent }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const user = authService.getUser()

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

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
      <div className="flex items-center h-16 px-4">
        {/* Mobile menu button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-gray-700 dark:text-gray-200 mr-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}

        {/* Left content (logo, title, etc) */}
        {leftContent && <div className="flex items-center">{leftContent}</div>}

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
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-7">
              {user?.role ? getRoleDisplayName(user.role) : ''}
            </span>
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
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  setProfileDialogOpen(true)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <UserCircle className="h-4 w-4" />
                Mi Perfil
              </button>

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
                  setPasswordDialogOpen(true)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Lock className="h-4 w-4" />
                Cambiar Contraseña
              </button>

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

      {/* Dialogs */}
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </header>
  )
}
