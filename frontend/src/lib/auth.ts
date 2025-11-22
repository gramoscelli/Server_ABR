// Authentication utilities
import { useAuthStore, type User } from '@/store/authStore'

// Export User type for backward compatibility
export type { User }

// Get store state outside of React components
const getAuthState = () => useAuthStore.getState()

// CSRF token storage
let csrfToken: string | null = null
let csrfTokenExpiry: number | null = null

// Get or refresh CSRF token
async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid (check if expires in more than 5 minutes)
  if (csrfToken && csrfTokenExpiry && csrfTokenExpiry > Date.now() + 5 * 60 * 1000) {
    return csrfToken
  }

  console.log('[getCsrfToken] Fetching new CSRF token...')

  try {
    const token = authService.getAccessToken()
    const headers = new Headers()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch('/api/csrf-token', {
      headers,
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`)
    }

    const data = await response.json()

    if (!data.token || typeof data.token !== 'string') {
      throw new Error('CSRF token not found in response')
    }

    csrfToken = data.token

    // Token expires in 2 hours (7200 seconds) according to backend
    csrfTokenExpiry = Date.now() + (data.expiresIn || 7200) * 1000

    console.log('[getCsrfToken] New CSRF token obtained, expires in', data.expiresIn, 'seconds')
    return data.token
  } catch (error) {
    console.error('[getCsrfToken] Failed to get CSRF token:', error)
    throw error
  }
}

export const authService = {
  setTokens(accessToken: string, refreshToken: string) {
    getAuthState().setTokens(accessToken, refreshToken)
  },

  getAccessToken(): string | null {
    return getAuthState().accessToken
  },

  getRefreshToken(): string | null {
    return getAuthState().refreshToken
  },

  setUser(user: User) {
    getAuthState().setUser(user)
  },

  getUser(): User | null {
    return getAuthState().user
  },

  clearAuth() {
    getAuthState().logout()
    // Clear CSRF token on logout
    csrfToken = null
    csrfTokenExpiry = null
  },

  isAuthenticated(): boolean {
    return getAuthState().isAuthenticated
  }
}

// Interceptor para agregar el token a las solicitudes
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authService.getAccessToken()

  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Add Content-Type for JSON requests if not already set
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add CSRF token for state-changing methods
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    try {
      const csrf = await getCsrfToken()
      headers.set('X-CSRF-Token', csrf)
      console.log('[fetchWithAuth] Added CSRF token to', method, 'request')
    } catch (error) {
      console.error('[fetchWithAuth] Failed to get CSRF token, request may fail:', error)
    }
  }

  console.log('[fetchWithAuth] Request:', url, 'Token:', token ? 'Present' : 'Missing', 'Method:', method)

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })

  console.log('[fetchWithAuth] Response:', response.status, response.statusText)

  // Si obtenemos un 401, intentar refrescar el token
  if (response.status === 401) {
    console.log('[fetchWithAuth] Got 401, attempting token refresh...')
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      console.log('[fetchWithAuth] Token refreshed, retrying request...')
      // Reintentar la solicitud original con el nuevo token
      const newToken = authService.getAccessToken()
      headers.set('Authorization', `Bearer ${newToken}`)
      const retryResponse = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      })

      // Check if retry was successful
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('[fetchWithAuth] Retry failed:', retryResponse.status, errorData)
        throw new Error(errorData.error || errorData.message || `HTTP ${retryResponse.status}`)
      }

      return retryResponse
    } else {
      console.log('[fetchWithAuth] Token refresh failed, redirecting to login...')
      // Si no se pudo refrescar, limpiar la autenticación
      authService.clearAuth()
      window.location.href = '/login'
      throw new Error('Authentication failed')
    }
  }

  // Handle CSRF token errors (403 with CSRF-related message)
  if (response.status === 403) {
    const errorData = await response.clone().json().catch(() => ({}))
    if (errorData.error && errorData.error.includes('CSRF')) {
      console.log('[fetchWithAuth] CSRF token invalid/expired, getting new token and retrying...')
      // Clear the cached CSRF token
      csrfToken = null
      csrfTokenExpiry = null

      // Get new CSRF token and retry once
      try {
        const newCsrf = await getCsrfToken()
        headers.set('X-CSRF-Token', newCsrf)

        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include'
        })

        console.log('[fetchWithAuth] CSRF retry response:', retryResponse.status)

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json().catch(() => ({ error: 'Error desconocido' }))
          console.error('[fetchWithAuth] CSRF retry failed:', retryResponse.status, retryError)
          throw new Error(retryError.error || retryError.message || `HTTP ${retryResponse.status}`)
        }

        return retryResponse
      } catch (error) {
        console.error('[fetchWithAuth] Failed to retry with new CSRF token:', error)
        throw error
      }
    }
  }

  // Check if response is successful
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
    console.error('[fetchWithAuth] Request failed:', response.status, errorData)
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
  }

  return response
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = authService.getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      authService.setTokens(data.accessToken, data.refreshToken)
      return true
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
  }

  return false
}
