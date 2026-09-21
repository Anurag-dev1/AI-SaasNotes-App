import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVerifyEmail } from '../hooks/useAuth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyMutation = useVerifyEmail();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    
    verifyMutation.mutate(token, {
      onSuccess: () => setStatus('success'),
      onError: () => setStatus('error')
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center space-y-4">
        {status === 'verifying' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900">Verifying Email...</h2>
            <div className="animate-pulse flex justify-center py-4">
              <div className="h-8 w-8 bg-primary-500 rounded-full"></div>
            </div>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
            <p className="text-gray-600">Your email has been successfully verified.</p>
            <Link to="/login" className="inline-block mt-4 text-primary-600 font-medium hover:underline">Proceed to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
            <p className="text-gray-600">The verification link is invalid or has expired.</p>
            <Link to="/login" className="inline-block mt-4 text-primary-600 font-medium hover:underline">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
