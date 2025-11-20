import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireRoot?: boolean
  requireAdmin?: boolean
  requireLibraryAccess?: boolean
  requireApprovedUser?: boolean
}

export function ProtectedRoute({
  children,
  requireRoot = false,
  requireAdmin = false,
  requireLibraryAccess = false,
  requireApprovedUser = false
}: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = authService.isAuthenticated()
  const user = authService.getUser()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Check if user must change password
  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  // Check if user is new_user (not approved yet)
  const isNewUser = user?.role?.toLowerCase() === 'new_user'
  if (isNewUser && location.pathname !== '/pending-approval' && location.pathname !== '/change-password') {
    return <Navigate to="/pending-approval" replace />
  }

  // Check root requirement (most restrictive)
  if (requireRoot) {
    const isRoot = user?.role === 'root'
    if (!isRoot) {
      return <Navigate to="/profile" replace />
    }
  }

  // Check admin requirement
  if (requireAdmin) {
    const isAdmin = user?.role === 'admin' || user?.role === 'root' || user?.role === 'admin_employee'
    if (!isAdmin) {
      return <Navigate to="/profile" replace />
    }
  }

  // Check library access requirement (admin + library_employee)
  if (requireLibraryAccess) {
    const hasLibraryAccess = user?.role === 'admin' || user?.role === 'root' || user?.role === 'admin_employee' || user?.role === 'library_employee'
    if (!hasLibraryAccess) {
      return <Navigate to="/profile" replace />
    }
  }

  // Check approved user requirement (not new_user)
  if (requireApprovedUser && isNewUser) {
    return <Navigate to="/pending-approval" replace />
  }

  return <>{children}</>
}
