import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Building2, 
  Clock, 
  Calendar, 
  Key, 
  Edit2, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Copy,
  RefreshCcw,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function WorkerProfileModal({ 
  worker, 
  onClose, 
  onEditWorker, 
  onShowPin, 
  projects = [],
  workforce = []
}) {
    // ── Date & Calendar Navigation State ─────────────────────────
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (0 = Jan)

    const formatLocalDateKey = (d) => {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${day}`;
    };

    const [selectedDateKey, setSelectedDateKey] = useState(formatLocalDateKey(today));
    const [isEditingAttendance, setIsEditingAttendance] = useState(false);
    const [isCreatingAttendance, setIsCreatingAttendance] = useState(false);

    // Edit form fields
    const [editProjectId, setEditProjectId] = useState('');
    const [editTimeIn, setEditTimeIn] = useState('08:30');
    const [editTimeOut, setEditTimeOut] = useState('');
    const [editStatus, setEditStatus] = useState('Verified');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // PIN Copy Toast
    const [copiedPin, setCopiedPin] = useState(false);

    // ── Convex Queries & Mutations ──────────────────────────────
    const attendanceRecords = useQuery(api.checkIns.getByWorker, worker?._id ? { workerId: worker._id } : "skip") || [];
    const overrideAttendance = useMutation(api.checkIns.adminOverrideAttendance);
    const deleteAttendance = useMutation(api.checkIns.adminDeleteAttendance);

    // Map records by YYYY-MM-DD
    const recordsByDate = useMemo(() => {
        const map = new Map();
        for (const record of attendanceRecords) {
            if (record.checkInTime) {
                const d = new Date(record.checkInTime);
                const key = formatLocalDateKey(d);
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key).push(record);
            }
        }
        return map;
    }, [attendanceRecords]);

    // Active record for the currently selected calendar date
    const selectedRecords = recordsByDate.get(selectedDateKey) || [];
    const currentSelectedRecord = selectedRecords.length > 0 ? selectedRecords[0] : null;

    // Reset edit form when selected date changes
    const populateEditForm = (record) => {
        if (record) {
            const foundProj = projects.find(p => p._id === record.projectId || p.name === record.projectName);
            setEditProjectId(foundProj?._id || record.projectId || projects[0]?._id || '');
            if (record.checkInTime) {
                const d = new Date(record.checkInTime);
                setEditTimeIn(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            }
            if (record.checkOutTime) {
                const d = new Date(record.checkOutTime);
                setEditTimeOut(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            } else {
                setEditTimeOut('');
            }
            setEditStatus(record.status || 'Verified');
        } else {
            setEditProjectId(projects[0]?._id || '');
            setEditTimeIn('08:30');
            setEditTimeOut('17:30');
            setEditStatus('Verified');
        }
    };

    const handleSelectDate = (dateKey) => {
        setSelectedDateKey(dateKey);
        setIsEditingAttendance(false);
        setIsCreatingAttendance(false);
        const records = recordsByDate.get(dateKey);
        if (records && records.length > 0) {
            populateEditForm(records[0]);
        } else {
            populateEditForm(null);
        }
    };

    // Calendar Calculations for Current Month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const monthName = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long' });

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleGoToday = () => {
        const now = new Date();
        setCurrentYear(now.getFullYear());
        setCurrentMonth(now.getMonth());
        handleSelectDate(formatLocalDateKey(now));
    };

    // Monthly stats for this worker
    const monthRecords = useMemo(() => {
        return attendanceRecords.filter(r => {
            const d = new Date(r.checkInTime);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
    }, [attendanceRecords, currentYear, currentMonth]);

    const totalDaysPresentThisMonth = monthRecords.length;
    const totalHoursThisMonth = monthRecords
        .reduce((acc, r) => acc + (r.hoursWorked ? parseFloat(r.hoursWorked) : 0), 0)
        .toFixed(1);

    // Save Edited or New Attendance Record
    const handleSaveAttendance = async (e) => {
        if (e) e.preventDefault();
        if (!editProjectId || !editTimeIn || !selectedDateKey) return;
        setIsSubmitting(true);

        try {
            const [year, month, day] = selectedDateKey.split('-').map(Number);
            const [inH, inM] = editTimeIn.split(':').map(Number);
            const inDate = new Date(year, month - 1, day, inH, inM);

            let outTimestamp = undefined;
            if (editTimeOut) {
                const [outH, outM] = editTimeOut.split(':').map(Number);
                const outDate = new Date(year, month - 1, day, outH, outM);
                outTimestamp = outDate.getTime();
            }

            await overrideAttendance({
                ...(currentSelectedRecord?._id && { checkInId: currentSelectedRecord._id }),
                workerId: worker._id,
                projectId: editProjectId,
                checkInTime: inDate.getTime(),
                ...(outTimestamp !== undefined ? { checkOutTime: outTimestamp } : {}),
                type: 'Manual Override',
                status: editStatus,
            });

            setIsEditingAttendance(false);
            setIsCreatingAttendance(false);
        } catch (err) {
            console.error("Failed to save attendance:", err);
            alert("Failed to save attendance: " + (err.message || ""));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRecord = async () => {
        if (!currentSelectedRecord?._id) return;
        if (!confirm("Are you sure you want to delete this attendance record?")) return;
        setIsSubmitting(true);
        try {
            await deleteAttendance({ checkInId: currentSelectedRecord._id });
            setIsEditingAttendance(false);
            setIsCreatingAttendance(false);
        } catch (err) {
            console.error("Failed to delete attendance record:", err);
            alert("Failed to delete record.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyPin = (pin) => {
        if (!pin) return;
        navigator.clipboard.writeText(pin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    // Role Color Scheme
    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'Supervisor':
                return { bg: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' };
            case 'Foreman':
                return { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' };
            case 'Technician':
            default:
                return { bg: 'rgba(34, 197, 94, 0.12)', color: 'var(--accent-green)', border: '1px solid rgba(34, 197, 94, 0.3)' };
        }
    };

    // Selected Date Formatted display
    const selectedDateDisplay = useMemo(() => {
        if (!selectedDateKey) return '';
        const [y, m, d] = selectedDateKey.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [selectedDateKey]);

    if (!worker) return null;

    const roleBadge = getRoleBadgeStyle(worker.role);

    return (
        <div className="modal-overlay active" style={{ zIndex: 2500 }} onClick={onClose}>
            <div 
                className="modal" 
                style={{ 
                    maxWidth: '1080px', 
                    width: '95vw', 
                    maxHeight: '92vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    padding: 0,
                    backgroundColor: 'var(--bg-surface)'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* ── Modal Top Header ───────────────────────────────── */}
                <div style={{ 
                    padding: '16px 24px', 
                    borderBottom: '1px solid var(--border-subtle)', 
                    backgroundColor: 'var(--bg-base)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            backgroundColor: roleBadge.bg, 
                            color: roleBadge.color,
                            border: roleBadge.border,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '15px', 
                            fontWeight: 700 
                        }}>
                            {worker.initials || worker.name?.[0] || 'W'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {worker.name}
                                </h3>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    backgroundColor: roleBadge.bg,
                                    color: roleBadge.color,
                                    border: roleBadge.border
                                }}>
                                    {worker.role}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Worker Profile & Monthly Attendance Management
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onEditWorker && (
                            <button 
                                className="btn secondary" 
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => onEditWorker(worker)}
                            >
                                <Edit2 size={13} /> Edit Worker
                            </button>
                        )}
                        <button className="icon-btn close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Two-Column Main Layout ─────────────────────────── */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '320px 1fr', 
                    flex: 1, 
                    overflowY: 'auto',
                    minHeight: 0
                }}>
                    {/* ── LEFT COLUMN: Worker Profile Details ─────────── */}
                    <div style={{ 
                        padding: '24px 20px', 
                        borderRight: '1px solid var(--border-subtle)', 
                        backgroundColor: 'var(--bg-base)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        overflowY: 'auto'
                    }}>
                        {/* Profile Info Card */}
                        <div style={{ 
                            padding: '18px', 
                            backgroundColor: 'var(--bg-surface)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                                    Worker Information
                                </span>
                                {worker.isActive ? (
                                    <span className="status-pill solid-green" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                        ● Active
                                    </span>
                                ) : (
                                    <span className="status-pill solid-grey" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                        ● Inactive
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Worker ID</span>
                                    <span style={{ 
                                        fontFamily: 'monospace', 
                                        fontWeight: 700, 
                                        padding: '2px 6px',
                                        backgroundColor: 'var(--bg-base)',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {worker.displayId || worker.workerCode || 'W-000'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Full Name</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{worker.name}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Mobile Phone</span>
                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                        {worker.mobile || '—'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Role</span>
                                    <span style={{ fontWeight: 600, color: roleBadge.color }}>{worker.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Login PIN Card */}
                        <div style={{ 
                            padding: '16px', 
                            backgroundColor: 'var(--bg-surface)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <Key size={13} color="var(--accent-blue)" /> Login PIN
                                </div>
                                {copiedPin && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Copied!</span>}
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                backgroundColor: 'var(--bg-base)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <span style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '20px', 
                                    fontWeight: 700, 
                                    letterSpacing: '4px',
                                    color: 'var(--accent-blue)' 
                                }}>
                                    {worker.adminPin || '—'}
                                </span>
                                <button 
                                    className="icon-btn" 
                                    onClick={() => handleCopyPin(worker.adminPin)}
                                    title="Copy PIN"
                                    style={{ padding: '5px' }}
                                >
                                    {copiedPin ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Month Overview Stats */}
                        <div style={{ 
                            padding: '16px', 
                            backgroundColor: 'var(--bg-surface)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                                {monthName} {currentYear} Summary
                            </span>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ 
                                    padding: '12px', 
                                    backgroundColor: 'var(--bg-base)', 
                                    borderRadius: 'var(--radius-sm)', 
                                    border: '1px solid var(--border-subtle)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>
                                        {totalDaysPresentThisMonth}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Days Present
                                    </div>
                                </div>

                                <div style={{ 
                                    padding: '12px', 
                                    backgroundColor: 'var(--bg-base)', 
                                    borderRadius: 'var(--radius-sm)', 
                                    border: '1px solid var(--border-subtle)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                        {totalHoursThisMonth}h
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Hours Logged
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Calendar & Attendance Editor ────── */}
                    <div style={{ 
                        padding: '24px 28px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '20px',
                        overflowY: 'auto'
                    }}>
                        {/* Calendar Header & Month Navigation */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-base)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
                                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {monthName} {currentYear}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button 
                                    className="btn secondary" 
                                    style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}
                                    onClick={handleGoToday}
                                >
                                    Today
                                </button>
                                <button 
                                    className="icon-btn" 
                                    style={{ padding: '6px' }}
                                    onClick={handlePrevMonth}
                                    title="Previous Month"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button 
                                    className="icon-btn" 
                                    style={{ padding: '6px' }}
                                    onClick={handleNextMonth}
                                    title="Next Month"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Monthly Calendar Grid */}
                        <div style={{ 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)', 
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-surface)'
                        }}>
                            {/* Days of Week Header */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(7, 1fr)', 
                                backgroundColor: 'var(--bg-base)',
                                borderBottom: '1px solid var(--border-subtle)',
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                padding: '8px 0'
                            }}>
                                <div>SUN</div>
                                <div>MON</div>
                                <div>TUE</div>
                                <div>WED</div>
                                <div>THU</div>
                                <div>FRI</div>
                                <div>SAT</div>
                            </div>

                            {/* Calendar Days */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(7, 1fr)', 
                                gap: '1px',
                                backgroundColor: 'var(--border-subtle)'
                            }}>
                                {/* Empty prefix slots before first day */}
                                {Array.from({ length: firstDayIndex }).map((_, i) => (
                                    <div key={`empty-${i}`} style={{ minHeight: '68px', backgroundColor: 'var(--bg-base)', opacity: 0.4 }} />
                                ))}

                                {/* Day Cells */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                    const dayRecords = recordsByDate.get(dateKey) || [];
                                    const hasAttendance = dayRecords.length > 0;
                                    const isSelected = selectedDateKey === dateKey;
                                    const isToday = formatLocalDateKey(new Date()) === dateKey;

                                    const activeRecord = hasAttendance ? dayRecords[0] : null;
                                    const isOnSite = activeRecord && !activeRecord.checkOutTime;
                                    const isPending = activeRecord && activeRecord.status === 'Pending Approval';

                                    return (
                                        <div
                                            key={dateKey}
                                            onClick={() => handleSelectDate(dateKey)}
                                            style={{
                                                minHeight: '68px',
                                                padding: '6px 8px',
                                                backgroundColor: isSelected 
                                                    ? 'rgba(59, 130, 246, 0.08)' 
                                                    : hasAttendance 
                                                    ? 'var(--bg-surface)' 
                                                    : 'var(--bg-surface)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                border: isSelected ? '2px solid var(--accent-blue)' : 'none',
                                                position: 'relative',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ 
                                                    fontSize: '13px', 
                                                    fontWeight: isToday ? 800 : (isSelected ? 700 : 500),
                                                    color: isToday 
                                                        ? 'var(--accent-blue)' 
                                                        : isSelected 
                                                        ? 'var(--accent-blue)' 
                                                        : 'var(--text-primary)',
                                                    width: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    backgroundColor: isToday ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                                                }}>
                                                    {dayNum}
                                                </span>

                                                {hasAttendance && (
                                                    <span style={{
                                                        width: '7px',
                                                        height: '7px',
                                                        borderRadius: '50%',
                                                        backgroundColor: isOnSite 
                                                            ? '#22c55e' 
                                                            : isPending 
                                                            ? '#eab308' 
                                                            : '#3b82f6',
                                                        display: 'inline-block'
                                                    }} />
                                                )}
                                            </div>

                                            {hasAttendance && activeRecord ? (
                                                <div style={{ marginTop: '4px' }}>
                                                    <div style={{ 
                                                        fontSize: '10px', 
                                                        fontWeight: 700,
                                                        color: isOnSite ? '#15803d' : '#1e40af',
                                                        backgroundColor: isOnSite ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                                        borderRadius: '3px',
                                                        padding: '1px 4px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {activeRecord.hoursWorked ? `${activeRecord.hoursWorked}h` : (isOnSite ? 'On Site' : 'Present')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ minHeight: '14px' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Selected Date Attendance & Edit Access ──────── */}
                        <div style={{ 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)', 
                            backgroundColor: 'var(--bg-surface)',
                            padding: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', pb: '12px', paddingBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} color="var(--accent-blue)" />
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {selectedDateDisplay}
                                        </h4>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                                        {currentSelectedRecord ? 'Attendance recorded for this shift' : 'No attendance recorded for this date'}
                                    </span>
                                </div>

                                <div>
                                    {currentSelectedRecord && !isEditingAttendance && (
                                        <button 
                                            className="btn primary" 
                                            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => {
                                                populateEditForm(currentSelectedRecord);
                                                setIsEditingAttendance(true);
                                            }}
                                        >
                                            <Edit2 size={13} /> Edit Attendance
                                        </button>
                                    )}

                                    {!currentSelectedRecord && !isCreatingAttendance && (
                                        <button 
                                            className="btn primary" 
                                            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => {
                                                populateEditForm(null);
                                                setIsCreatingAttendance(true);
                                            }}
                                        >
                                            <Plus size={14} /> + Log Attendance for this Date
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* View Mode (Current Record Details) */}
                            {currentSelectedRecord && !isEditingAttendance && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project Site</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Building2 size={14} color="var(--accent-blue)" />
                                            {currentSelectedRecord.projectName}
                                        </div>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time In (Clock-In)</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} color="var(--accent-green)" />
                                            {currentSelectedRecord.checkInTimeStr}
                                        </div>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time Out (Clock-Out)</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: currentSelectedRecord.checkOutTimeStr ? 'var(--text-primary)' : '#22c55e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} color="var(--text-muted)" />
                                            {currentSelectedRecord.checkOutTimeStr || 'On Site (Active Shift)'}
                                        </div>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Duration & Type</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                                            {currentSelectedRecord.hoursWorked ? `${currentSelectedRecord.hoursWorked} hrs` : 'In progress'} • <span style={{ color: 'var(--text-secondary)' }}>{currentSelectedRecord.type}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inline Edit / Create Form */}
                            {(isEditingAttendance || isCreatingAttendance) && (
                                <form onSubmit={handleSaveAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Project Site <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                                            <select 
                                                value={editProjectId} 
                                                onChange={e => setEditProjectId(e.target.value)}
                                                required
                                            >
                                                {projects.map(p => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name} ({p.location})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Attendance Status</label>
                                            <select 
                                                value={editStatus} 
                                                onChange={e => setEditStatus(e.target.value)}
                                            >
                                                <option value="Verified">Verified (Regular Shift)</option>
                                                <option value="On Site">On Site (Clocked In)</option>
                                                <option value="Completed">Shift Completed</option>
                                                <option value="Pending Approval">Pending Approval (Proxy/Dispute)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Clock-In Time (Time In) <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                                            <input 
                                                type="time" 
                                                value={editTimeIn} 
                                                onChange={e => setEditTimeIn(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Clock-Out Time (Time Out) <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Leave empty if still on site)</span></label>
                                            <input 
                                                type="time" 
                                                value={editTimeOut} 
                                                onChange={e => setEditTimeOut(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                                        {isEditingAttendance ? (
                                            <button 
                                                type="button" 
                                                className="btn danger" 
                                                style={{ fontSize: '12px', padding: '6px 12px' }}
                                                onClick={handleDeleteRecord}
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 size={13} /> Delete Record
                                            </button>
                                        ) : <div />}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                type="button" 
                                                className="btn secondary" 
                                                style={{ fontSize: '12px', padding: '6px 14px' }}
                                                onClick={() => {
                                                    setIsEditingAttendance(false);
                                                    setIsCreatingAttendance(false);
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="btn primary" 
                                                style={{ fontSize: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                disabled={isSubmitting || !editProjectId || !editTimeIn}
                                            >
                                                <Save size={13} /> {isSubmitting ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Empty State */}
                            {!currentSelectedRecord && !isCreatingAttendance && (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                    <div style={{ fontSize: '13px', fontWeight: 500 }}>No check-in or shift logged on {selectedDateDisplay}.</div>
                                    <button 
                                        className="btn text-btn" 
                                        style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 600 }}
                                        onClick={() => {
                                            populateEditForm(null);
                                            setIsCreatingAttendance(true);
                                        }}
                                    >
                                        + Click here to add a shift for this date
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Modal Bottom Bar ───────────────────────────────── */}
                <div style={{ 
                    padding: '12px 24px', 
                    borderTop: '1px solid var(--border-subtle)', 
                    backgroundColor: 'var(--bg-base)', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        All attendance changes reflect in real-time across both Admin and Supervisor dashboards.
                    </span>
                    <button className="btn secondary" onClick={onClose} style={{ padding: '6px 16px' }}>
                        Done / Close
                    </button>
                </div>
            </div>
        </div>
    );
}
