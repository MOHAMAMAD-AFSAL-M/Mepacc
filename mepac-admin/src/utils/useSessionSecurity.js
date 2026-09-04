import { useState, useEffect, useCallback, useRef } from 'react';

// 3 hours in milliseconds
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export function useSessionSecurity() {
    const [isLocked, setIsLocked] = useState(() => {
        return sessionStorage.getItem('mepac_session_locked') === 'true';
    });
    const [lockReason, setLockReason] = useState('inactivity');
    const lastActiveRef = useRef(Date.now());
    const hiddenAtRef = useRef(null);

    const lockSession = useCallback((reason = 'inactivity') => {
        setIsLocked(true);
        setLockReason(reason);
        sessionStorage.setItem('mepac_session_locked', 'true');
    }, []);

    const unlockSession = useCallback(() => {
        setIsLocked(false);
        lastActiveRef.current = Date.now();
        sessionStorage.removeItem('mepac_session_locked');
        sessionStorage.setItem('mepac_last_active', String(Date.now()));
    }, []);

    // Track user activity to reset inactivity timer
    useEffect(() => {
        const resetActivity = () => {
            if (!isLocked) {
                lastActiveRef.current = Date.now();
                sessionStorage.setItem('mepac_last_active', String(Date.now()));
            }
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));

        // Check for 3-hour inactivity periodically
        const intervalId = setInterval(() => {
            if (!isLocked) {
                const now = Date.now();
                const savedLastActive = Number(sessionStorage.getItem('mepac_last_active') || lastActiveRef.current);
                if (now - savedLastActive >= THREE_HOURS_MS) {
                    lockSession('inactivity');
                }
            }
        }, 15000); // check every 15 seconds

        return () => {
            events.forEach(evt => window.removeEventListener(evt, resetActivity));
            clearInterval(intervalId);
        };
    }, [isLocked, lockSession]);

    // Track screen off / tab visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
            } else if (document.visibilityState === 'visible') {
                // When screen wakes up or tab returns
                if (hiddenAtRef.current) {
                    const awayDuration = Date.now() - hiddenAtRef.current;
                    // If screen was off or user was away for more than 5 seconds, lock for security
                    if (awayDuration > 5000) {
                        lockSession('screen_off');
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [lockSession]);

    return {
        isLocked,
        lockReason,
        lockSession,
        unlockSession
    };
}
