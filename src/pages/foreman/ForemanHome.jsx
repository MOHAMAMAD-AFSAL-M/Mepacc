import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  MapPin,
  Map,
  Clock,
  Info,
  Ruler,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getCurrentJob } from '../../services/jobService';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * ForemanHome — main dashboard for the foreman role.
 * Matches Figma frame "Foreman Home - Functional Interactive Clock-In" (node 3:667).
 *
 * Sections:
 *   1. Header — greeting + role + notification bell
 *   2. Project Hero Card — site image, "CURRENT SITE" label, project name, location
 *   3. Clock-In Widget — time, date, "At Location" badge, hold-to-clock-in button, helper notes
 *   4. RFI Widget — "Active RFIs" heading, RFI items, "Raise Issue" button + modal
 */

// ── Mock RFI Data ────────────────────────────────────────────────
const mockRfis = [
  {
    id: 'RFI-04',
    title: 'Conduit clash on Floor 2',
    priority: 'HIGH',
    status: 'Open',
  },
];

export default function ForemanHome() {
  const user = useAuthStore((s) => s.user);
  const [job, setJob] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiReason, setRfiReason] = useState('');
  const [rfiDescription, setRfiDescription] = useState('');
  const holdTimerRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      getCurrentJob(user.id).then(setJob);
    }
  }, [user]);

  // ── Hold-to-Clock logic ─────────────────────────────────────────
  const startHold = () => {
    if (isTransitioning) return;
    setProgressWidth(0);
    requestAnimationFrame(() => setProgressWidth(100));

    holdTimerRef.current = setTimeout(() => {
      if (isClockedIn) {
        completeClockOut();
      } else {
        completeClockIn();
      }
    }, 2000);
  };

  const cancelHold = () => {
    if (isTransitioning) return;
    clearTimeout(holdTimerRef.current);
    setProgressWidth(0);
  };

  const completeClockIn = () => {
    setIsTransitioning(true);
    setIsClockedIn(true);
    if (navigator.vibrate) navigator.vibrate(200);
    setProgressWidth(0);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  const completeClockOut = () => {
    setIsTransitioning(true);
    setIsClockedIn(false);
    if (navigator.vibrate) navigator.vibrate(200);
    setProgressWidth(0);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  // Prevent context menu on long press (mobile)
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  const handleSubmitRfi = () => {
    console.log('Submitting RFI:', { reason: rfiReason, description: rfiDescription });
    setRfiReason('');
    setRfiDescription('');
    setShowRfiModal(false);
  };

  // Derive clock button label
  const getClockLabel = () => {
    if (isClockedIn) {
      if (progressWidth > 0 && !isTransitioning) return 'Keep holding to Clock Out';
      if (isTransitioning) return 'Clocked Out ✓';
      return 'Clock Out';
    }
    if (progressWidth > 0 && !isTransitioning) return 'Keep holding…';
    if (isTransitioning) return 'Clocked In ✓';
    return 'Clock In';
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-medium font-heading text-text-primary">
            Hi, {user?.name || 'Foreman'}
          </h1>
          <p className="text-sm text-text-secondary">Foreman</p>
        </div>
        <button className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-primary" />
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32">

        {/* ── Section 1: Project Hero Card ───────────────────── */}
        {job ? (
          <Card
            padding="none"
            className="relative w-full min-h-[192px] overflow-hidden shrink-0 border border-border cursor-pointer active:scale-[0.98] transition-transform"
          >
            <img
              src={job.imageUrl}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Construction site"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                  CURRENT SITE
                </span>
                <h2 className="text-2xl font-semibold font-heading text-white tracking-tight">
                  {job.name}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-white/80" strokeWidth={2.5} />
                  <span className="text-sm text-white/80">{job.location}</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-sm border-2 border-white/20 bg-transparent flex items-center justify-center overflow-hidden shrink-0 shadow-lg backdrop-blur-sm">
                <Map size={28} className="text-white/70" strokeWidth={1.5} />
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex justify-center py-10">
            <span className="inline-block w-6 h-6 border-2 border-border-strong border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* ── Section 2: Personal Clock-In Widget ────────────── */}
        <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
          {/* Shadow overlay element for depth */}
          <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

          <div className="flex flex-col gap-6 p-[17px] relative z-10">
            {/* Time + Status row */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[28px] font-semibold font-heading text-text-primary tracking-tight leading-tight">
                  {job?.timeStr || '08:00 AM'}
                </span>
                <span className="text-sm text-text-secondary">
                  {job?.dateStr || 'Mon, 12 Jul'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#dce9ff] rounded-full">
                <div className="w-[13px] h-[13px] rounded-full border-2 border-primary-dark flex items-center justify-center">
                  <div className="w-[5px] h-[5px] rounded-full bg-primary-dark" />
                </div>
                <span className="text-xs font-semibold text-text-primary tracking-wide">
                  {job?.status || 'At Location'}
                </span>
              </div>
            </div>

            {/* Hold-to-Clock Button */}
            <button
              className={[
                'relative w-full h-14 rounded-md overflow-hidden text-white text-base',
                'flex justify-center items-center shadow-md select-none touch-none',
                'transition-colors duration-default',
                isClockedIn ? 'bg-error' : 'bg-primary-dark',
              ].join(' ')}
              onTouchStart={(e) => { e.preventDefault(); startHold(); }}
              onTouchEnd={(e) => { e.preventDefault(); cancelHold(); }}
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
            >
              {/* Progress overlay */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                style={{
                  width: `${progressWidth}%`,
                  transition: progressWidth === 100 ? 'width 2s linear' : 'none',
                }}
              />
              <div className="relative z-10 flex items-center gap-2 pointer-events-none">
                <Clock size={20} strokeWidth={2} />
                <span className="font-medium font-heading text-lg">
                  {getClockLabel()}
                </span>
              </div>
            </button>

            {/* Helper notes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-text-muted mt-0.5 shrink-0" />
                <span className="text-sm text-text-secondary">
                  Must be within 100m of {job?.name || 'site'}.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Ruler size={14} className="text-text-muted mt-0.5 shrink-0" />
                <span className="text-sm text-text-secondary">
                  Late flag applies after 08:30 AM.
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Section 3: Site Issues / RFIs Widget ───────────── */}
        <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
          <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

          <div className="flex flex-col gap-4 p-[17px] relative z-10">
            {/* Heading */}
            <h3 className="text-lg font-semibold font-heading text-text-primary border-b border-border pb-2">
              Active RFIs
            </h3>

            {/* RFI List */}
            <div className="flex flex-col gap-3">
              {mockRfis.map((rfi) => (
                <div
                  key={rfi.id}
                  className="flex items-start gap-3 p-3 rounded-sm border border-border bg-surface hover:bg-surface/80 transition-colors cursor-pointer"
                >
                  {/* Icon */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-error" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-secondary tracking-wider">
                        {rfi.id}
                      </span>
                      <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                        {rfi.priority}
                      </span>
                    </div>
                    <span className="text-sm text-text-primary line-clamp-2">
                      {rfi.title}
                    </span>
                  </div>
                </div>
              ))}

              {mockRfis.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  No active RFIs
                </p>
              )}
            </div>

            {/* Raise Issue Button */}
            <button
              onClick={() => setShowRfiModal(true)}
              className={[
                'w-full py-2.5 rounded-sm border-2 border-border-strong',
                'text-text-secondary text-sm font-semibold',
                'hover:bg-surface hover:text-text-primary hover:border-primary/40',
                'transition-colors duration-fast',
                'flex justify-center items-center gap-2',
              ].join(' ')}
            >
              <Plus size={16} />
              Raise Issue
            </button>
          </div>
        </Card>
      </div>

      {/* ── RFI Modal ───────────────────────────────────────── */}
      {showRfiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRfiModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-surface-card rounded-md shadow-lg w-full max-w-[358px] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold font-heading text-text-primary">
                Raise New Issue
              </h2>
              <button
                onClick={() => setShowRfiModal(false)}
                className="p-1 rounded-full hover:bg-surface transition-colors"
                aria-label="Close modal"
              >
                <X size={18} className="text-text-muted" />
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-5">
              {/* Field 1: Main Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Main Reason
                </label>
                <input
                  type="text"
                  value={rfiReason}
                  onChange={(e) => setRfiReason(e.target.value)}
                  placeholder="e.g., Material shortage, Drawing clash"
                  className={[
                    'w-full px-4 py-3 text-sm rounded-sm border border-border bg-surface-card',
                    'text-text-primary placeholder:text-text-muted font-sans',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'transition-colors duration-fast',
                  ].join(' ')}
                />
              </div>

              {/* Field 2: Explanation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Explanation
                  </label>
                  <span className="text-xs text-text-muted">
                    {rfiDescription.length}/500
                  </span>
                </div>
                <textarea
                  value={rfiDescription}
                  onChange={(e) => setRfiDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Describe the issue in detail for the engineering team..."
                  className={[
                    'w-full px-4 py-3 text-sm rounded-sm border border-border bg-surface-card',
                    'text-text-primary placeholder:text-text-muted font-sans resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'transition-colors duration-fast',
                  ].join(' ')}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => setShowRfiModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-[2]"
                  onClick={handleSubmitRfi}
                  disabled={!rfiReason.trim()}
                >
                  Submit Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
