import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authAPI.forgotPassword(email);
      setMessage(result.message);
      setIsSubmitted(true);
      
      // For development/testing - show the reset token
      if (result.resetToken) {
        console.log('Reset token (for testing):', result.resetToken);
        setMessage(result.message + ` (Development mode: Token is ${result.resetToken})`);
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
            
            <p className="text-gray-600 mb-6">
              {message}
            </p>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                  setMessage('');
                  setError('');
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-orange-600 hover:text-orange-500">
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white p-8 rounded-2xl shadow-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Forgot Password?</h2>
            <p className="mt-2 text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 font-medium py-2 px-4 rounded-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {loading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                )}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
                  Sign in here
                </Link>
              </p>
              
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-orange-600 hover:text-orange-500">
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
