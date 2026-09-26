import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      const res = await apiRequest<{
        message: string;
        resetToken?: string;
        resetUrl?: string;
      }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res?.resetUrl) {
        setDevResetUrl(res.resetUrl);
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset instructions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-auth min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm mb-4 flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#8A909D] hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#4F65F6] text-white font-bold text-sm shadow-sm">
            A
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Reset password</h1>
          <p className="text-xs text-[#8A909D]">We will send recovery instructions to your email.</p>
        </div>

        <div className="p-6 rounded-xl bg-[#121418] border border-[#242830] border-t-[#343944] shadow-xl space-y-4">
          {!submitted ? (
            <>
              {error && (
                <div className="p-3 bg-[#241418] border border-[#401C24] rounded-lg text-xs text-[#F87171]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#C7CBD2]">Account Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoFocus
                    className="w-full px-3 py-2 text-xs bg-[#0C0E11] border border-[#22252B] rounded-md text-white placeholder-[#505560] focus:outline-none focus:border-[#4F65F6] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full btn-primary py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
                >
                  {isSubmitting ? 'Sending Link...' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-3 py-2">
              <div className="flex justify-center">
                <div className="p-2.5 rounded-full bg-[#13221C] border border-[#1A3828]">
                  <CheckCircle2 size={22} className="text-[#10B981]" />
                </div>
              </div>
              <h3 className="font-semibold text-sm text-white">Check your email</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                If an account exists for <span className="text-white font-medium">{email}</span>, a reset link was generated.
              </p>

              {devResetUrl && (
                <div className="p-3 bg-[#1A1813] border border-[#332A18] rounded-md text-left space-y-1 text-xs">
                  <p className="text-[10px] font-mono text-[#F59E0B] uppercase">Dev Mode Reset Link</p>
                  <a
                    href={devResetUrl}
                    className="text-[11px] text-[#4F65F6] hover:underline break-all font-mono block"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}

              <button
                onClick={() => { setSubmitted(false); setEmail(''); setDevResetUrl(null); }}
                className="text-xs text-[#4F65F6] hover:underline"
              >
                Try another email
              </button>
            </div>
          )}

          <div className="pt-2 text-center border-t border-[#1C1F25]">
            <Link
              to="/login"
              className="text-xs text-[#8A909D] hover:text-white transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
