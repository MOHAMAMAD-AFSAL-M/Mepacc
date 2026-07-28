import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  CheckCircle2,
  Circle,
  Map,
  ArrowRight,
  Info,
  Ruler,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';

/**
 * SupervisorHome — Dashboard for Supervisor role.
 * Uses the exact same interactive Clock-In button logic, styling, and helper notes as Foreman.
 */

const TODAY_SITES = [
  {
    id: 'site_01',
    name: 'M M TOWER',
    badge: 'New Project',
    visited: true,
  },
  {
    id: 'site_02',
    name: 'Sharma Complex',
    badge: null,
    visited: false,
  },
  {
    id: 'site_03',
    name: 'Patel Villa',
    badge: null,
    visited: false,
  },
];

export default function SupervisorHome() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const holdTimerRef = useRef(null);

  // Hold-to-clock logic (exact match to Foreman)
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

  // Derive clock button label (exact match to Foreman)
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
            Hi, {user?.name || 'Supervisor'}
          </h1>
          <p className="text-sm text-text-secondary">Supervisor</p>
        </div>
        <button className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-primary" />
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32">

        {/* ── Section 1: Personal Clock-In Widget (Matching Foreman) ────── */}
        <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
          <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

          <div className="flex flex-col gap-6 p-[17px] relative z-10">
            {/* Time + Status row */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[28px] font-semibold font-heading text-text-primary tracking-tight leading-tight">
                  08:00 AM
                </span>
                <span className="text-sm text-text-secondary">
                  Sat, Jul 18
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#dce9ff] rounded-full">
                <div className="w-[13px] h-[13px] rounded-full border-2 border-primary-dark flex items-center justify-center">
                  <div className="w-[5px] h-[5px] rounded-full bg-primary-dark" />
                </div>
                <span className="text-xs font-semibold text-text-primary tracking-wide">
                  At M M TOWER
                </span>
              </div>
            </div>

            {/* Hold-to-Clock Button (Matching Foreman styling & colors) */}
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

            {/* Helper notes (Matching Foreman) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-text-muted mt-0.5 shrink-0" />
                <span className="text-sm text-text-secondary">
                  Must be within 100m of M M TOWER.
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

        {/* ── Section 2: Today's Sites ───────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-heading text-text-primary">
              Today's Sites
            </h2>
            <span className="text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-sm uppercase">
              {TODAY_SITES.length} TOTAL
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {TODAY_SITES.map((site) => (
              <Card
                key={site.id}
                padding="none"
                className="flex items-center justify-between p-4 border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-heading text-text-primary">
                      {site.name}
                    </h3>
                    {site.badge && (
                      <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">
                        {site.badge}
                      </span>
                    )}
                  </div>

                  {site.visited ? (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      <span className="text-xs font-semibold">Visited</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-text-muted">
                      <Circle size={16} strokeWidth={1.5} />
                      <span className="text-xs font-semibold">Not Visited</span>
                    </div>
                  )}
                </div>

                <button className="w-10 h-10 bg-surface rounded-md border border-border flex items-center justify-center text-text-secondary hover:bg-surface-card transition-colors">
                  <Map size={18} />
                </button>
              </Card>
            ))}
          </div>

          {/* View All Projects link */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => navigate('/supervisor/projects')}
              className="text-primary font-bold text-sm flex items-center gap-2 hover:bg-primary/10 px-4 py-2 rounded-full transition-colors"
            >
              <span>View all projects</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
