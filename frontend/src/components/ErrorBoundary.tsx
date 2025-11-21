import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Always log to console, even in production
    console.error('==================================================')
    console.error('ERROR BOUNDARY CAUGHT AN ERROR:')
    console.error('Error:', error)
    console.error('Error Message:', error.message)
    console.error('Error Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)
    console.error('==================================================')

    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Something went wrong
                </h1>
                <p className="text-gray-600 mt-1">
                  We apologize for the inconvenience. An unexpected error occurred.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  Error Details
                </h2>
                <div className="text-xs text-gray-600 font-mono overflow-auto">
                  <p className="font-semibold text-red-600 mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap mb-4 text-red-700">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>What you can do:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Try refreshing the page</li>
                <li>Clear your browser cache and cookies</li>
                <li>Check your internet connection</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use in hooks-based apps
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
