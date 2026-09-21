import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ organizationName: '', name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const registerMutation = useRegister();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    try {
      await registerMutation.mutateAsync({
        tenantName: formData.organizationName,
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Registration Successful</h2>
          <p className="text-gray-600">Please check your email for a verification link to activate your account.</p>
          <Link to="/login" className="inline-block mt-4 text-primary-600 font-medium hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create an account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input name="organizationName" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <input name="name" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input name="email" type="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input name="confirmPassword" type="password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md mt-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" onChange={handleChange} />
            </div>
          </div>

          <button type="submit" disabled={registerMutation.isPending} className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70">
            {registerMutation.isPending ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="font-medium text-gray-600 hover:text-gray-900">
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}
