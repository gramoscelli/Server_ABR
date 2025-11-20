import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'

// Lazy load all page components for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'))
const ResendVerificationPage = lazy(() => import('@/pages/ResendVerificationPage'))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ExpensesPage = lazy(() => import('@/pages/cash/ExpensesPage'))
const IncomesPage = lazy(() => import('@/pages/cash/IncomesPage'))
const TransfersPage = lazy(() => import('@/pages/cash/TransfersPage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const SociosPage = lazy(() => import('@/pages/SociosPage'))
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'))
const ApiKeysPage = lazy(() => import('@/pages/admin/ApiKeysPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'))

// Loading component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/register" element={<RegisterPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} errorElement={<RouteErrorBoundary />} />
          <Route
            path="/pending-approval"
            element={
              <ProtectedRoute>
                <PendingApprovalPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <DashboardPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/cash/expenses"
            element={
              <ProtectedRoute requireAdmin>
                <ExpensesPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/cash/incomes"
            element={
              <ProtectedRoute requireAdmin>
                <IncomesPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/cash/transfers"
            element={
              <ProtectedRoute requireAdmin>
                <TransfersPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <UsersPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/socios"
            element={
              <ProtectedRoute requireLibraryAccess>
                <SociosPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute requireRoot>
                <RolesPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/api-keys"
            element={
              <ProtectedRoute requireRoot>
                <ApiKeysPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requireRoot>
                <SettingsPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireApprovedUser>
                <ProfilePage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route path="*" element={<RouteErrorBoundary />} />
        </Routes>
        <Toaster />
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
