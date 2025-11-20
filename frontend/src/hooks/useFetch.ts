import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { useToast } from '@/components/ui/use-toast'

interface UseFetchOptions<T> {
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  showErrorToast?: boolean
}

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useFetch<T = any>(
  url: string,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const { enabled = true, onSuccess, onError, showErrorToast = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  const { accessToken, logout } = useAuthStore()
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          throw new Error('Session expired. Please login again.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred')
      setError(error)

      if (onError) {
        onError(error)
      }

      if (showErrorToast) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [url, enabled, accessToken, onSuccess, onError, showErrorToast, logout, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
