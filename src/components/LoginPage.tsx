import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { formatError } from '../utils/errorFormatter';
import { validators, getPasswordStrength } from '../utils/formValidation';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  const passwordStrength = isSignUp ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailError = validators.email(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (isSignUp) {
      const passwordError = validators.password(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else {
      if (password.length < 1) {
        setError('Password is required');
        return;
      }
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(formatError(error));
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(formatError(error));
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            ClientFlow
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Internal Client Management System
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => window.location.href = '/forgot-password'}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {isSignUp && password && passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium text-${passwordStrength.color}-600`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-${passwordStrength.color}-500 h-2 rounded-full transition-all`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Internal use only
          </div>
        </div>
      </div>
    </div>
  );
}
