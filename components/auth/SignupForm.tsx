import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../Icon';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccess }) => {
  const { signup, loginWithMagicLink, error, clearError, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'password' | 'magic'>('password');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const validateForm = () => {
    if (!acceptTerms) {
      return 'You must accept the terms of service and privacy policy';
    }

    if (signupMethod === 'password') {
      if (formData.password.length < 8) {
        return 'Password must be at least 8 characters long';
      }
      if (formData.password !== formData.confirmPassword) {
        return 'Passwords do not match';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      return;
    }

    try {
      if (signupMethod === 'password') {
        await signup(formData.email, formData.password, formData.name || undefined);
        onSuccess?.();
      } else {
        await loginWithMagicLink(formData.email);
        setMagicLinkSent(true);
      }
    } catch (err) {
      // Error is handled by context
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Mesh Gradient Background */}
        <div
          className="fixed inset-0 w-full h-full z-0"
          style={{
            background: `
              radial-gradient(circle at 20% 80%, #4c1d95 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #7c3aed 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, #a855f7 0%, transparent 50%),
              radial-gradient(circle at 60% 60%, #c084fc 0%, transparent 50%),
              linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7, #c084fc)
            `,
            animation: 'gradientShift 8s ease-in-out infinite alternate'
          }}
        />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
          <div className="w-full max-w-md mx-auto">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
              <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Icon icon="checkCircle" className="h-6 w-6 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-white/70 text-sm">
                  We've sent a magic link to <span className="font-medium text-white">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-white/60 text-center">
                  Click the link in your email to create your account. It may take a few minutes to arrive.
                </p>
                <button
                  onClick={() => {
                    setMagicLinkSent(false);
                    clearError();
                  }}
                  className="w-full text-purple-400 hover:text-purple-300 text-sm font-medium py-2"
                >
                  ← Back to signup
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
              transform: scale(1) rotate(0deg);
            }
            50% {
              background-position: 100% 50%;
              transform: scale(1.1) rotate(2deg);
            }
            100% {
              background-position: 0% 50%;
              transform: scale(1) rotate(0deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const validationError = validateForm();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Mesh Gradient Background */}
      <div
        className="fixed inset-0 w-full h-full z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, #4c1d95 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #7c3aed 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, #a855f7 0%, transparent 50%),
            radial-gradient(circle at 60% 60%, #c084fc 0%, transparent 50%),
            linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7, #c084fc)
          `,
          animation: 'gradientShift 8s ease-in-out infinite alternate'
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-white/10">
              <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
              <p className="text-white/70 text-sm">Start your journey with Mzon</p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              {/* Signup Method Toggle */}
              <div className="flex mb-6 bg-gray-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSignupMethod('password')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    signupMethod === 'password'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setSignupMethod('magic')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    signupMethod === 'magic'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {(error || validationError) && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error || validationError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name (optional for magic link, required for password) */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
                    Full name {signupMethod === 'password' ? '*' : '(optional)'}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={signupMethod === 'password'}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors placeholder-white/40"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors placeholder-white/40"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Password fields (only for password method) */}
                {signupMethod === 'password' && (
                  <>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors placeholder-white/40"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <Icon
                            icon={showPassword ? 'xCircle' : 'checkCircle'}
                            className="h-4 w-4 text-white/40 hover:text-white/60"
                          />
                        </button>
                      </div>
                      {formData.password && formData.password.length < 8 && (
                        <p className="mt-1 text-xs text-red-400">Password must be at least 8 characters</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-1">
                        Confirm password
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors placeholder-white/40"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <Icon
                            icon={showConfirmPassword ? 'xCircle' : 'checkCircle'}
                            className="h-4 w-4 text-white/40 hover:text-white/60"
                          />
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                      )}
                    </div>
                  </>
                )}

                {/* Terms of Service */}
                <div className="flex items-start">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="acceptTerms" className="ml-3 text-sm text-white/70">
                    I agree to the{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 font-medium">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !acceptTerms || !!validationError}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {signupMethod === 'password' ? 'Creating account...' : 'Sending link...'}
                    </>
                  ) : (
                    <>
                      {signupMethod === 'password' ? (
                        <>
                          <Icon icon="userCircle" className="w-4 h-4 mr-2" />
                          Create account
                        </>
                      ) : (
                        <>
                          <Icon icon="bolt" className="w-4 h-4 mr-2" />
                          Send magic link
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-white/60">Or</span>
                  </div>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="mt-6">
                <button
                  type="button"
                  className="w-full flex justify-center items-center py-3 px-4 border border-white/20 rounded-lg shadow-sm text-sm font-medium text-white bg-transparent hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              {/* Switch to Login */}
              <div className="mt-6 text-center">
                <span className="text-sm text-white/60">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
            transform: scale(1) rotate(0deg);
          }
          50% {
            background-position: 100% 50%;
            transform: scale(1.1) rotate(2deg);
          }
          100% {
            background-position: 0% 50%;
            transform: scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SignupForm;