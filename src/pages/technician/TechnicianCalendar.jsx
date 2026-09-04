import { useState, useEffect, useMemo } from 'react';
import { Bell } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getAttendanceForMonth } from '../../services/attendanceService';
import Card from '../../components/Card';
import Select from '../../components/Select';
import NotificationBellButton from '../../components/NotificationBellButton';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const YEARS = [2024, 2025, 2026, 2027];
const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TechnicianCalendar() {
  const user = useAuthStore((s) => s.user);

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

  // Generate calendar grid structure
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

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-medium font-heading text-text-primary">
            Hi, {user?.name || 'Technician'}
          </h1>
          <p className="text-base text-text-secondary">Technician</p>
        </div>
        <NotificationBellButton />
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-6 p-4 pb-32">
        {/* KPI Widget */}
        <Card className="flex flex-col items-center justify-center p-4 py-5 gap-1">
          <h2 className="text-[16px] text-text-secondary tracking-[1.6px] uppercase text-center">
            Days Worked This Month
          </h2>
          <div className="text-[40px] font-bold font-heading text-text-primary leading-tight">
            {totalWorked}
          </div>
        </Card>

        {/* Calendar Widget */}
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
                <div key={idx} className="text-center font-bold text-[16px] text-text-secondary">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((cell, idx) => (
                <div key={idx} className="flex items-center justify-center h-[26px]">
                  {cell ? (
                    <div className={`flex items-center justify-center w-full h-full rounded-sm text-base ${getStatusStyles(cell.status)}`}>
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
      </div>
    </div>
  );
}
