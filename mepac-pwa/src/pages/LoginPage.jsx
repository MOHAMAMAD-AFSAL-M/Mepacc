import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ShieldAlert, Smartphone, RefreshCw, X } from 'lucide-react';
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
  const [sessionPrompt, setSessionPrompt] = useState(null);
  const [isOverriding, setIsOverriding] = useState(false);

  const canSubmit = phone.trim().length >= 3 && pin.length === 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const res = await login(phone.trim(), pin, false);
      if (res?.hasActiveSession) {
        setSessionPrompt(res);
        return;
      }
      if (res?.role) {
        navigate(`/${res.role}/home`, { replace: true });
      }
    } catch {
      // error is already set in the store
    }
  };

  const handleConfirmOverride = async () => {
    setIsOverriding(true);
    clearError();
    try {
      const res = await login(phone.trim(), pin, true);
      if (res?.role) {
        setSessionPrompt(null);
        navigate(`/${res.role}/home`, { replace: true });
      }
    } catch {
      // error is set in store
    } finally {
      setIsOverriding(false);
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
              MEPac
            </h1>
          </div>

          <div className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="bg-error/5 border border-error/20 text-error text-xs rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            {/* Worker ID / Mobile Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1"
              >
                Worker ID or Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Smartphone size={14} strokeWidth={2} />
                </div>
                <input
                  id="phone"
                  type="text"
                  autoCapitalize="characters"
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. DES-001 or 9876543210"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-sm border border-border-strong bg-surface-card text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors duration-fast font-medium"
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
              provided by your Company Administrator.
            </p>
          </div>
        </form>

        {/* ── Active Session Conflict Confirmation Modal ── */}
        {sessionPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-surface-card border border-border rounded-lg shadow-2xl p-5 flex flex-col gap-4 text-center animate-scale-up">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
                  <Smartphone size={28} strokeWidth={2} />
                </div>
                <h2 className="text-lg font-bold font-heading text-text-primary">
                  Active Session Ongoing
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Your account is already signed in on <strong className="text-text-primary">{sessionPrompt.existingDeviceName || 'another device / tab'}</strong>.
                </p>
              </div>

              <div className="p-3 bg-surface border border-border rounded-md text-left flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary block">Single Session Policy</span>
                  Would you like to cancel the ongoing session and issue a fresh session on this device?
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmOverride}
                  disabled={isOverriding}
                  className="w-full py-3 px-4 rounded-md bg-primary hover:bg-primary-dark text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isOverriding ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Issuing Fresh Session...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span>Override & Start Fresh Session</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSessionPrompt(null)}
                  disabled={isOverriding}
                  className="w-full py-2.5 px-4 rounded-md border border-border bg-surface hover:bg-surface-card text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
