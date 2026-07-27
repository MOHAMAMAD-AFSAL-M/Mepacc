import { useEffect, useState, useRef } from 'react';
import { Bell, Map, Clock, MapPin, Info, Ruler } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getCurrentJob } from '../../services/jobService';
import Card from '../../components/Card';

export default function TechnicianHome() {
  const user = useAuthStore((s) => s.user);
  const [job, setJob] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
      {/* Header */}
      <header className="bg-surface border-b border-border flex items-center justify-between py-4 px-6 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-medium font-heading text-text-primary">
            Hi, {user?.name || 'Technician'}
          </h1>
          <p className="text-sm text-text-secondary">Technician</p>
        </div>
        <button className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-primary" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-6 p-6 pb-32">
        {job ? (
          <>
            {/* Project Widget */}
            <Card padding="none" className="relative w-full h-[200px] overflow-hidden shrink-0 border border-border">
              <img src={job.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Site" />
              <div className="absolute inset-0 bg-black/50" />
              
              <div className="absolute inset-0 flex items-end justify-between p-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-semibold font-heading text-white tracking-tight">
                    {job.name}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center text-white/90">
                      <MapPin size={14} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm text-white/90">{job.location}</span>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-sm border-2 border-white/20 bg-transparent flex items-center justify-center overflow-hidden shrink-0 shadow-lg backdrop-blur-sm">
                  <Map size={32} className="text-white/70" strokeWidth={1.5} />
                </div>
              </div>
            </Card>

            {/* Clock-In Widget */}
            <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
              <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

              <div className="flex flex-col gap-6 p-[17px] relative z-10">
                {/* Time + Status row */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-text-secondary">{job.dateStr}</span>
                    <span className="text-2xl font-semibold font-heading text-text-primary tracking-tight">
                      {job.timeStr}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-[#dce9ff] rounded-full">
                      <div className="w-2 h-2 rounded-full bg-primary-dark" />
                      <span className="text-xs font-semibold text-text-primary tracking-wide">
                        {job.status}
                      </span>
                    </div>
                    <span className="text-sm text-text-secondary">Ready to Clock In</span>
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
                      Must be within 100m of {job.name}.
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
          </>
        ) : (
          <div className="flex justify-center py-10">
            <span className="inline-block w-6 h-6 border-2 border-border-strong border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
