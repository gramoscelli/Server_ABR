import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/lib/auth'
import purchasesService from '@/lib/purchasesService'
import type { PurchaseRequest } from '@/types/purchases'
import { REQUEST_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types/purchases'

export default function PurchasesDashboardPage() {
  const navigate = useNavigate()
  const [pendingRequests, setPendingRequests] = useState<PurchaseRequest[]>([])
  const [evaluationRequests, setEvaluationRequests] = useState<PurchaseRequest[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, inEvaluation: 0 })
  const [loading, setLoading] = useState(true)

  const user = authService.getUser()
  const canApprove = user?.role === 'root' || user?.role === 'board_member'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pendingResponse, evaluationResponse, requestsResponse] = await Promise.all([
        purchasesService.getPendingApprovalRequests().catch(() => ({ data: [], count: 0 })),
        purchasesService.getRequests({ status: 'in_evaluation', limit: 100 }).catch(() => ({ data: [], pagination: { total: 0 } })),
        purchasesService.getRequests({ limit: 100 }).catch(() => ({ data: [], summary: {} })),
      ])

      setPendingRequests(pendingResponse.data.slice(0, 5))
      setEvaluationRequests(evaluationResponse.data.slice(0, 5))
      setStats({
        pending: pendingResponse.count,
        approved: requestsResponse.data.filter(r => r.status === 'approved' || r.status === 'order_created').length,
        inEvaluation: evaluationResponse.pagination?.total || evaluationResponse.data.length,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuSections = [
    {
      title: 'Proveedores',
      description: 'Gestiona el registro de proveedores',
      icon: Users,
      color: 'bg-blue-500',
      route: '/purchases/suppliers',
    },
    {
      title: 'Solicitudes de Compra',
      description: 'Crea y gestiona solicitudes de compra',
      icon: FileText,
      color: 'bg-green-500',
      route: '/purchases/requests',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compras</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestion de compras, proveedores y ordenes
          </p>
        </div>
        <Button onClick={() => navigate('/purchases/requests/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes de Aprobacion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">En Evaluacion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inEvaluation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Solicitudes Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800"
              onClick={() => navigate(section.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pending Approvals (for board members) */}
      {canApprove && pendingRequests.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="h-5 w-5 text-yellow-500" />
              Solicitudes Pendientes de Aprobacion
            </CardTitle>
            <CardDescription>Solicitudes que requieren tu aprobacion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => navigate(`/purchases/requests/${request.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {request.request_number}
                      </span>
                      <Badge variant="outline" className={`text-${PRIORITY_COLORS[request.priority]}-600`}>
                        {PRIORITY_LABELS[request.priority]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{request.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${Number(request.estimated_amount).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(request.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/purchases/requests?status=pending_approval')}
            >
              Ver todas las solicitudes pendientes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requests in Evaluation (for board members) */}
      {canApprove && evaluationRequests.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <AlertCircle className="h-5 w-5 text-purple-500" />
              Solicitudes en Evaluacion
            </CardTitle>
            <CardDescription>Cotizaciones recibidas listas para evaluar y adjudicar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluationRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => navigate(`/purchases/requests/${request.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {request.request_number}
                      </span>
                      <Badge variant="outline" className={`text-${PRIORITY_COLORS[request.priority]}-600`}>
                        {PRIORITY_LABELS[request.priority]}
                      </Badge>
                      {request.quotations_count !== undefined && request.quotations_count > 0 && (
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {request.quotations_count} cotizacion{request.quotations_count > 1 ? 'es' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{request.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${Number(request.estimated_amount).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(request.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/purchases/requests?status=in_evaluation')}
            >
              Ver todas las solicitudes en evaluacion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
