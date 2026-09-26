import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    try {
      setIsSubmitting(true);
      await registerUser(name, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(err.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFieldErrors(mapped);
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field?: string) =>
    `w-full px-3 py-2 text-xs bg-[#0C0E11] border rounded-md text-white placeholder-[#505560] focus:outline-none focus:border-[#4F65F6] transition-colors ${
      field && fieldErrors[field] ? 'border-[#E11D48]' : 'border-[#22252B]'
    }`;

  return (
    <div className="app-auth min-h-screen flex flex-col justify-center items-center p-4">
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
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#4F65F6] text-white font-bold text-sm shadow-sm">
            A
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-xs text-[#8A909D]">Track every application with zero spreadsheet entry.</p>
        </div>

        <div className="p-6 rounded-xl bg-[#121418] border border-[#242830] border-t-[#343944] shadow-xl space-y-4">
          {error && (
            <div className="p-3 bg-[#241418] border border-[#401C24] rounded-lg text-xs text-[#F87171]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#C7CBD2]">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className={inputClass()}
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#C7CBD2]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className={inputClass('email')}
              />
              {fieldErrors.email && <p className="text-[11px] text-[#F87171]">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#C7CBD2]">Password (8+ chars)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass('password')} pr-9`}
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
              {fieldErrors.password && <p className="text-[11px] text-[#F87171]">{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#C7CBD2]">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass('confirmPassword')} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#636B78] hover:text-[#9CA3AF]"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-[#F87171]">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
            >
              <span>{isSubmitting ? 'Creating account...' : 'Create free account'}</span>
              <ArrowRight size={13} />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-[#8A909D] border-t border-[#1C1F25]">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
