import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/lib/auth';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get tokens from URL parameters
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        // Handle error
        if (error) {
          console.error('OAuth error:', error);
          navigate('/login?error=' + encodeURIComponent(error), { replace: true });
          return;
        }

        // Validate tokens
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in OAuth callback');
          navigate('/login?error=missing_tokens', { replace: true });
          return;
        }

        // Store tokens
        authService.setTokens(accessToken, refreshToken);

        // Fetch user info
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userData = await response.json();
        authService.setUser(userData.user);

        // Check if user must change password (shouldn't happen with OAuth, but check anyway)
        if (userData.user?.must_change_password) {
          navigate('/change-password', {
            replace: true,
            state: { forcedChange: true }
          });
          return;
        }

        // Check if user is new_user (not approved yet)
        if (userData.user?.role?.toLowerCase() === 'new_user') {
          navigate('/pending-approval', { replace: true });
          return;
        }

        // Redirect based on role - only root goes to dashboard
        const isRoot = userData.user?.role === 'root';
        const defaultRoute = isRoot ? '/dashboard' : '/profile';
        navigate(defaultRoute, { replace: true });

      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login?error=oauth_failed', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900">
            Completando inicio de sesión...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Por favor espera mientras te autenticamos
          </p>
        </div>
      </div>
    </div>
  );
}
