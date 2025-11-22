import { useNavigate } from 'react-router-dom'
import { Construction, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ComingSoonPageProps {
  title?: string
  description?: string
  showHomeButton?: boolean
}

export default function ComingSoonPage({
  title = 'Próximamente',
  description = 'Esta funcionalidad está en desarrollo y estará disponible pronto.',
  showHomeButton = true
}: ComingSoonPageProps) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Construction className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          {description}
        </p>

        {/* Decorative element */}
        <div className="mb-8 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          {showHomeButton && (
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Home className="h-4 w-4" />
              Ir al Inicio
            </Button>
          )}
        </div>

        {/* Additional info */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          Estamos trabajando para brindarte la mejor experiencia
        </p>
      </div>
    </div>
  )
}
