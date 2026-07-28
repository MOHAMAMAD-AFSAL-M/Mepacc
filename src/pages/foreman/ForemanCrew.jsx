import { useState } from 'react';
import { Bell, UserCheck, ChevronDown, Check, X, ShieldAlert } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import Button from '../../components/Button';

/**
 * ForemanCrew — Crew Management & Proxy Clock-In page for foremen.
 * Matches Stitch Screen "Foreman Crew Management - Refined Proxy Dropdown".
 *
 * Features:
 *   1. KPI Strip: Total (12), Present (10), Absent (2)
 *   2. "Action Required: Not Clocked In" list with "Proxy In" CTA
 *   3. "Currently On Site" list with check-in time and check-in type (Self / Proxy)
 *   4. Interactive "Log Proxy Attendance" Modal with reason dropdown options:
 *        - Phone Dead
 *        - No Network
 *        - App Issue
 */

const INITIAL_UNCLOCKED = [
  { id: 'usr_01', name: 'Amit Sharma', role: 'Senior Technician', avatar: 'A' },
  { id: 'usr_02', name: 'Suresh Kumar', role: 'Electrician', avatar: 'S' },
];

const INITIAL_ON_SITE = [
  {
    id: 'usr_03',
    name: 'Rahul Desai',
    role: 'Lead Technician',
    time: '07:55 AM',
    type: 'Self',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'usr_04',
    name: 'Vikram Singh',
    role: 'Plumber',
    time: '08:12 AM',
    type: 'Proxy',
    avatar: null,
  },
  {
    id: 'usr_05',
    name: 'Priya Patel',
    role: 'Safety Officer',
    time: '07:45 AM',
    type: 'Self',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  },
];

const PROXY_REASONS = [
  { value: 'phone_dead', label: 'Phone Dead' },
  { value: 'no_network', label: 'No Network' },
  { value: 'app_issue', label: 'App Issue' },
];

export default function ForemanCrew() {
  const user = useAuthStore((s) => s.user);

  const [unclockedList, setUnclockedList] = useState(INITIAL_UNCLOCKED);
  const [onSiteList, setOnSiteList] = useState(INITIAL_ON_SITE);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [proxyReason, setProxyReason] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleSubmitProxy = () => {
    if (!selectedTech || !proxyReason) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Move technician from unclocked to on-site list
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

  const presentCount = onSiteList.length + 7; // total present out of 12
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
          <p className="text-sm text-text-secondary">Patel Villa Site</p>
        </div>
        <button className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-primary" />
        </button>
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
                      {tech.avatar}
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
            {onSiteList.map((tech, idx) => (
              <div
                key={tech.id}
                className={[
                  'flex items-center justify-between p-4 transition-colors',
                  idx !== onSiteList.length - 1 ? 'border-b border-border' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    {tech.avatar ? (
                      <img
                        src={tech.avatar}
                        alt={tech.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-heading">
                        {tech.name[0]}
                      </div>
                    )}
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
            ))}
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
