import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface CaptchaProps {
  onCaptchaChange: (tokenId: string | null, response: string) => void;
  error?: string;
}

interface CaptchaData {
  tokenId: string;
  svg: string;
  expiresAt: string;
  type: string;
}

export function Captcha({ onCaptchaChange, error }: CaptchaProps) {
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [captchaResponse, setCaptchaResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadCaptcha = async () => {
    setLoading(true);
    setLoadError('');
    setCaptchaResponse('');

    try {
      const response = await fetch('/api/captcha/generate', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar CAPTCHA');
      }

      const data: CaptchaData = await response.json();
      setCaptchaData(data);
      onCaptchaChange(data.tokenId, '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar CAPTCHA');
      setCaptchaData(null);
      onCaptchaChange(null, '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleResponseChange = (value: string) => {
    setCaptchaResponse(value);
    if (captchaData) {
      onCaptchaChange(captchaData.tokenId, value);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Verificación CAPTCHA
      </label>

      {/* CAPTCHA Image */}
      <div className="relative border border-gray-300 rounded-lg p-4 bg-gray-50">
        {loading && (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center h-24 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{loadError}</p>
            </div>
          </div>
        )}

        {!loading && !loadError && captchaData && (
          <div
            className="captcha-svg-container flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: captchaData.svg }}
          />
        )}

        {/* Reload Button */}
        <button
          type="button"
          onClick={loadCaptcha}
          disabled={loading}
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors disabled:opacity-50"
          title="Recargar CAPTCHA"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CAPTCHA Input */}
      <div>
        <input
          type="text"
          placeholder="Ingresa el código que ves arriba"
          value={captchaResponse}
          onChange={(e) => handleResponseChange(e.target.value)}
          className={`appearance-none relative block w-full px-3 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          required
          autoComplete="off"
        />

        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <p className="mt-1 text-xs text-gray-500">
          El CAPTCHA expira en 5 minutos. No distingue entre mayúsculas y minúsculas.
        </p>
      </div>
    </div>
  );
}
