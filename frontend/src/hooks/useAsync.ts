import { useState, useCallback } from 'react'

interface UseAsyncOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface UseAsyncResult<T> {
  execute: (...args: any[]) => Promise<T | undefined>
  loading: boolean
  error: Error | null
  data: T | null
  reset: () => void
}

/**
 * Custom hook for handling async operations
 * @param asyncFunction - The async function to execute
 * @param options - Optional callbacks for success and error
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncResult<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        setData(result)

        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred')
        setError(error)

        if (options.onError) {
          options.onError(error)
        }
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction, options]
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { execute, loading, error, data, reset }
}
