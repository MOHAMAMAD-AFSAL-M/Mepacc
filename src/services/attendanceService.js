import { getMockAttendance } from '../mock/mockData';

/**
 * Fetch attendance for a specific user, year, and month.
 * @param {string} userId
 * @param {number} year - Full year (e.g., 2026)
 * @param {number} month - 1-indexed month (1 = Jan, 12 = Dec)
 */
export const getAttendanceForMonth = async (userId, year, month) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const records = getMockAttendance(year, month, userId);
  
  // Calculate total days worked (full = 1, half = 0.5)
  const totalWorked = records.reduce((acc, record) => {
    if (record.status === 'full') return acc + 1;
    if (record.status === 'half') return acc + 0.5;
    return acc;
  }, 0);

  return {
    records,
    totalWorked,
  };
};
