import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Building2, Lock, ChevronRight, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getAttendanceForMonth } from '../../services/attendanceService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Select from '../../components/Select';

/**
 * SupervisorAccount — Account & Settings page for Supervisors.
 * Uses the exact same calendar layout & design system as Foreman & Technician.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const YEARS = [2024, 2025, 2026, 2027];
const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function SupervisorAccount() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [totalWorked, setTotalWorked] = useState(0);

  useEffect(() => {
    if (user?.id) {
      getAttendanceForMonth(user.id, selectedYear, selectedMonth).then((data) => {
        setAttendance(data.records);
        setTotalWorked(data.totalWorked);
      });
    }
  }, [user, selectedMonth, selectedYear]);

  // Calendar grid structure (exact match to Foreman)
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayObj = new Date(selectedYear, selectedMonth - 1, 1);

    let startDayOfWeek = firstDayObj.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const grid = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const record = attendance.find((r) => r.day === i);
      grid.push({
        day: i,
        status: record?.status || 'none',
      });
    }
    return grid;
  }, [selectedYear, selectedMonth, attendance]);

  const getStatusStyles = (status) => {
    switch (status) {
      case 'full':
        return 'bg-success text-white font-medium';
      case 'half':
        return 'bg-green-200 text-green-800 font-medium';
      case 'leave':
        return 'bg-slate-100 text-text-secondary font-medium';
      default:
        return 'bg-transparent text-text-primary';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const firstName = user?.name?.split(' ')[0] || 'User';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'S';

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <h1 className="text-2xl font-semibold font-heading text-text-primary tracking-tight">
          Account
        </h1>
        <button className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-primary" />
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32">

        {/* ── Profile Card ───────────────────────────────────── */}
        <button
          onClick={() => navigate('/supervisor/profile')}
          className="w-full text-left"
        >
          <Card
            padding="none"
            className="flex items-center gap-4 p-4 border border-border hover:shadow-md transition-shadow duration-fast cursor-pointer"
          >
            {/* Avatar */}
            <div className="shrink-0 w-16 h-16 rounded-full border border-border-strong overflow-hidden bg-primary/10 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-primary">
                  {initials}
                </span>
              )}
            </div>

            {/* Name + Role + Link */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-medium font-heading text-text-primary truncate">
                {user?.name || 'Afsal Mohammed'}
              </h2>
              <p className="text-sm text-text-secondary mb-1">
                Supervisor
              </p>
              <span className="text-xs font-semibold text-primary-dark tracking-wide">
                View & Edit Profile
              </span>
            </div>

            {/* Chevron */}
            <ChevronRight size={14} className="text-text-muted shrink-0" />
          </Card>
        </button>

        {/* ── KPI Widget (Matching Foreman design) ──────────── */}
        <Card className="flex flex-col items-center justify-center p-4 py-5 gap-1">
          <h2 className="text-xs font-semibold text-text-secondary tracking-[1.6px] uppercase text-center">
            Days Worked This Month
          </h2>
          <div className="text-[40px] font-bold font-heading text-text-primary leading-tight">
            {totalWorked}
          </div>
        </Card>

        {/* ── Calendar Widget (Matching Foreman design) ──────── */}
        <Card className="flex flex-col gap-6 p-4">
          {/* Pickers */}
          <div className="flex gap-2 w-full">
            <Select
              className="flex-1"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
            />
            <Select
              className="flex-1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={YEARS.map((y) => ({ label: y.toString(), value: y }))}
            />
          </div>

          {/* Calendar Grid */}
          <div className="flex flex-col gap-2">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((d, idx) => (
                <div
                  key={idx}
                  className="text-center font-bold text-base text-text-secondary"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((cell, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center h-[26px]"
                >
                  {cell ? (
                    <div
                      className={`flex items-center justify-center w-full h-full rounded-sm text-base ${getStatusStyles(
                        cell.status
                      )}`}
                    >
                      {cell.day}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between border-t border-border pt-4 px-1 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-text-secondary">Full Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-200" />
              <span className="text-sm text-text-secondary">Half Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-100" />
              <span className="text-sm text-text-secondary">Leave/Off</span>
            </div>
          </div>
        </Card>

        {/* ── Settings List ──────────────────────────────────── */}
        <Card padding="none" className="overflow-hidden border border-border">
          {/* Item 1: MEP Company ID */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Building2 size={20} className="text-text-secondary shrink-0" />
              <span className="text-base text-text-primary">
                MEP Company ID
              </span>
            </div>
            <span className="text-sm text-text-secondary font-heading">
              MEP-2026-X
            </span>
          </div>

          {/* Item 2: Change PIN */}
          <button
            onClick={() => navigate('/supervisor/change-pin')}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-surface transition-colors duration-fast"
          >
            <div className="flex items-center gap-4">
              <Lock size={18} className="text-text-secondary shrink-0" />
              <span className="text-base text-text-primary">Change PIN</span>
            </div>
            <ChevronRight size={14} className="text-text-muted shrink-0" />
          </button>
        </Card>

        {/* ── Log Out ────────────────────────────────────────── */}
        <div className="flex justify-center pt-4">
          <Button
            variant="danger"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>

      </div>
    </div>
  );
}
