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
const HomePage = lazy(() => import('@/pages/HomePage'))
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage'))

// Accounting module pages
const DashboardPage = lazy(() => import('@/pages/accounting/DashboardPage'))
const OperationsPage = lazy(() => import('@/pages/accounting/OperationsPage'))
const ReportsPage = lazy(() => import('@/pages/accounting/ReportsPage'))
const AccountsPage = lazy(() => import('@/pages/accounting/AccountsPage'))
const CategoriesPage = lazy(() => import('@/pages/accounting/CategoriesPage'))
const TransferTypesPage = lazy(() => import('@/pages/accounting/TransferTypesPage'))
const AccountingSettingsPage = lazy(() => import('@/pages/accounting/SettingsPage'))
// Legacy pages (for backward compatibility)
const ExpensesPage = lazy(() => import('@/pages/accounting/ExpensesPage'))
const IncomesPage = lazy(() => import('@/pages/accounting/IncomesPage'))
const TransfersPage = lazy(() => import('@/pages/accounting/TransfersPage'))
const ReconciliationsPage = lazy(() => import('@/pages/accounting/ReconciliationsPage'))

// Socios module pages
const SociosPage = lazy(() => import('@/pages/SociosPage'))

// Admin module pages
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'))
const ApiKeysPage = lazy(() => import('@/pages/admin/ApiKeysPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))

// Profile and auth pages
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PendingApprovalPage = lazy(() => import('@/pages/PendingApprovalPage'))

// Module layouts
import { SociosLayout } from '@/components/layouts/SociosLayout'
import { LibraryLayout } from '@/components/layouts/LibraryLayout'
import { AccountingLayout } from '@/components/layouts/AccountingLayout'
import { AdminModuleLayout } from '@/components/layouts/AdminModuleLayout'

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
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/register" element={<RegisterPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} errorElement={<RouteErrorBoundary />} />
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} errorElement={<RouteErrorBoundary />} />

          {/* Protected routes - auth status */}
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

          {/* Home/Dashboard - Module selector */}
          <Route
            path="/"
            element={
              <ProtectedRoute requireApprovedUser>
                <HomePage />
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />

          {/* Legacy dashboard redirect */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Socios Module */}
          <Route
            path="/socios"
            element={
              <ProtectedRoute requireLibraryAccess>
                <SociosLayout>
                  <SociosPage />
                </SociosLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />

          {/* Library Module - Placeholder pages */}
          <Route
            path="/library/*"
            element={
              <ProtectedRoute requireLibraryAccess>
                <LibraryLayout>
                  <ComingSoonPage
                    title="Módulo de Biblioteca"
                    description="El módulo de biblioteca está en desarrollo. Pronto podrás gestionar el catálogo de libros y préstamos."
                    showHomeButton={false}
                  />
                </LibraryLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />

          {/* Accounting Module */}
          <Route
            path="/accounting"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <Navigate to="/accounting/dashboard" replace />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <DashboardPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/operations"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <OperationsPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/accounts"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <AccountsPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/reports"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <ReportsPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/settings"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <AccountingSettingsPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/categories"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <CategoriesPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/accounting/transfer-types"
            element={
              <ProtectedRoute requireAdmin>
                <AccountingLayout>
                  <TransferTypesPage />
                </AccountingLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          {/* Legacy routes - redirect to new structure */}
          <Route
            path="/accounting/expenses"
            element={<Navigate to="/accounting/operations" replace />}
          />
          <Route
            path="/accounting/incomes"
            element={<Navigate to="/accounting/operations" replace />}
          />
          <Route
            path="/accounting/transfers"
            element={<Navigate to="/accounting/operations" replace />}
          />
          <Route
            path="/accounting/reconciliations"
            element={<Navigate to="/accounting/operations" replace />}
          />

          {/* Admin Module */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRoot>
                <AdminModuleLayout>
                  <Navigate to="/admin/users" replace />
                </AdminModuleLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <AdminModuleLayout>
                  <UsersPage />
                </AdminModuleLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute requireRoot>
                <AdminModuleLayout>
                  <RolesPage />
                </AdminModuleLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/api-keys"
            element={
              <ProtectedRoute requireRoot>
                <AdminModuleLayout>
                  <ApiKeysPage />
                </AdminModuleLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requireRoot>
                <AdminModuleLayout>
                  <SettingsPage />
                </AdminModuleLayout>
              </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary />}
          />

          {/* 404 and fallback */}
          <Route
            path="*"
            element={
              <ComingSoonPage
                title="Página no encontrada"
                description="La página que buscas no existe o aún no está disponible."
              />
            }
          />
        </Routes>
        <Toaster />
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
