import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Receipt, Phone, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { cn } from '@/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode] = useState('+1');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.requestOTP(phoneNumber, countryCode);
      setStep('otp');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(phoneNumber, otp, countryCode);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-surface-900">
            Split<span className="text-primary-600">wise</span>
          </h1>
          <p className="text-surface-500 mt-2">Split bills easily with friends</p>
        </div>

        {/* Card */}
        <div className="card p-8 animate-slide-up">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOTP}>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-surface-900">Enter your phone</h2>
                <p className="text-sm text-surface-500 mt-1">
                  We'll send you a verification code
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="w-20 px-4 py-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 text-center font-medium">
                      {countryCode}
                    </div>
                    <input
                      type="tel"
                      value={formatPhoneInput(phoneNumber)}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="(555) 123-4567"
                      className="input flex-1"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={phoneNumber.length < 10 || isLoading}
                  className={cn(
                    'btn-primary w-full',
                    isLoading && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-surface-900">Enter verification code</h2>
                <p className="text-sm text-surface-500 mt-1">
                  Sent to {countryCode} {formatPhoneInput(phoneNumber)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">6-digit code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={otp.length !== 6 || isLoading}
                  className={cn(
                    'btn-primary w-full',
                    isLoading && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="btn-ghost w-full"
                >
                  Use a different number
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-surface-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
