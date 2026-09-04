import { convexClient, api } from '../convex.js';

/**
 * Fetch attendance for a specific user, year, and month.
 * @param {string} userId
 * @param {number} year - Full year (e.g., 2026)
 * @param {number} month - 1-indexed month (1 = Jan, 12 = Dec)
 */
export const getAttendanceForMonth = async (userId, year, month) => {
  try {
    if (userId) {
      const result = await convexClient.query(
        api.checkIns.getMonthlyAttendance,
        {
          workerId: userId,
          year,
          month,
        }
      );
      if (result?.records) return result;
    }
  } catch (err) {
    console.warn('Convex getMonthlyAttendance error:', err);
  }

  return {
    records: [],
    totalWorked: 0,
  };
};

/**
 * Fetch today's check-in status for worker.
 * @param {string} userId
 */
export const getTodayStatus = async (userId) => {
  try {
    if (userId) {
      return await convexClient.query(api.checkIns.getTodayStatus, {
        workerId: userId,
      });
    }
  } catch (err) {
    console.warn('Convex getTodayStatus error:', err);
  }
  return { isClockedIn: false, isCompleted: false, checkIn: null };
};

/**
 * Perform clock-in for worker.
 * @param {string} userId
 * @param {string} [projectId]
 */
export const clockIn = async (userId, projectId = null) => {
  return await convexClient.mutation(api.checkIns.clockInWorker, {
    workerId: userId,
    ...(projectId ? { projectId } : {}),
    type: 'Self',
  });
};

/**
 * Perform clock-out for worker.
 * @param {string} userId
 * @param {string} [checkInId]
 */
export const clockOut = async (userId, checkInId = null) => {
  return await convexClient.mutation(api.checkIns.clockOutWorker, {
    workerId: userId,
    ...(checkInId ? { checkInId } : {}),
  });
};

/**
 * Fetch crew attendance for foreman.
 * @param {string} foremanId
 */
export const getCrewAttendance = async (foremanId) => {
  try {
    if (foremanId) {
      const crew = await convexClient.query(api.checkIns.getCrewAttendance, {
        foremanId,
      });
      if (crew && crew.length > 0) return crew;
    }
  } catch (err) {
    console.warn('Convex getCrewAttendance error:', err);
  }

  return [];
};

/**
 * Perform proxy check-in by foreman.
 * @param {string} foremanId
 * @param {string} workerId
 * @param {string} [projectId]
 * @param {string} [reason]
 */
export const proxyCheckIn = async (foremanId, workerId, projectId = null, reason = '') => {
  return await convexClient.mutation(api.checkIns.proxyCheckIn, {
    foremanId,
    workerId,
    ...(projectId ? { projectId } : {}),
    reason,
  });
};
