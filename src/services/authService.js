/**
 * Auth service — Connected to Convex backend.
 */
import { convexClient, api } from '../convex.js';

export function getOrCreateDeviceSessionId() {
  let sessionId = localStorage.getItem('mepac_device_session_id');
  if (!sessionId) {
    sessionId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('mepac_device_session_id', sessionId);
  }
  return sessionId;
}

export function getDeviceName() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Device';
  if (/Macintosh/i.test(ua)) return 'Mac Browser';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Web Browser';
}

/**
 * Login with Worker ID (e.g. DES-001) or 10-digit mobile number, and 6-digit PIN.
 * @param {string} identifier – Worker ID or mobile number
 * @param {string} pin        – 6-digit PIN
 * @returns {Promise<{ user: object, role: string, sessionId: string }>}
 */
export async function login(identifier, pin, forceOverride = false) {
  const cleanInput = (identifier || '').trim();
  const sessionId = getOrCreateDeviceSessionId();
  const deviceName = getDeviceName();
  return await convexClient.mutation(api.workers.loginWithPin, {
    mobile: cleanInput,
    pin,
    sessionId,
    deviceName,
    forceOverride,
  });
}

/**
 * Reclaim active device session on this device (overriding any other device).
 * @param {string} workerId
 */
export async function claimSession(workerId) {
  const sessionId = getOrCreateDeviceSessionId();
  const deviceName = getDeviceName();
  return await convexClient.mutation(api.workers.claimSession, {
    workerId,
    sessionId,
    deviceName,
  });
}

/**
 * Change worker PIN.
 * @param {string} workerId
 * @param {string} oldPin
 * @param {string} newPin
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function changePin(workerId, oldPin, newPin) {
  return await convexClient.mutation(api.workers.changePin, {
    workerId,
    oldPin,
    newPin,
  });
}

/**
 * Logout.
 * @returns {Promise<void>}
 */
export async function logout() {
  // Clear any local caches if needed
}
