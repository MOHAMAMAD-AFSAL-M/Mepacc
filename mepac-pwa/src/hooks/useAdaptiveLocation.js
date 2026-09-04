import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentPosition, calculateDistanceMeters } from '../utils/geoUtils';

const PROXIMITY_THRESHOLD_METERS = 700; // 700m radius threshold
const FAST_POLL_INTERVAL_MS = 15000;   // 15 seconds when near any site (< 700m)
const SLOW_POLL_INTERVAL_MS = 180000;  // 3 minutes when far away (> 700m) to save battery

/**
 * useAdaptiveLocation — Smart battery-optimized adaptive GPS tracking.
 * - When worker is within 700m of any assigned site: checks location frequently (every 15s).
 * - When worker is far away (> 700m): greatly decreases polling frequency (every 3 min).
 * - Pauses automatically when tab is hidden / screen is off.
 * - Refreshes immediately when tab becomes visible or on manual action.
 */
export function useAdaptiveLocation(sitesList = []) {
  const [userPos, setUserPos] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'checking' | 'at_location' | 'not_in_location' | 'no_gps'
  const [locationDetail, setLocationDetail] = useState('');
  const [geoError, setGeoError] = useState('');
  const [minDistance, setMinDistance] = useState(null);
  const [isNearAnySite, setIsNearAnySite] = useState(false);

  const timerRef = useRef(null);
  const isCheckingRef = useRef(false);
  const sitesRef = useRef(sitesList);

  useEffect(() => {
    sitesRef.current = sitesList;
  }, [sitesList]);

  // Main check function
  const checkLocation = useCallback(async (customSites = sitesRef.current) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setLocationStatus((prev) => (prev === 'idle' ? 'checking' : prev));
    setGeoError('');

    try {
      const pos = await getCurrentPosition();
      setUserPos(pos);

      const validSites = (customSites || []).filter(
        (s) => s.latitude != null && s.longitude != null
      );

      let closestDist = null;
      let atSite = null;

      const enriched = (customSites || []).map((site) => {
        let dist = null;
        if (site.latitude != null && site.longitude != null) {
          dist = calculateDistanceMeters(pos.latitude, pos.longitude, site.latitude, site.longitude);
          if (closestDist === null || dist < closestDist) {
            closestDist = dist;
          }
          if (dist <= (site.geofenceRadius || 100)) {
            atSite = { ...site, distance: dist };
          }
        }
        return { ...site, distance: dist };
      });

      setMinDistance(closestDist);
      const isNear = closestDist != null && closestDist <= PROXIMITY_THRESHOLD_METERS;
      setIsNearAnySite(isNear);

      if (atSite) {
        setLocationStatus('at_location');
        setLocationDetail(`At ${atSite.name} (${atSite.distance}m)`);
      } else if (closestDist != null) {
        setLocationStatus('not_in_location');
        setLocationDetail(`${closestDist < 1000 ? `${closestDist}m` : `${(closestDist / 1000).toFixed(1)}km`} from site`);
      } else {
        setLocationStatus('at_location');
        setLocationDetail('GPS Active');
      }

      return { pos, enriched, isNear, closestDist, atSite };
    } catch (err) {
      console.warn('Adaptive GPS check notice:', err.message);
      setLocationStatus('no_gps');
      setLocationDetail(err.message || 'GPS location unavailable');
      setGeoError(err.message || 'GPS location unavailable');
      return null;
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Adaptive polling scheduler based on proximity
  useEffect(() => {
    const scheduleNextPoll = () => {
      clearTimeout(timerRef.current);
      if (document.hidden) return; // Pause when screen/tab is off

      const interval = isNearAnySite ? FAST_POLL_INTERVAL_MS : SLOW_POLL_INTERVAL_MS;

      timerRef.current = setTimeout(async () => {
        if (!document.hidden && sitesRef.current.length > 0) {
          await checkLocation();
          scheduleNextPoll();
        }
      }, interval);
    };

    if (sitesList.length > 0) {
      scheduleNextPoll();
    }

    return () => clearTimeout(timerRef.current);
  }, [isNearAnySite, sitesList.length, checkLocation]);

  // Handle visibility change (screen on/off)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && sitesRef.current.length > 0) {
        // Tab became visible again — trigger immediate check
        checkLocation();
      } else {
        // Tab hidden — clear timeout to avoid background battery drain
        clearTimeout(timerRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkLocation]);

  return {
    userPos,
    locationStatus,
    locationDetail,
    geoError,
    setGeoError,
    minDistance,
    isNearAnySite,
    checkLocation,
  };
}
