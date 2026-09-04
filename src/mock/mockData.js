/**
 * Mock data for MEPac PWA development.
 * Replace with Convex queries once backend is connected.
 */

// ── Mock Users ──────────────────────────────────────────────────
export const mockUsers = [
  {
    id: 'usr_tech_01',
    name: 'Rajan Kumar',
    phone: '9876543210',
    pin: '123456',
    role: 'technician',
    avatar: null,
    email: null,
    department: 'HVAC',
    status: 'active',
  },
  {
    id: 'usr_frm_01',
    name: 'Priya Sharma',
    phone: '9876543211',
    pin: '123456',
    role: 'foreman',
    avatar: null,
    email: null,
    department: 'Operations',
    status: 'active',
  },
  {
    id: 'usr_sup_01',
    name: 'Afsal Mohammed',
    phone: '9876543212',
    pin: '123456',
    role: 'supervisor',
    avatar: null,
    email: null,
    department: 'Administration',
    status: 'active',
  },
];

// ── Mock Jobs ───────────────────────────────────────────────────
export const mockJobs = [
  {
    id: 'job_01',
    name: 'Patel Villa',
    location: 'Kochi, Kerala',
    imageUrl: 'https://images.unsplash.com/photo-1541888081636-67a550d5145b?auto=format&fit=crop&q=80&w=800',
    dateStr: 'Mon, 12 Jul',
    timeStr: '08:00 AM',
    status: 'At Location',
    assignedTo: 'usr_tech_01',
  }
];

// ── Mock Attendance Records ─────────────────────────────────────
export const getMockAttendance = (year, month, userId) => {
  // Deterministic mock generation based on month and year
  const daysInMonth = new Date(year, month, 0).getDate();
  const records = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month - 1, i);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday
    
    // Skip future dates if the month is current/future
    const now = new Date();
    if (dateObj > now) {
      records.push({ day: i, status: 'none' }); // Not yet occurred
      continue;
    }

    if (dayOfWeek === 0) { // Sunday
      records.push({ day: i, status: 'leave' });
    } else if (i % 7 === 0) {
      records.push({ day: i, status: 'half' });
    } else if (i % 13 === 0) {
      records.push({ day: i, status: 'leave' });
    } else {
      records.push({ day: i, status: 'full' });
    }
  }
  
  return records;
};

// ── Mock Sites / Locations ──────────────────────────────────────
export const mockSites = [
  // Placeholder — will be populated when building site screens
];
