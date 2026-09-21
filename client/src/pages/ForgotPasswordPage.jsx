import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const forgotMutation = useForgotPassword();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await forgotMutation.mutateAsync(email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset Password</h2>
        </div>
        
        {submitted ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">If an account exists for {email}, you will receive a password reset link shortly.</p>
            <Link to="/login" className="inline-block text-primary-600 font-medium hover:underline">Back to login</Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={forgotMutation.isPending} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70">
              {forgotMutation.isPending ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center mt-4 text-sm">
              <Link to="/login" className="font-medium text-gray-600 hover:text-gray-900">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
