import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { KeyRound, ArrowRight, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Please use the link from your email.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setFieldError('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(newPassword);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-[#E11D48]', 'bg-[#F59E0B]', 'bg-[#3B82F6]', 'bg-[#10B981]'];

  return (
    <div className="app-auth min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#4F65F6] text-white font-bold text-sm shadow-sm">
            A
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Set new password</h1>
          <p className="text-xs text-[#8A909D]">Choose a strong, unique password.</p>
        </div>

        <div className="p-6 rounded-xl bg-[#121418] border border-[#242830] border-t-[#343944] shadow-xl space-y-4">
          {success ? (
            <div className="text-center space-y-3 py-2">
              <div className="flex justify-center">
                <div className="p-2.5 rounded-full bg-[#13221C] border border-[#1A3828]">
                  <CheckCircle2 size={22} className="text-[#10B981]" />
                </div>
              </div>
              <h3 className="font-semibold text-sm text-white">Password updated</h3>
              <p className="text-xs text-[#9CA3AF]">You can now log in with your new credentials.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full btn-primary py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span>Go to Log In</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-[#241418] border border-[#401C24] rounded-lg text-xs text-[#F87171] space-y-1">
                  <p>{error}</p>
                  <Link to="/forgot-password" className="text-[#4F65F6] hover:underline block text-[11px]">
                    Request a new link →
                  </Link>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#C7CBD2]">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                  {newPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`flex-1 rounded-full transition-colors ${
                              bar <= strength ? strengthColors[strength] : 'bg-[#20232A]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#636B78] font-mono">
                        Strength: {strengthLabels[strength]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#C7CBD2]">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-3 py-2 text-xs bg-[#0C0E11] border rounded-md text-white placeholder-[#505560] focus:outline-none focus:border-[#4F65F6] pr-9 transition-colors ${
                        fieldError ? 'border-[#E11D48]' : 'border-[#22252B]'
                      }`}
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
                  {fieldError && <p className="text-[11px] text-[#F87171]">{fieldError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full btn-primary py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
                >
                  <span>{isSubmitting ? 'Updating...' : 'Update password'}</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            </>
          )}

          <div className="pt-2 text-center border-t border-[#1C1F25]">
            <Link to="/login" className="text-xs text-[#8A909D] hover:text-white transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
