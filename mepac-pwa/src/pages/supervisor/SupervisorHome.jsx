import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  CheckCircle2,
  Circle,
  MapPin,
  Map,
  ArrowRight,
  Info,
  Ruler,
  ExternalLink,
  Building2,
  Navigation,
  AlertTriangle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getSupervisorProjects, getCurrentJob } from '../../services/jobService';
import { clockIn, clockOut, getTodayStatus } from '../../services/attendanceService';
import { calculateDistanceMeters, getCurrentPosition } from '../../utils/geoUtils';
import Card from '../../components/Card';
import NotificationBellButton from '../../components/NotificationBellButton';
import { getProjectGradient, getProjectColor } from '../../utils/colors';

/**
 * SupervisorHome — Dashboard for Supervisor role.
 * Displays real-time active project sites with live GPS location tracking,
 * site distance calculation, geofenced clock-in, and inspection logs.
 */
export default function SupervisorHome() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [activeSites, setActiveSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [currentJob, setCurrentJob] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  // GPS & Location tracking state
  const [userPos, setUserPos] = useState(null);
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking' | 'at_location' | 'not_in_location' | 'no_gps'
  const [locationDetail, setLocationDetail] = useState('Checking GPS location...');
  const [geoError, setGeoError] = useState('');

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState(null);
  const [progressWidth, setProgressWidth] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const holdTimerRef = useRef(null);

  // Current time & date
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  });

  const [currentDateStr, setCurrentDateStr] = useState(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  });

  // Update clock every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setCurrentDateStr(
        new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Adaptive Location Polling (700m threshold: 15s when near site, 3 min when far away, pauses when screen off)
  const pollTimerRef = useRef(null);
  const isNearAnySiteRef = useRef(false);
  const activeSitesRef = useRef([]);
  const selectedSiteIdRef = useRef(null);
  const isCheckingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    activeSitesRef.current = activeSites;
  }, [activeSites]);

  useEffect(() => {
    selectedSiteIdRef.current = selectedSiteId;
  }, [selectedSiteId]);

  // Main location check function (stable reference, no re-trigger loops)
  const refreshLocation = useCallback(async (manualSitesList = null, manualSelectedId = null) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setLocationStatus((prev) => (prev === 'at_location' ? prev : 'checking'));
    setGeoError('');

    try {
      const pos = await getCurrentPosition();
      setUserPos(pos);

      const currentList = manualSitesList || activeSitesRef.current;
      const currentId = manualSelectedId !== null ? manualSelectedId : selectedSiteIdRef.current;

      let closestDistance = null;
      let siteWithin700m = null;

      // Compute distances for all active sites
      const enrichedSites = (currentList || []).map((site) => {
        let distance = null;
        if (site.latitude != null && site.longitude != null) {
          distance = calculateDistanceMeters(
            pos.latitude,
            pos.longitude,
            site.latitude,
            site.longitude
          );
          if (closestDistance === null || distance < closestDistance) {
            closestDistance = distance;
          }
          if (distance <= 700 && !siteWithin700m) {
            siteWithin700m = { ...site, distance };
          }
        }
        return {
          ...site,
          distance,
        };
      });

      // Update near-site state (700m threshold)
      const isNear = closestDistance !== null && closestDistance <= 700;
      isNearAnySiteRef.current = isNear;

      // RULE: Only switch site/tab automatically if supervisor is within 700m of a site
      // If all sites are in kilometer range (> 700m), DO NOT auto-switch tabs
      if (siteWithin700m && siteWithin700m.id !== currentId) {
        setSelectedSiteId(siteWithin700m.id);
        selectedSiteIdRef.current = siteWithin700m.id;
      } else if (!currentId && enrichedSites.length > 0) {
        setSelectedSiteId(enrichedSites[0].id);
        selectedSiteIdRef.current = enrichedSites[0].id;
      }

      // Sort sites by proximity if distance is available
      enrichedSites.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });

      setActiveSites(enrichedSites);
      activeSitesRef.current = enrichedSites;

      const activeSiteId = siteWithin700m ? siteWithin700m.id : currentId;
      const activeSite = enrichedSites.find((s) => s.id === activeSiteId) || enrichedSites[0];
      if (activeSite) {
        if (activeSite.distance != null) {
          if (activeSite.distance <= 100) {
            setLocationStatus('at_location');
            setLocationDetail(`At ${activeSite.name} (${activeSite.distance}m away)`);
          } else {
            setLocationStatus('not_in_location');
            setLocationDetail(
              activeSite.distance < 1000
                ? `${activeSite.distance}m away from ${activeSite.name}`
                : `${(activeSite.distance / 1000).toFixed(1)}km away from ${activeSite.name}`
            );
          }
        } else {
          setLocationStatus('at_location');
          setLocationDetail(`GPS Active (At ${activeSite.name})`);
        }
      } else {
        setLocationStatus('at_location');
        setLocationDetail('GPS Active');
      }
    } catch (err) {
      console.warn('Supervisor GPS location notice:', err.message);
      setLocationStatus('no_gps');
      setLocationDetail(err.message || 'GPS location unavailable');
      setGeoError(err.message || 'Please enable GPS location to record verified site visits.');
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Adaptive background polling timer
  useEffect(() => {
    let isMounted = true;

    const runPollLoop = async () => {
      clearTimeout(pollTimerRef.current);
      if (!isMounted || document.hidden || activeSitesRef.current.length === 0) return;

      // 15 seconds when within 700m of any site; 3 minutes when far away (> 700m)
      const intervalMs = isNearAnySiteRef.current ? 15000 : 180000;

      pollTimerRef.current = setTimeout(async () => {
        if (isMounted && !document.hidden && activeSitesRef.current.length > 0) {
          await refreshLocation();
          runPollLoop();
        }
      }, intervalMs);
    };

    if (activeSites.length > 0) {
      runPollLoop();
    }

    return () => {
      isMounted = false;
      clearTimeout(pollTimerRef.current);
    };
  }, [activeSites.length, refreshLocation]);

  // Pause when tab/screen is off, refresh immediately when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeSitesRef.current.length > 0) {
        refreshLocation();
      } else {
        clearTimeout(pollTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshLocation]);

  // Fetch supervisor's active projects & clock-in status
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSites(true);
    try {
      const [allProjects, activeJob, status] = await Promise.all([
        getSupervisorProjects(user.id),
        getCurrentJob(user.id),
        getTodayStatus(user.id),
      ]);

      let formattedSites = [];
      if (allProjects && Array.isArray(allProjects)) {
        formattedSites = allProjects
          .filter((p) => !p.isCompleted)
          .map((p) => ({
            id: p.id,
            name: p.name,
            client: p.client,
            location: p.location,
            latitude: p.latitude,
            longitude: p.longitude,
            visited: Boolean(p.isVisitedByMe || p.isVisitedToday),
            isVisitedByMe: Boolean(p.isVisitedByMe),
            isVisitedToday: Boolean(p.isVisitedToday),
            visitedAtTimeStr: p.visitedAtTimeStr || null,
            visitedBySupervisorName: p.visitedBySupervisorName || null,
            presentCount: p.presentCount || 0,
            totalAssigned: p.totalAssigned || 0,
            isAssignedToMe: Boolean(p.isAssignedToMe),
          }));
        setActiveSites(formattedSites);
        if (formattedSites.length > 0 && !selectedSiteId) {
          setSelectedSiteId(formattedSites[0].id);
        }
      } else {
        setActiveSites([]);
      }

      setCurrentJob(activeJob);

      if (status) {
        setIsClockedIn(Boolean(status.isClockedIn));
        setTodayCheckIn(status.checkIn || null);
      }

      // Check GPS after loading sites
      if (formattedSites.length > 0) {
        refreshLocation(formattedSites);
      }
    } catch (err) {
      console.warn('Failed to load supervisor dashboard data:', err);
    } finally {
      setLoadingSites(false);
    }
  }, [user, refreshLocation, selectedSiteId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Open Google Maps URL for a site
  const handleOpenMap = (e, site) => {
    e.stopPropagation();
    let mapsUrl;
    if (site.latitude != null && site.longitude != null) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`;
    } else {
      const query = encodeURIComponent(`${site.name} ${site.location || ''}`.trim());
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const activeSelectedSite = activeSites.find((s) => s.id === selectedSiteId) || activeSites[0] || currentJob;
  const primarySiteName = activeSelectedSite?.name || 'Project Site';
  const isAtSite = Boolean(
    activeSelectedSite && (
      activeSelectedSite.enforceGps === false ||
      activeSelectedSite.latitude == null ||
      activeSelectedSite.longitude == null ||
      (activeSelectedSite.distance != null && activeSelectedSite.distance <= (activeSelectedSite.geofenceRadius || 100))
    )
  );
  const canClockIn = isClockedIn || isAtSite || (activeSelectedSite?.enforceGps === false) || (activeSelectedSite?.latitude == null);

  // ── Hold-to-Clock logic ─────────────────────────────────────────
  const startHold = () => {
    if (isTransitioning) return;
    if (!canClockIn && !isClockedIn) {
      refreshLocation();
      if (activeSelectedSite?.distance != null) {
        setGeoError(`Location Restricted: You are currently ${activeSelectedSite.distance < 1000 ? `${activeSelectedSite.distance}m` : `${(activeSelectedSite.distance / 1000).toFixed(1)}km`} away from ${activeSelectedSite.name}. You must be within ${activeSelectedSite.geofenceRadius || 100}m to record attendance.`);
      } else {
        setGeoError(`Location Restricted: Please verify your GPS location to enable check-in.`);
      }
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
    setIsTransitioning(true);
    setGeoError('');
    try {
      const activeSite = activeSites.find((s) => s.id === selectedSiteId) || activeSites[0] || currentJob;
      const targetProjectId = activeSite?.id || null;

      // Check device GPS when clocking in
      try {
        const pos = await getCurrentPosition();
        if (activeSite?.latitude != null && activeSite?.longitude != null) {
          const dist = calculateDistanceMeters(
            pos.latitude,
            pos.longitude,
            activeSite.latitude,
            activeSite.longitude
          );
          if (dist > (activeSite.geofenceRadius || 100) && activeSite.enforceGps !== false) {
            setLocationStatus('not_in_location');
            setLocationDetail(`Not in Location (${dist}m away)`);
            setGeoError(`Location Restricted: You are ${dist}m away from ${activeSite.name}. Must be within ${activeSite.geofenceRadius || 100}m.`);
            setIsTransitioning(false);
            setProgressWidth(0);
            return;
          }
        }
      } catch (geoErr) {
        console.warn('Clock in GPS notice:', geoErr.message);
      }

      await clockIn(user.id, targetProjectId);
      setIsClockedIn(true);
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err) {
      console.error('Clock-in error:', err);
      setGeoError(err.message || 'Failed to complete attendance check-in.');
    } finally {
      setProgressWidth(0);
      setTimeout(() => setIsTransitioning(false), 1000);
      loadDashboardData();
    }
  };

  const completeClockOut = async () => {
    setIsTransitioning(true);
    setGeoError('');
    try {
      await clockOut(user.id, todayCheckIn?._id);
      setIsClockedIn(false);
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (err) {
      console.error('Clock-out error:', err);
      setGeoError(err.message || 'Failed to clock out.');
    } finally {
      setProgressWidth(0);
      setTimeout(() => setIsTransitioning(false), 1000);
      loadDashboardData();
    }
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
      if (isTransitioning) return 'Clocked Out';
      return 'Hold to Clock Out';
    }
    if (isTransitioning) return 'Clocked In';
    if (canClockIn) {
      if (progressWidth > 0) return 'Keep holding to Clock In';
      return 'Hold to Clock In (Site Verified)';
    }
    if (locationStatus === 'checking') return 'Verifying Location...';
    if (activeSelectedSite?.distance != null) {
      return `Outside Site (${activeSelectedSite.distance < 1000 ? `${activeSelectedSite.distance}m` : `${(activeSelectedSite.distance / 1000).toFixed(1)}km`} away) — Tap to Verify`;
    }
    return 'Tap to Verify Site Location';
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-medium font-heading text-text-primary">
            Hi, {user?.name || user?.firstName || 'Supervisor'}
          </h1>
          <p className="text-sm text-text-secondary">Supervisor</p>
        </div>
        <NotificationBellButton />
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32 max-w-4xl mx-auto w-full">

        {/* ── Section 1: Personal Clock-In Widget ────────────────── */}
        <Card padding="none" className="flex flex-col w-full border border-border bg-surface-card shadow-md relative overflow-hidden">
          <div className="absolute inset-[-1px] rounded-md shadow-md pointer-events-none" />

          <div className="flex flex-col gap-5 p-4 sm:p-5 relative z-10">
            {/* Time + GPS Status row */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[28px] font-semibold font-heading text-text-primary tracking-tight leading-tight">
                  {currentTime}
                </span>
                <span className="text-sm text-text-secondary">
                  {currentDateStr}
                </span>
              </div>

              {/* Dynamic Live GPS Location Badge */}
              <div className="flex items-center gap-1.5">
                <div className={[
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all max-w-[220px]',
                  locationStatus === 'at_location' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  locationStatus === 'not_in_location' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  locationStatus === 'no_gps' ? 'bg-red-50 text-red-800 border-red-200' :
                  'bg-blue-50 text-blue-800 border-blue-200',
                ].join(' ')}>
                  <div className={[
                    'w-2 h-2 rounded-full shrink-0',
                    locationStatus === 'at_location' ? 'bg-emerald-500 animate-pulse' :
                    locationStatus === 'not_in_location' ? 'bg-amber-500' :
                    locationStatus === 'no_gps' ? 'bg-red-500' :
                    'bg-blue-500 animate-spin',
                  ].join(' ')} />
                  <span className="truncate" title={locationDetail}>
                    {locationStatus === 'checking' ? 'Checking GPS...' : locationDetail}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => refreshLocation()}
                  className="p-1.5 rounded-full hover:bg-surface border border-border text-text-muted hover:text-primary transition-colors"
                  title="Refresh GPS Location"
                >
                  <RefreshCw size={13} className={locationStatus === 'checking' ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Target Project Site Selector (if supervisor has multiple active sites) */}
            {activeSites.length > 1 && !isClockedIn && (
              <div className="flex flex-col gap-1.5 bg-surface p-2.5 rounded-md border border-border">
                <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                  <span>Inspection Site for Check-in:</span>
                  <span className="text-[11px] text-text-muted">Tap to switch site</span>
                </label>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {activeSites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => {
                        setSelectedSiteId(site.id);
                        if (site.distance != null) {
                          if (site.distance <= 100) {
                            setLocationStatus('at_location');
                            setLocationDetail(`At ${site.name} (${site.distance}m away)`);
                          } else {
                            setLocationStatus('not_in_location');
                            setLocationDetail(`${site.distance}m away from ${site.name}`);
                          }
                        }
                      }}
                      className={[
                        'px-2.5 py-1 rounded-sm text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
                        selectedSiteId === site.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-card text-text-secondary border-border hover:text-text-primary',
                      ].join(' ')}
                    >
                      <span>{site.name}</span>
                      {site.distance != null && (
                        <span className={[
                          'text-[10px] px-1 py-0.2 rounded',
                          selectedSiteId === site.id
                            ? 'bg-white/20 text-white'
                            : site.distance <= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        ].join(' ')}>
                          {site.distance < 1000 ? `${site.distance}m` : `${(site.distance / 1000).toFixed(1)}km`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Geo Warning Banner if any */}
            {geoError && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1">{geoError}</span>
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
                  refreshLocation();
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
            <div className="flex flex-col gap-1.5 pt-1 border-t border-border/60">
              <div className="flex items-start gap-2">
                <Navigation size={13} className="text-text-muted mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary">
                  Target site: <strong className="text-text-primary">{primarySiteName}</strong>
                  {activeSelectedSite?.distance != null ? ` • GPS distance: ${activeSelectedSite.distance}m` : ''}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info size={13} className="text-text-muted mt-0.5 shrink-0" />
                <span className="text-xs text-text-secondary">
                  Site inspection logs will be recorded in the Admin Console.
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Section 2: Active Sites ────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-heading text-text-primary">
              Active Sites
            </h2>
            <span className="text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-sm uppercase">
              {activeSites.length} ACTIVE
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {loadingSites ? (
              <div className="flex flex-col items-center justify-center p-8 border border-border rounded-sm bg-surface-card">
                <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                <span className="text-xs text-text-muted">Loading active sites...</span>
              </div>
            ) : activeSites.length > 0 ? (
              activeSites.map((site) => (
                <Card
                  key={site.id}
                  padding="none"
                  onClick={() => navigate(`/supervisor/projects/${site.id}`)}
                  className="flex items-center justify-between p-4 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/50 relative overflow-hidden bg-surface-card"
                >
                  {/* Left Gradient Accent Strip matching Admin */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{
                      background: getProjectGradient(site.id),
                    }}
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold font-heading text-text-primary group-hover:text-primary transition-colors">
                        {site.name}
                      </h3>
                      {site.isAssignedToMe && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                          Assigned
                        </span>
                      )}
                      {/* Live GPS Proximity Tag */}
                      {site.distance != null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-surface text-text-secondary border-border inline-flex items-center">
                          <MapPin size={10} className="mr-1 text-primary shrink-0" />
                          <span>{site.distance < 1000 ? `${site.distance}m away` : `${(site.distance / 1000).toFixed(1)}km away`}</span>
                        </span>
                      )}
                    </div>

                    {site.location && (
                      <span className="text-xs text-text-secondary truncate">
                        {site.location}
                      </span>
                    )}

                    {site.visited ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold w-fit">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                        <span>
                          {site.isVisitedByMe
                            ? `Inspected Today ${site.visitedAtTimeStr ? `(${site.visitedAtTimeStr})` : ''}`
                            : `Inspected by ${site.visitedBySupervisorName || 'Supervisor'}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold w-fit">
                        <Circle size={12} className="text-amber-600 shrink-0" strokeWidth={2} />
                        <span>Awaiting Visit Today</span>
                      </div>
                    )}
                  </div>

                  {/* Location Icon Button — Opens Google Maps */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenMap(e, site)}
                    title={`View ${site.name} on Google Maps`}
                    className="w-11 h-11 bg-surface-card rounded-md border border-border flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:border-primary transition-all shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 group/btn"
                  >
                    <MapPin size={20} className="transition-transform group-hover/btn:scale-110" />
                  </button>
                </Card>
              ))
            ) : (
              <div className="p-8 text-center border border-border rounded-sm bg-surface-card flex flex-col items-center gap-2">
                <Building2 size={32} className="text-text-muted opacity-60" />
                <p className="text-sm font-semibold text-text-primary">No active project sites</p>
                <p className="text-xs text-text-muted">You do not have any active project sites assigned at the moment.</p>
              </div>
            )}
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

