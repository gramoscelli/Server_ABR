import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PasswordRequirement {
  name: string;
  label: string;
  met: boolean;
  required: boolean;
  current?: number;
  expected?: number;
  examples?: string;
}

interface PasswordValidation {
  valid: boolean;
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  message: string;
  requirements: PasswordRequirement[];
  feedback: string[];
}

interface PasswordStrengthIndicatorProps {
  password: string;
  onValidationChange?: (validation: PasswordValidation | null) => void;
}

export function PasswordStrengthIndicator({ password, onValidationChange }: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState<PasswordValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  // Get CSRF token on mount
  useEffect(() => {
    fetch('/api/csrf-token', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(err => console.error('Failed to get CSRF token:', err));
  }, []);

  // Validate password when it changes
  useEffect(() => {
    // Clear validation immediately if password is empty
    if (!password || password.length === 0) {
      setValidation(null);
      onValidationChange?.(null);
      setLoading(false);
      return;
    }

    if (!csrfToken) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/validate-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({ password }),
        });

        if (response.ok) {
          const data = await response.json();
          setValidation(data);
          onValidationChange?.(data);
        }
      } catch (error) {
        console.error('Password validation error:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [password, csrfToken, onValidationChange]);

  // Don't show anything if password is empty or validation hasn't been received yet
  if (!password || password.length === 0 || !validation) {
    return null;
  }

  const getStrengthColor = () => {
    switch (validation.strength) {
      case 'excellent': return 'bg-green-500';
      case 'strong': return 'bg-blue-500';
      case 'good': return 'bg-yellow-500';
      case 'fair': return 'bg-orange-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStrengthTextColor = () => {
    switch (validation.strength) {
      case 'excellent': return 'text-green-700';
      case 'strong': return 'text-blue-700';
      case 'good': return 'text-yellow-700';
      case 'fair': return 'text-orange-700';
      case 'weak': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  const getStrengthText = () => {
    switch (validation.strength) {
      case 'excellent': return 'Excelente';
      case 'strong': return 'Fuerte';
      case 'good': return 'Buena';
      case 'fair': return 'Regular';
      case 'weak': return 'Débil';
      default: return '';
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className={`font-medium ${getStrengthTextColor()}`}>
            Fortaleza: {getStrengthText()}
          </span>
          <span className="text-gray-500">
            {validation.score}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${validation.score}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-700">Requisitos:</p>
        <div className="space-y-1">
          {validation.requirements
            .filter(req => req.required)
            .map((req) => (
              !req.met ? 
              <div key={req.name} className="flex items-start gap-2 text-xs">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className={req.met ? 'text-gray-600' : 'text-gray-900'}>
                  {req.label}
                  {req.current !== undefined && req.expected !== undefined && !req.met && (
                    <span className="text-gray-500 ml-1">
                      ({req.current}/{req.expected})
                    </span>
                  )}
                </span>
              </div> :  <></>)
            )}
        </div>
      </div>

      {/* Feedback */}
      {validation.feedback && validation.feedback.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-800 mb-1">Sugerencias:</p>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                {validation.feedback.map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {validation.valid && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs text-green-800">
              ✓ La contraseña cumple con todos los requisitos de seguridad
            </p>
          </div>
        </div>
      )}

      {/* Special Characters Examples */}
      {validation.requirements.find(r => r.name === 'specialChars' && !r.met) && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Caracteres especiales permitidos:</span>
          {' '}!@#$%^&*()_+-=[]{};\':"|,&lt;&gt;/?~`
        </div>
      )}
    </div>
  );
}
