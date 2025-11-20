import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface UsernameRequirement {
  name: string;
  label: string;
  met: boolean;
  required: boolean;
  current?: number;
  expected?: number;
}

interface UsernameValidation {
  valid: boolean;
  available: boolean | null;
  availabilityMessage: string;
  requirements: UsernameRequirement[];
  message: string;
  feedback: string[];
}

interface UsernameValidatorProps {
  username: string;
  onValidationChange?: (validation: UsernameValidation | null) => void;
}

export function UsernameValidator({ username, onValidationChange }: UsernameValidatorProps) {
  const [validation, setValidation] = useState<UsernameValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  // Get CSRF token on mount
  useEffect(() => {
    fetch('/api/csrf-token', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(err => console.error('Failed to get CSRF token:', err));
  }, []);

  // Validate username when it changes
  useEffect(() => {
    // Clear validation immediately if username is empty
    if (!username || username.length === 0) {
      setValidation(null);
      onValidationChange?.(null);
      setLoading(false);
      return;
    }

    if (!csrfToken) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/validate-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({ username }),
        });

        if (response.ok) {
          const data = await response.json();
          setValidation(data);
          onValidationChange?.(data);
        }
      } catch (error) {
        console.error('Username validation error:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [username, csrfToken, onValidationChange]);

  // Don't show anything if username is empty or validation hasn't been received yet
  if (!username || username.length === 0) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Validando nombre de usuario...</span>
      </div>
    );
  }

  if (!validation) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Requirements List - Only show unmet requirements */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-700">Requisitos:</p>
        <div className="space-y-1">
          {validation.requirements
            .filter(req => req.required)
            .map((req) => (
              !req.met ? (
                <div key={req.name} className="flex items-start gap-2 text-xs">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">
                    {req.label}
                    {req.current !== undefined && req.expected !== undefined && !req.met && (
                      <span className="text-gray-500 ml-1">
                        ({req.current}/{req.expected})
                      </span>
                    )}
                  </span>
                </div>
              ) : <div key={req.name}></div>
            ))}
        </div>
      </div>

      {/* Availability Check - Only show if format is valid */}
      {validation.valid && validation.available !== null && (
        <div className="mt-2">
          {validation.available ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{validation.availabilityMessage}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{validation.availabilityMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {validation.valid && validation.available && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs text-green-800">
              ✓ El nombre de usuario es válido y está disponible
            </p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {validation.feedback && validation.feedback.length > 0 && (
        <div className="space-y-0.5">
          {validation.feedback.map((tip, index) => (
            <p key={index} className="text-xs text-gray-600">• {tip}</p>
          ))}
        </div>
      )}
    </div>
  );
}
