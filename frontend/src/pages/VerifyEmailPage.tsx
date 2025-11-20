import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no encontrado');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.alreadyVerified) {
          setStatus('already-verified');
          setMessage('Este email ya ha sido verificado anteriormente');
        } else {
          setStatus('success');
          setMessage(data.message || 'Email verificado exitosamente');
        }

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Error al verificar el email');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Error de conexión al verificar el email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Verificando Email
              </h2>
              <p className="mt-4 text-gray-600">
                Por favor espera mientras verificamos tu dirección de email...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                ¡Email Verificado!
              </h2>
              <p className="mt-4 text-gray-600">
                {message}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Serás redirigido al login en 3 segundos...
              </p>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Email Ya Verificado
              </h2>
              <p className="mt-4 text-gray-600">
                {message}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Serás redirigido al login en 3 segundos...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Error de Verificación
              </h2>
              <p className="mt-4 text-gray-600">
                {message}
              </p>
            </>
          )}
        </div>

        {status === 'error' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">
              ¿Qué puedes hacer?
            </h4>
            <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
              <li>Verifica que el enlace no esté incompleto</li>
              <li>El token puede haber expirado (válido por 24 horas)</li>
              <li>Solicita un nuevo email de verificación</li>
            </ul>
          </div>
        )}

        <div className="text-center space-y-3 mt-6">
          <Link
            to="/login"
            className="inline-block w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ir al Login
          </Link>
          {status === 'error' && (
            <Link
              to="/resend-verification"
              className="inline-block w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reenviar Email de Verificación
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
