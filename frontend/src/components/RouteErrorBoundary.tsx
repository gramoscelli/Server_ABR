import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Home, RefreshCw } from 'lucide-react'

export function RouteErrorBoundary() {
  const error = useRouteError()

  let errorMessage: string
  let errorStatus: number | undefined

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message
    errorStatus = error.status
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else {
    errorMessage = 'An unexpected error occurred'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-lg w-full p-8 text-center">
        {errorStatus && (
          <div className="text-6xl font-bold text-gray-300 mb-4">
            {errorStatus}
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {errorStatus === 404 ? 'Page Not Found' : 'Oops!'}
        </h1>

        <p className="text-gray-600 mb-6">
          {errorStatus === 404
            ? "The page you're looking for doesn't exist."
            : errorMessage}
        </p>

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Error Details (Development Mode)
            </h2>
            <pre className="text-xs text-gray-600 font-mono overflow-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6">
          <Button onClick={() => window.history.back()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Link to="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
