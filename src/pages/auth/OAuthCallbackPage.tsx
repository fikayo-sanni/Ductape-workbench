import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authServices } from '@/services/authServices';
import { useAuth } from '@/store/useAuth';
import toast from 'react-hot-toast';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    authServices
      .exchangeOAuthToken(token)
      .then((res) => {
        setUser(res.data.result);
        toast.success('Login successful');
        navigate('/', { replace: true });
      })
      .catch(() => {
        setError('Google login failed. Please try again.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <a href="/login" className="text-primary underline text-sm">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-grey-600 text-sm">Signing you in…</p>
    </div>
  );
}
