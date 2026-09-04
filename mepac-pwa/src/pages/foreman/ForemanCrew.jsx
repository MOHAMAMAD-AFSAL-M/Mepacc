import { useState, useEffect, useCallback } from 'react';
import { Bell, UserCheck, ChevronDown, Check, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getCrewAttendance, proxyCheckIn } from '../../services/attendanceService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import NotificationBellButton from '../../components/NotificationBellButton';

const PROXY_REASONS = [
  { value: 'phone_dead', label: 'Phone Dead' },
  { value: 'no_network', label: 'No Network' },
  { value: 'app_issue', label: 'App Issue' },
];

export default function ForemanCrew() {
  const user = useAuthStore((s) => s.user);

  const [unclockedList, setUnclockedList] = useState([]);
  const [onSiteList, setOnSiteList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [proxyReason, setProxyReason] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loadCrew = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const crew = await getCrewAttendance(user.id);
      const onSite = [];
      const unclocked = [];

      if (crew && crew.length > 0) {
        crew.forEach((member) => {
          if (member.isPresent) {
            onSite.push({
              id: member.id,
              name: member.name,
              role: member.role,
              time: member.checkInTime || '08:00 AM',
              type: member.type || 'Self',
              avatar: null,
            });
          } else {
            unclocked.push({
              id: member.id,
              name: member.name,
              role: member.role,
              avatar: member.name[0] || 'W',
            });
          }
        });
      }
      setOnSiteList(onSite);
      setUnclockedList(unclocked);
    } catch (err) {
      console.warn('Failed to load live crew attendance:', err);
      setOnSiteList([]);
      setUnclockedList([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCrew();
  }, [loadCrew]);

  const handleOpenModal = (tech) => {
    setSelectedTech(tech);
    setProxyReason('');
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTech(null);
    setProxyReason('');
    setIsDropdownOpen(false);
  };

  const handleSubmitProxy = async () => {
    if (!selectedTech || !proxyReason) return;

    try {
      if (user?.id) {
        await proxyCheckIn(
          user.id,
          selectedTech.id,
          null,
          PROXY_REASONS.find((r) => r.value === proxyReason)?.label || proxyReason
        );
      }
    } catch (err) {
      console.error('Proxy check-in error:', err);
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Optimistically move technician from unclocked to on-site list
    setUnclockedList((prev) => prev.filter((t) => t.id !== selectedTech.id));
    setOnSiteList((prev) => [
      {
        id: selectedTech.id,
        name: selectedTech.name,
        role: selectedTech.role,
        time: formattedTime,
        type: 'Proxy',
        avatar: null,
      },
      ...prev,
    ]);

    handleCloseModal();
  };

  const presentCount = onSiteList.length;
  const absentCount = unclockedList.length;
  const totalCount = presentCount + absentCount;

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-medium font-heading text-text-primary">
            Site Crew
          </h1>
          <p className="text-sm text-text-secondary">{user?.name ? `${user.name} • ` : ''}Foreman</p>
        </div>
        <NotificationBellButton />
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32">

        {/* ── KPI Strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total */}
          <Card padding="none" className="p-4 border border-border shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1">
              Total
            </span>
            <span className="text-2xl font-bold font-heading text-text-primary">
              {totalCount}
            </span>
          </Card>

          {/* Present */}
          <Card padding="none" className="p-4 border border-border border-t-2 border-t-primary shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1">
              Present
            </span>
            <span className="text-2xl font-bold font-heading text-text-primary">
              {presentCount}
            </span>
          </Card>

          {/* Absent */}
          <Card padding="none" className="p-4 border border-border border-t-2 border-t-primary-light shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1">
              Absent
            </span>
            <span className="text-2xl font-bold font-heading text-primary-dark">
              {absentCount}
            </span>
          </Card>
        </div>

        {/* ── Section 1: Action Required (Not Clocked In) ─────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold font-heading text-text-primary">
            Action Required: Not Clocked In
          </h2>

          <Card padding="none" className="border border-border overflow-hidden shadow-sm">
            {unclockedList.length > 0 ? (
              unclockedList.map((tech, idx) => (
                <div
                  key={tech.id}
                  className={[
                    'flex items-center justify-between p-4 transition-colors',
                    idx !== unclockedList.length - 1 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-heading">
                      {tech.avatar || tech.name[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-semibold font-heading text-text-primary">
                        {tech.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {tech.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(tech)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary text-primary hover:bg-primary/10 transition-colors text-xs font-semibold"
                  >
                    <UserCheck size={16} />
                    <span>Proxy In</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-text-muted">
                All crew members are clocked in!
              </div>
            )}
          </Card>
        </div>

        {/* ── Section 2: Currently On Site ────────────────────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold font-heading text-text-primary">
            Currently On Site
          </h2>

          <Card padding="none" className="border border-border overflow-hidden shadow-sm">
            {onSiteList.length > 0 ? (
              onSiteList.map((tech, idx) => (
                <div
                  key={tech.id}
                  className={[
                    'flex items-center justify-between p-4 transition-colors',
                    idx !== onSiteList.length - 1 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-heading">
                        {tech.name[0]}
                      </div>
                      {/* Status dot */}
                      <div
                        className={[
                          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                          tech.type === 'Self' ? 'bg-success' : 'bg-warning',
                        ].join(' ')}
                      />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-base font-semibold font-heading text-text-primary">
                        {tech.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {tech.role}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono text-text-primary block font-medium">
                      {tech.time}
                    </span>
                    <span
                      className={[
                        'text-xs font-semibold block mt-0.5',
                        tech.type === 'Self' ? 'text-text-secondary' : 'text-amber-600',
                      ].join(' ')}
                    >
                      {tech.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-text-muted">
                No crew members currently on site.
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* ── Proxy Attendance Modal ──────────────────────────── */}
      {isModalOpen && selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card rounded-md border border-border shadow-lg w-full max-w-sm p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold font-heading text-text-primary">
                  Log Proxy Attendance
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  For <span className="font-bold text-text-primary">{selectedTech.name}</span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-full hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Reason Select Dropdown */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Reason for Proxy
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between bg-surface-card border border-border-strong text-text-primary text-sm rounded-sm px-3 py-2.5 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <span>
                    {proxyReason
                      ? PROXY_REASONS.find((r) => r.value === proxyReason)?.label
                      : 'Select a reason...'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-text-muted transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-surface-card rounded-sm shadow-md border border-border overflow-hidden">
                    {PROXY_REASONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setProxyReason(option.value);
                          setIsDropdownOpen(false);
                        }}
                        className={[
                          'w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors',
                          proxyReason === option.value
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-text-primary hover:bg-surface',
                        ].join(' ')}
                      >
                        <span>{option.label}</span>
                        {proxyReason === option.value && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!proxyReason}
                onClick={handleSubmitProxy}
              >
                Submit Proxy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
