import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Home, ArrowLeft, AlertCircle } from 'lucide-react'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  let errorMessage: string
  let errorStatus: number | undefined

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message
    errorStatus = error.status
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else {
    errorMessage = 'Ha ocurrido un error inesperado'
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-lg w-full p-8 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {errorStatus && (
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">
            {errorStatus}
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {errorStatus === 404 ? 'Página no encontrada' : '¡Ups!'}
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {errorStatus === 404
            ? 'La página que buscas no existe.'
            : errorMessage}
        </p>

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-left border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Detalles del Error (Modo Desarrollo)
            </h2>
            <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono overflow-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <Button
            onClick={handleGoHome}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Button>
        </div>
      </Card>
    </div>
  )
}
