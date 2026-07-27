import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import PinInput from '../components/PinInput';

/**
 * LoginPage — phone + 6-digit PIN login screen.
 * Matches the MEPac Figma design (node 3:403).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const canSubmit = phone.replace(/\D/g, '').length >= 10 && pin.length === 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const role = await login(phone, pin);
      navigate(`/${role}/home`, { replace: true });
    } catch {
      // error is already set in the store
    }
  };

  return (
    <div className="min-h-screen bg-surface-card flex items-center justify-center px-page-px">
      <div className="w-full max-w-sm">
        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-card rounded-sm border border-border shadow-card p-8"
        >
          {/* Brand */}
          <div className="text-center mb-6 pb-2">
            <h1 className="text-[30px] font-bold text-primary-dark font-heading leading-none">
              MEPacc
            </h1>
          </div>

          <div className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="bg-error/5 border border-error/20 text-error text-xs rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            {/* Mobile Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1"
              >
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Phone size={14} strokeWidth={2} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter mobile number"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-sm border border-border-strong bg-surface-card text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors duration-fast"
                />
              </div>
            </div>

            {/* 6-Digit PIN */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1">
                6-Digit PIN
              </label>
              <PinInput
                length={6}
                value={pin}
                onChange={setPin}
                error={!!error}
                disabled={isLoading}
              />
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light active:bg-primary-dark text-text-inverse font-semibold text-xs uppercase tracking-wider py-3 rounded-sm transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                ) : (
                  <>
                    Login
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Helper text */}
          <div className="mt-6 pt-4 border-t border-border-divider">
            <p className="text-center text-text-secondary text-xs leading-relaxed">
              For first-time login, please use the 6-digit PIN
              <br />
              provided by the Supervisor.
            </p>
          </div>
        </form>

        {/* Dev hint */}
        <p className="text-center text-text-muted text-xs mt-4">
          Dev: use <span className="font-mono">9876543210</span> / PIN{' '}
          <span className="font-mono">123456</span>
        </p>
      </div>
    </div>
  );
}
