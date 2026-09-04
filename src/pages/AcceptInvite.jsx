import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import PinInput from '../components/PinInput';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-surface-card flex items-center justify-center px-page-px py-10">
      <div className="w-full max-w-md bg-white border border-border rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">
            Welcome to MEPac
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Accept your invitation and set up your secure 6-digit PIN.
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
            <h2 className="text-lg font-bold text-emerald-800">Account Activated!</h2>
            <p className="text-xs text-text-secondary">
              Your PIN has been set successfully. Redirecting you to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1">
                Choose 6-Digit PIN
              </label>
              <PinInput
                length={6}
                value={pin}
                onChange={setPin}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1">
                Confirm 6-Digit PIN
              </label>
              <PinInput
                length={6}
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 6 || confirmPin.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light active:bg-primary-dark text-white font-semibold text-xs uppercase tracking-wider py-3 rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Activate Account &amp; Log In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
