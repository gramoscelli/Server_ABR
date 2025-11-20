// Authentication utilities
import { useAuthStore, type User } from '@/store/authStore'

// Export User type for backward compatibility
export type { User }

// Get store state outside of React components
const getAuthState = () => useAuthStore.getState()

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

  console.log('[fetchWithAuth] Request:', url, 'Token:', token ? 'Present' : 'Missing', 'Method:', options.method || 'GET')

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
