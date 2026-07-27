/**
 * Auth service — currently backed by mock data.
 * Replace with Convex mutations/queries when backend is connected.
 */
import { mockUsers } from '../mock/mockData';

/**
 * Simulate login by finding a matching user by phone number and PIN.
 * @param {string} phone – 10-digit mobile number (digits only)
 * @param {string} pin   – 6-digit PIN
 * @returns {Promise<{ user: object, role: string }>}
 */
export async function login(phone, pin) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Normalize: strip non-digits from phone input
  const normalizedPhone = phone.replace(/\D/g, '');

  const user = mockUsers.find(
    (u) => u.phone === normalizedPhone && u.pin === pin
  );

  if (!user) {
    throw new Error('Invalid mobile number or PIN');
  }

  // Return a sanitized user object (no pin)
  const { pin: _, ...safeUser } = user;
  return { user: safeUser, role: user.role };
}

/**
 * Simulate logout.
 * @returns {Promise<void>}
 */
export async function logout() {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
