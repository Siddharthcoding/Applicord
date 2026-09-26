import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-auth min-h-screen flex flex-col justify-center items-center p-4">
      {/* Top back navigation */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8A909D] hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Landing Page</span>
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-5">
        {/* Brand */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#4F65F6] text-white font-bold text-sm shadow-sm">
            A
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Sign in to Applicord</h1>
          <p className="text-xs text-[#8A909D]">Your application timeline, synchronized.</p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-xl bg-[#121418] border border-[#242830] border-t-[#343944] shadow-xl space-y-4">

          {error && (
            <div className="p-3 bg-[#241418] border border-[#401C24] rounded-lg text-xs text-[#F87171]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#C7CBD2]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-xs bg-[#0C0E11] border border-[#22252B] rounded-md text-white placeholder-[#505560] focus:outline-none focus:border-[#4F65F6] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#C7CBD2]">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#4F65F6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-[#0C0E11] border border-[#22252B] rounded-md text-white placeholder-[#505560] focus:outline-none focus:border-[#4F65F6] pr-9 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#636B78] hover:text-[#9CA3AF]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight size={13} />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-[#8A909D] border-t border-[#1C1F25]">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:underline font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
