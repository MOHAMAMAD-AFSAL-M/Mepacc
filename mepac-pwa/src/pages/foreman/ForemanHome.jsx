import { useState, useRef, useEffect, useCallback } from 'react';
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
  RefreshCw,
  CheckCircle2,
  Layers,
  Navigation,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex.js';
import useAuthStore from '../../store/authStore';
import { clockIn, clockOut } from '../../services/attendanceService';
import { calculateDistanceMeters, getCurrentPosition } from '../../utils/geoUtils';
import Card from '../../components/Card';
import Button from '../../components/Button';
import NotificationBellButton from '../../components/NotificationBellButton';
import { getProjectGradient } from '../../utils/colors';

/**
 * ForemanHome — main dashboard for the foreman role.
 * Displays real-time assigned project sites, interactive clock-in widget,
 * multi-site inspection switching, and RFI tracking.
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
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'checking' | 'at_location' | 'not_in_location'
  const [locationDetail, setLocationDetail] = useState('');
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiReason, setRfiReason] = useState('');
  const [rfiDescription, setRfiDescription] = useState('');
  const holdTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isNearAnySiteRef = useRef(false);
  const assignedJobsRef = useRef([]);
  const selectedJobIdRef = useRef(null);
  const isCheckingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    assignedJobsRef.current = assignedJobs;
  }, [assignedJobs]);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  // Main location check function (stable reference, no re-trigger loops)
  const checkLocationStatus = useCallback(async (manualJobsList = null, manualSelectedId = null) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const pos = await getCurrentPosition();
      const currentList = manualJobsList || assignedJobsRef.current;
      const currentId = manualSelectedId !== null ? manualSelectedId : selectedJobIdRef.current;

      let closestDist = null;
      let siteWithin700m = null;

      // Calculate distances for all assigned jobs
      const enriched = (currentList || []).map((j) => {
        let distance = null;
        if (j.latitude != null && j.longitude != null) {
          distance = calculateDistanceMeters(
            pos.latitude,
            pos.longitude,
            j.latitude,
            j.longitude
          );
          if (closestDist === null || distance < closestDist) {
            closestDist = distance;
          }
          if (distance <= 700 && !siteWithin700m) {
            siteWithin700m = { ...j, distance };
          }
        }
        return { ...j, distance };
      });

      // Update 700m proximity status for polling rate
      const isNear = closestDist !== null && closestDist <= 700;
      isNearAnySiteRef.current = isNear;

      // RULE: Only switch site/tab automatically if worker is within 700m of a site
      // If all sites are in kilometer range (> 700m), DO NOT auto-switch tabs
      if (siteWithin700m && siteWithin700m.id !== currentId) {
        setSelectedJobId(siteWithin700m.id);
        selectedJobIdRef.current = siteWithin700m.id;
        setJob(siteWithin700m);
      } else {
        // Keep current selected site
        const active = enriched.find((j) => j.id === currentId) || enriched[0] || null;
        if (active) {
          setJob(active);
        }
      }

      // Update active site status badge
      const activeJob = enriched.find((j) => j.id === (siteWithin700m ? siteWithin700m.id : currentId)) || enriched[0];
      if (activeJob) {
        const radiusLimit = activeJob.geofenceRadius || 100;
        const isEnforced = activeJob.enforceGps ?? true;
        if (activeJob.distance != null) {
          if (activeJob.distance <= radiusLimit) {
            setLocationStatus('at_location');
            setLocationDetail(`At ${activeJob.name} (${activeJob.distance}m)`);
          } else {
            setLocationStatus(isEnforced ? 'not_in_location' : 'at_location');
            setLocationDetail(
              isEnforced
                ? activeJob.distance < 1000 ? `${activeJob.distance}m from site` : `${(activeJob.distance / 1000).toFixed(1)}km from site`
                : `Advisory: ${activeJob.distance}m away`
            );
          }
        } else {
          setLocationStatus('at_location');
          setLocationDetail(`GPS Active (At ${activeJob.name || 'Site'})`);
        }
      } else {
        setLocationStatus('at_location');
        setLocationDetail('GPS Active');
      }

      setAssignedJobs(enriched);
      assignedJobsRef.current = enriched;
    } catch (err) {
      console.warn('Geo check notice:', err.message);
      setLocationStatus('not_in_location');
      setLocationDetail(err.message || 'GPS location unavailable');
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Adaptive background polling timer:
  // - When <= 700m: checks every 15s
  // - When > 700m: checks every 3 minutes (180,000ms)
  // - Pauses when tab is hidden
  useEffect(() => {
    let isMounted = true;

    const runPollLoop = async () => {
      clearTimeout(pollTimerRef.current);
      if (!isMounted || document.hidden || assignedJobsRef.current.length === 0) return;

      const intervalMs = isNearAnySiteRef.current ? 15000 : 180000;

      pollTimerRef.current = setTimeout(async () => {
        if (isMounted && !document.hidden && assignedJobsRef.current.length > 0) {
          await checkLocationStatus();
          runPollLoop();
        }
      }, intervalMs);
    };

    if (assignedJobs.length > 0) {
      runPollLoop();
    }

    return () => {
      isMounted = false;
      clearTimeout(pollTimerRef.current);
    };
  }, [assignedJobs.length, checkLocationStatus]);

  // Pause when tab is hidden, trigger check once when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && assignedJobsRef.current.length > 0) {
        checkLocationStatus();
      } else {
        clearTimeout(pollTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkLocationStatus]);

  // Real-time reactive queries connected to Convex backend
  const rawAssignedProjects = useQuery(
    api.projects.getSupervisorProjects,
    user?.id ? { workerId: user.id } : 'skip'
  );
  const rawActiveJob = useQuery(
    api.projects.getActiveJobForWorker,
    user?.id ? { workerId: user.id } : 'skip'
  );
  const rawTodayStatus = useQuery(
    api.attendance.getTodayStatus,
    user?.id ? { workerId: user.id } : 'skip'
  );

  // Sync assigned jobs reactively whenever admin assigns or deassigns
  useEffect(() => {
    if (rawAssignedProjects === undefined && rawActiveJob === undefined) return;
    setLoading(false);

    let jobsList = [];
    if (Array.isArray(rawAssignedProjects)) {
      jobsList = rawAssignedProjects.filter((p) => p.isAssignedToMe && !p.isCompleted);
    }
    if (jobsList.length === 0 && rawActiveJob) {
      jobsList = [rawActiveJob];
    }

    setAssignedJobs(jobsList);

    const currentSelectedId = selectedJobIdRef.current;
    const initialSelected = jobsList.find((j) => j.id === currentSelectedId) || jobsList[0] || null;
    setJob(initialSelected);
    setSelectedJobId(initialSelected?.id || null);

    if (jobsList.length > 0) {
      checkLocationStatus(jobsList, initialSelected?.id);
    }
  }, [rawAssignedProjects, rawActiveJob, checkLocationStatus]);

  // Sync clock in status
  useEffect(() => {
    if (rawTodayStatus !== undefined && rawTodayStatus !== null) {
      setIsClockedIn(Boolean(rawTodayStatus.isClockedIn));
    }
  }, [rawTodayStatus]);

  // Open Google Maps URL for active site
  const handleOpenMap = (e) => {
    if (e) e.stopPropagation();
    if (!job) return;
    let mapsUrl;
    if (job.latitude != null && job.longitude != null) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${job.latitude},${job.longitude}`;
    } else {
      const query = encodeURIComponent(`${job.name} ${job.location || ''}`.trim());
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Derive active site and geofence state
  const isAtSite = Boolean(
    job && (
      job.enforceGps === false ||
      job.latitude == null ||
      job.longitude == null ||
      (job.distance != null && job.distance <= (job.geofenceRadius || 100))
    )
  );
  const canClockIn = isClockedIn || isAtSite || (job?.enforceGps === false) || (job?.latitude == null);

  // ── Hold-to-Clock logic ─────────────────────────────────────────
  const startHold = () => {
    if (isTransitioning) return;
    if (!canClockIn && !isClockedIn) {
      // Trigger instant location re-check and display advisory
      checkLocationStatus();
      if (job?.distance != null) {
        setGeoError(`Location Restricted: You are currently ${job.distance < 1000 ? `${job.distance}m` : `${(job.distance / 1000).toFixed(1)}km`} away from ${job.name}. You must be within ${job.geofenceRadius || 100}m to clock in.`);
      } else {
        setGeoError(`Location Restricted: Please verify your GPS location to enable clock-in.`);
      }
      return;
    }
    if (job?.allowSelfClockIn === false && !isClockedIn) {
      setGeoError('Self clock-in is disabled by administrator settings. Please contact your supervisor.');
      return;
    }
    setGeoError('');
    setProgressWidth(0);
    requestAnimationFrame(() => setProgressWidth(100));

    holdTimerRef.current = setTimeout(async () => {
      if (isClockedIn) {
        await completeClockOut();
      } else {
        await completeClockIn();
      }
    }, 2000);
  };

  const cancelHold = () => {
    if (isTransitioning) return;
    clearTimeout(holdTimerRef.current);
    setProgressWidth(0);
  };

  const completeClockIn = async () => {
    if (job?.allowSelfClockIn === false) {
      setGeoError('Self clock-in is disabled by administrator settings. Please contact your supervisor.');
      return;
    }
    setIsTransitioning(true);
    setGeoError('');
    try {
      const radiusLimit = job?.geofenceRadius || 100;
      const isEnforced = job?.enforceGps ?? true;

      if (job?.latitude != null && job?.longitude != null) {
        try {
          const pos = await getCurrentPosition();
          const dist = calculateDistanceMeters(
            pos.latitude,
            pos.longitude,
            job.latitude,
            job.longitude
          );
          if (isEnforced && dist > radiusLimit) {
            setLocationStatus('not_in_location');
            setLocationDetail(`Not in Location (${dist}m away)`);
            setGeoError(`Location Alert: You are ${dist}m away from ${job.name}. Admin policy requires you to be within ${radiusLimit}m to clock in.`);
            setIsTransitioning(false);
            setProgressWidth(0);
            return;
          } else {
            setLocationStatus('at_location');
            setLocationDetail(`At ${job.name}`);
          }
        } catch (geoErr) {
          console.warn('Geolocation notice:', geoErr.message);
        }
      }

      if (user?.id) {
        await clockIn(user.id, job?.id);
      }
      setIsClockedIn(true);
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err) {
      console.error('Clock-in failed:', err);
      setGeoError(err.message || 'Clock-in failed');
    } finally {
      setProgressWidth(0);
      setTimeout(() => setIsTransitioning(false), 1000);
      loadJobsData();
    }
  };

  const completeClockOut = async () => {
    setIsTransitioning(true);
    setGeoError('');
    try {
      if (user?.id) {
        await clockOut(user.id);
      }
      setIsClockedIn(false);
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err) {
      console.error('Clock-out failed:', err);
      setGeoError(err.message || 'Clock-out failed');
    } finally {
      setProgressWidth(0);
      setTimeout(() => setIsTransitioning(false), 1000);
      loadJobsData();
    }
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
      if (isTransitioning) return 'Clocked Out';
      return 'Hold to Clock Out';
    }
    if (isTransitioning) return 'Clocked In';
    if (canClockIn) {
      if (progressWidth > 0) return 'Keep holding to Clock In';
      return 'Hold to Clock In (Site Verified)';
    }
    if (locationStatus === 'checking') return 'Verifying Location...';
    if (job?.distance != null) {
      return `Outside Site (${job.distance < 1000 ? `${job.distance}m` : `${(job.distance / 1000).toFixed(1)}km`} away) — Tap to Verify`;
    }
    return 'Tap to Verify Site Location';
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-medium font-heading text-text-primary">
            Hi, {user?.name || 'Foreman'}
          </h1>
          <p className="text-sm text-text-secondary">{user?.workerCode ? `${user.workerCode} • ` : ''}Foreman</p>
        </div>
        <NotificationBellButton />
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-5 p-4 sm:p-6 pb-32 max-w-4xl mx-auto w-full">

        {/* ── Section 1: Project Hero Card ───────────────────── */}
        {job ? (
          <>
          {/* Multi-Site Selector (when foreman is assigned to multiple project sites) */}
          {assignedJobs.length > 1 && (
            <div className="flex flex-col gap-1.5 bg-surface-card p-3 rounded-lg border border-border shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  <span>Your Assigned Project Sites ({assignedJobs.length}):</span>
                </span>
                <span className="text-[11px] text-text-muted">Tap to switch active site</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-0.5">
                {assignedJobs.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => {
                      setSelectedJobId(site.id);
                      setJob(site);
                      if (site.distance != null) {
                        if (site.distance <= (site.geofenceRadius || 100)) {
                          setLocationStatus('at_location');
                          setLocationDetail(`At ${site.name} (${site.distance}m away)`);
                        } else {
                          setLocationStatus(site.enforceGps ? 'not_in_location' : 'at_location');
                          setLocationDetail(`${site.distance}m away from ${site.name}`);
                        }
                      }
                    }}
                    className={[
                      'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
                      job.id === site.id
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface text-text-secondary border-border hover:text-text-primary',
                    ].join(' ')}
                  >
                    <span>{site.name}</span>
                    {site.distance != null && (
                      <span className={[
                        'text-[10px] px-1.5 py-0.2 rounded-full',
                        job.id === site.id
                          ? 'bg-white/20 text-white'
                          : site.distance <= (site.geofenceRadius || 100) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      ].join(' ')}>
                        {site.distance < 1000 ? `${site.distance}m` : `${(site.distance / 1000).toFixed(1)}km`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Card
            padding="none"
            className="relative w-full min-h-[192px] overflow-hidden shrink-0 border border-border cursor-pointer active:scale-[0.98] transition-transform shadow-md"
            style={{
              background: getProjectGradient(job.id || job._id),
            }}
          >
            {job.imageUrl && (
              <img
                src={job.imageUrl}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                alt="Construction site"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
                  CURRENT SITE
                </span>
                <h2 className="text-xl font-bold font-heading text-white leading-tight">
                  {job.name}
                </h2>
                <div
                  onClick={handleOpenMap}
                  className="flex items-center gap-1 text-white/80 cursor-pointer hover:underline group"
                  title="View site on Google Maps"
                >
                  <MapPin size={12} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs">{job.location}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenMap}
                title="View on Google Maps"
                aria-label="View on Google Maps"
                className="w-10 h-10 rounded-sm bg-white/10 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white cursor-pointer transition-all shadow-md group"
              >
                <Map size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </Card>

          {/* ── Section 2: Clock-In Widget ──────────────────────── */}
          <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
            <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

            <div className="flex flex-col gap-5 p-4 sm:p-5 relative z-10">
              {/* Time + Status row */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-sm text-text-secondary">{job.dateStr}</span>
                  <span className="text-2xl font-semibold font-heading text-text-primary tracking-tight">
                    {job.timeStr}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isClockedIn ? 'bg-emerald-100' : 'bg-[#dce9ff]'}`}>
                    <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-600 animate-pulse' : 'bg-primary-dark'}`} />
                    <span className={`text-xs font-semibold tracking-wide ${isClockedIn ? 'text-emerald-800' : 'text-text-primary'}`}>
                      {isClockedIn ? 'Clocked In' : job.status}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {isClockedIn ? 'Shift Active' : 'Ready to Clock In'}
                  </span>
                </div>
              </div>

                {/* Location Status Pre-Check Badge */}
                <div className="flex items-center justify-between p-3 rounded-md border bg-surface border-border text-xs font-semibold gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {locationStatus === 'at_location' ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>At {job.name}</span>
                      </div>
                    ) : locationStatus === 'not_in_location' ? (
                      <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span>Not at Site</span>
                      </div>
                    ) : locationStatus === 'checking' ? (
                      <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
                        <RefreshCw size={12} className="animate-spin text-blue-600 shrink-0" />
                        <span>Verifying GPS...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <MapPin size={13} className="text-text-muted shrink-0" />
                        <span>Location Unverified</span>
                      </div>
                    )}
                    {locationDetail && locationStatus === 'not_in_location' && (
                      <span className="text-[11px] text-text-muted truncate">{locationDetail}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => checkLocationStatus(assignedJobs, job.id)}
                    disabled={locationStatus === 'checking'}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    <RefreshCw size={12} className={locationStatus === 'checking' ? 'animate-spin' : ''} />
                    <span>Verify</span>
                  </button>
                </div>

                {geoError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{geoError}</span>
                  </div>
                )}

              {/* Hold-to-Clock Button (with distinct locked/unlocked visual separation) */}
              <button
                className={[
                  'relative w-full h-14 rounded-md overflow-hidden text-base font-semibold',
                  'flex justify-center items-center select-none touch-none',
                  'transition-all duration-default',
                  isClockedIn
                    ? 'bg-error hover:bg-red-700 text-white shadow-md active:scale-95 cursor-pointer'
                    : canClockIn
                    ? 'bg-primary-dark hover:bg-primary text-white shadow-md active:scale-95 cursor-pointer'
                    : 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-700 hover:bg-slate-200 cursor-pointer',
                ].join(' ')}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onClick={() => {
                  if (!canClockIn && !isClockedIn) {
                    checkLocationStatus();
                  }
                }}
              >
                {/* Progress overlay */}
                {canClockIn && (
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                    style={{
                      width: `${progressWidth}%`,
                      transition: progressWidth === 100 ? 'width 2s linear' : 'none',
                    }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2 pointer-events-none px-4 text-center">
                  {isClockedIn ? (
                    <Clock size={20} strokeWidth={2} className="shrink-0" />
                  ) : canClockIn ? (
                    <CheckCircle2 size={20} strokeWidth={2} className="text-emerald-300 shrink-0" />
                  ) : (
                    <MapPin size={18} strokeWidth={2} className="text-slate-500 shrink-0" />
                  )}
                  <span className="font-medium font-heading text-sm sm:text-base leading-tight truncate">
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
        ) : loading ? (
          <div className="flex justify-center py-10">
            <span className="inline-block w-6 h-6 border-2 border-border-strong border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-8 text-center gap-3 border border-border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold font-heading text-text-primary">No Project Assigned</h3>
            <p className="text-sm text-text-secondary max-w-xs">
              You are currently not assigned to any active project site. Please ask your administrator to assign you in the Admin Panel.
            </p>
          </Card>
        )}

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
