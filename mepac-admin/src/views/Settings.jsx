import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
    Building2, 
    Users, 
    Sliders, 
    ShieldAlert, 
    UploadCloud, 
    Trash2, 
    ArrowRight, 
    Clock, 
    CalendarDays, 
    MapPin, 
    Map, 
    AlertTriangle, 
    CheckSquare
} from 'lucide-react';
import ManageUsers from './ManageUsers';
import GeofencePreviewMap from '../components/GeofencePreviewMap';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('company');
    const [showManageUsers, setShowManageUsers] = useState(false);

    // Convex data
    const settingsData = useQuery(api.settings.get);
    const saveSettings = useMutation(api.settings.save);
    const generateUploadUrl = useMutation(api.settings.generateUploadUrl);

    // Form States
    const [companyProfile, setCompanyProfile] = useState({
        name: '', email: '', phone: '', address: '', logo: 'cloud_upload', logoPreview: null
    });
    const [workingHours, setWorkingHours] = useState({
        shiftStart: '08:00', shiftEnd: '17:00', lateBuffer: '15 minutes', autoAbsent: '4 hours'
    });
    const [workWeek, setWorkWeek] = useState({
        M: true, T: true, W: true, T1: true, F: true, S1: true, S2: false
    });
    const [holidays, setHolidays] = useState([]);
    const [geofence, setGeofence] = useState({ enforceGps: false, radius: 200 });
    const [alerts, setAlerts] = useState({
        silentAlert: '24 hours', proxyReminder: '3 days', disputeResolution: '5 days'
    });
    const [attendanceRules, setAttendanceRules] = useState({
        requirePhoto: false, allowSelfClockIn: true, requireReason: true
    });

    // UI States
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDay, setNewHolidayDay] = useState('');
    const [newHolidayMonth, setNewHolidayMonth] = useState('');
    const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Populate form from Convex data
    useEffect(() => {
        if (settingsData && !hasLoaded) {
            populateFromData(settingsData);
            setHasLoaded(true);
        }
    }, [settingsData, hasLoaded]);

    const populateFromData = (data) => {
        setCompanyProfile({
            name: data.companyName || '',
            email: data.companyEmail || '',
            phone: data.companyPhone || '',
            address: data.companyAddress || '',
            logo: 'cloud_upload',
            logoPreview: data.logoUrl || null,
            logoStorageId: data.logoStorageId || null,
        });
        setWorkingHours({
            shiftStart: data.shiftStart || '08:00',
            shiftEnd: data.shiftEnd || '17:00',
            lateBuffer: data.lateBuffer || '15 minutes',
            autoAbsent: data.autoAbsent || '4 hours',
        });
        setWorkWeek(data.workWeek || {
            M: true, T: true, W: true, T1: true, F: true, S1: true, S2: false
        });
        setHolidays((data.holidays || []).map((h, i) => ({ ...h, id: i + 1 })));
        setGeofence({
            enforceGps: data.enforceGps ?? false,
            radius: data.geofenceRadius ?? 200,
        });
        setAlerts({
            silentAlert: data.silentAlert || '24 hours',
            proxyReminder: data.proxyReminder || '3 days',
            disputeResolution: data.disputeResolution || '5 days',
        });
        setAttendanceRules({
            requirePhoto: data.requirePhoto ?? false,
            allowSelfClockIn: data.allowSelfClockIn ?? true,
            requireReason: data.requireReason ?? true,
        });
    };

    const handleSave = async () => {
        if (companyProfile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyProfile.email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setIsSaving(true);

        try {
            let logoStorageId = companyProfile.logoStorageId || undefined;

            // Upload logo if a new file was selected
            if (logoFile) {
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": logoFile.type },
                    body: logoFile,
                });
                const { storageId } = await result.json();
                logoStorageId = storageId;
            }

            await saveSettings({
                companyName: companyProfile.name,
                companyEmail: companyProfile.email,
                companyPhone: companyProfile.phone,
                companyAddress: companyProfile.address,
                ...(logoStorageId ? { logoStorageId } : {}),

                shiftStart: workingHours.shiftStart,
                shiftEnd: workingHours.shiftEnd,
                lateBuffer: workingHours.lateBuffer,
                autoAbsent: workingHours.autoAbsent,

                workWeek,

                holidays: holidays.map(h => ({ name: h.name, date: h.date })),

                enforceGps: geofence.enforceGps,
                geofenceRadius: geofence.radius,

                silentAlert: alerts.silentAlert,
                proxyReminder: alerts.proxyReminder,
                disputeResolution: alerts.disputeResolution,

                requirePhoto: attendanceRules.requirePhoto,
                allowSelfClockIn: attendanceRules.allowSelfClockIn,
                requireReason: attendanceRules.requireReason,
            });

            setIsEditing(false);
            setLogoFile(null);
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveMessage('Failed to save settings.');
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        if (settingsData) {
            populateFromData(settingsData);
        }
        setLogoFile(null);
        setEmailError('');
        setIsEditing(false);
        setSaveMessage('Changes discarded.');
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const toggleWeekday = (dayKey) => {
        setWorkWeek(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formatDateDisplay = (ddmm) => {
        if (!ddmm) return '';
        const [day, month] = ddmm.split('/');
        const monthIdx = parseInt(month, 10) - 1;
        return `${day} ${monthNames[monthIdx] || month}`;
    };

    const getDaysForMonth = (month) => {
        if (!month) return 31;
        const m = parseInt(month, 10);
        if ([4, 6, 9, 11].includes(m)) return 30;
        if (m === 2) return 29;
        return 31;
    };

    const handleAddHoliday = (e) => {
        e.preventDefault();
        if (!newHolidayName.trim() || !newHolidayDay || !newHolidayMonth) return;
        const dd = newHolidayDay.padStart(2, '0');
        const mm = newHolidayMonth.padStart(2, '0');
        setHolidays(prev => [...prev, {
            id: Date.now(),
            name: newHolidayName.trim(),
            date: `${dd}/${mm}`
        }]);
        setNewHolidayName('');
        setNewHolidayDay('');
        setNewHolidayMonth('');
        setShowAddHolidayForm(false);
    };

    const handleDeleteHoliday = (id) => {
        setHolidays(prev => prev.filter(h => h.id !== id));
    };

    const handleCompanyNameChange = (e) => {
        setCompanyProfile(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9-_\s]/g, '') }));
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
            setCompanyProfile(prev => ({ ...prev, phone: val }));
        }
    };

    const handleEmailChange = (e) => {
        setCompanyProfile(prev => ({ ...prev, email: e.target.value }));
        if (emailError) setEmailError('');
    };

    const handleEmailBlur = (e) => {
        const val = e.target.value;
        if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            setEmailError('Please enter a valid email address.');
        }
    };

    const handleHolidayNameChange = (e) => {
        setNewHolidayName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
    };

    // Show loading state while data is being fetched
    if (!settingsData) {
        return (
            <section className="view active">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                    Loading settings...
                </div>
            </section>
        );
    }

    if (showManageUsers) {
        return (
            <section className="view active">
                <ManageUsers onBack={() => setShowManageUsers(false)} />
            </section>
        );
    }

    return (
        <section className="view active">
            <div className="view-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {companyProfile.logoPreview ? (
                        <img src={companyProfile.logoPreview} alt="Company Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: '#fff' }} />
                    ) : (
                        <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    )}
                    <div>
                        <h2>Settings</h2>
                        <p className="subtitle">Manage global configuration for the MEPac administrative environment.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {saveMessage && (
                        <span style={{
                            fontSize: '14px',
                            color: saveMessage.includes('saved') ? 'var(--accent-green)' : 'var(--text-muted)',
                            fontWeight: '500'
                        }}>
                            {saveMessage}
                        </span>
                    )}
                    {!isEditing ? (
                        <button className="btn primary" onClick={() => setIsEditing(true)}>Edit Settings</button>
                    ) : (
                        <>
                            <button className="btn secondary" onClick={handleDiscard} disabled={isSaving}>Discard</button>
                            <button className="btn primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="settings-top-tabs">
                <button
                    className={`settings-top-tab-btn ${activeTab === 'company' ? 'active' : ''}`}
                    onClick={() => setActiveTab('company')}
                >
                    <Building2 size={16} /> Company &amp; Access
                </button>
                <button
                    className={`settings-top-tab-btn ${activeTab === 'operational' ? 'active' : ''}`}
                    onClick={() => setActiveTab('operational')}
                >
                    <Sliders size={16} /> Operational Rules
                </button>
                <button
                    className={`settings-top-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alerts')}
                >
                    <ShieldAlert size={16} /> Alerts &amp; Governance
                </button>
            </div>

            {/* Panels Container */}
            <div className="settings-content">

                {/* TAB CONTENT: COMPANY & ACCESS */}
                {activeTab === 'company' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* 1. Company Profile */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Building2 size={24} style={{ color: 'var(--accent-blue)' }} />
                                    <h3 style={{ margin: 0 }}>Company Profile</h3>
                                </div>
                            </div>

                            <div className="form-row" style={{ alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Company Name</label>
                                        <input
                                            type="text"
                                            value={companyProfile.name}
                                            onChange={handleCompanyNameChange}
                                            maxLength={50}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={companyProfile.email}
                                            onChange={handleEmailChange}
                                            onBlur={handleEmailBlur}
                                            style={{ borderColor: emailError ? 'var(--accent-red)' : '' }}
                                            disabled={!isEditing}
                                        />
                                        {emailError && <span style={{ color: 'var(--accent-red)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{emailError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={companyProfile.phone}
                                            onChange={handlePhoneChange}
                                            maxLength={10}
                                            placeholder="10 digits only"
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Registered Address</label>
                                        <textarea
                                            rows="2"
                                            value={companyProfile.address}
                                            onChange={(e) => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))}
                                            maxLength={300}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Company Logo</label>
                                    <input 
                                        type="file" 
                                        id="logo-upload-input" 
                                        accept="image/*" 
                                        style={{ display: 'none' }} 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                const previewUrl = URL.createObjectURL(file);
                                                setLogoFile(file);
                                                setCompanyProfile(prev => ({ ...prev, logo: file.name, logoPreview: previewUrl }));
                                            }
                                        }} 
                                    />
                                    <div style={{ 
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: isEditing ? 'pointer' : 'default', 
                                        border: '2px dashed var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--bg-base)',
                                        transition: 'border-color 0.2s',
                                        opacity: isEditing ? 1 : 0.6,
                                        pointerEvents: isEditing ? 'auto' : 'none',
                                        minHeight: '120px'
                                    }} 
                                    onClick={() => document.getElementById('logo-upload-input').click()}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                                    >
                                        {companyProfile.logoPreview ? (
                                            <img src={companyProfile.logoPreview} alt="Logo" style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain', borderRadius: '8px', marginBottom: '8px' }} />
                                        ) : (
                                            <UploadCloud size={32} style={{ color: 'var(--accent-blue)', marginBottom: '8px' }} />
                                        )}
                                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                            {companyProfile.logo !== 'cloud_upload' ? companyProfile.logo : 'Click to upload logo'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, SVG up to 2MB</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Management Section */}
                        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div className="avatar-large" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={24} style={{ color: 'var(--accent-blue)' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', margin: 0 }}>User Management</h3>
                                    <p className="subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>Manage user accounts, roles, and permissions.</p>
                                </div>
                            </div>
                            <button className="btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowManageUsers(true)}>
                                Manage Users <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: OPERATIONAL RULES */}
                {activeTab === 'operational' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Default Working Hours */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Clock size={24} style={{ color: 'var(--accent-blue)' }} />
                                    <h3 style={{ margin: 0 }}>Default Working Hours</h3>
                                </div>
                            </div>

                            <div className="form-row">
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Shift Start</label>
                                        <input
                                            type="time"
                                            value={workingHours.shiftStart}
                                            onChange={(e) => setWorkingHours(prev => ({ ...prev, shiftStart: e.target.value }))}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Shift End</label>
                                        <input
                                            type="time"
                                            value={workingHours.shiftEnd}
                                            onChange={(e) => setWorkingHours(prev => ({ ...prev, shiftEnd: e.target.value }))}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Late Buffer</label>
                                        <select
                                            value={workingHours.lateBuffer}
                                            onChange={(e) => setWorkingHours(prev => ({ ...prev, lateBuffer: e.target.value }))}
                                            disabled={!isEditing}
                                        >
                                            <option value="0 minutes">0 minutes</option>
                                            <option value="5 minutes">5 minutes</option>
                                            <option value="15 minutes">15 minutes</option>
                                            <option value="30 minutes">30 minutes</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Auto-Mark Absent After</label>
                                        <select
                                            value={workingHours.autoAbsent}
                                            onChange={(e) => setWorkingHours(prev => ({ ...prev, autoAbsent: e.target.value }))}
                                            disabled={!isEditing}
                                        >
                                            <option value="2 hours">2 hours</option>
                                            <option value="4 hours">4 hours</option>
                                            <option value="End of Shift">End of Shift</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Working Days & Holidays */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CalendarDays size={24} style={{ color: 'var(--accent-blue)' }} />
                                    <h3 style={{ margin: 0 }}>Working Days &amp; Holidays</h3>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Standard Work Week</label>
                                <div className="weekday-container" style={{ opacity: isEditing ? 1 : 0.6, pointerEvents: isEditing ? 'auto' : 'none' }}>
                                    <button className={`weekday-btn ${workWeek.M ? 'active' : ''}`} onClick={() => toggleWeekday('M')}>M</button>
                                    <button className={`weekday-btn ${workWeek.T ? 'active' : ''}`} onClick={() => toggleWeekday('T')}>T</button>
                                    <button className={`weekday-btn ${workWeek.W ? 'active' : ''}`} onClick={() => toggleWeekday('W')}>W</button>
                                    <button className={`weekday-btn ${workWeek.T1 ? 'active' : ''}`} onClick={() => toggleWeekday('T1')}>T</button>
                                    <button className={`weekday-btn ${workWeek.F ? 'active' : ''}`} onClick={() => toggleWeekday('F')}>F</button>
                                    <button className={`weekday-btn ${workWeek.S1 ? 'active' : ''}`} onClick={() => toggleWeekday('S1')}>S</button>
                                    <button className={`weekday-btn ${workWeek.S2 ? 'active' : ''}`} onClick={() => toggleWeekday('S2')}>S</button>
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Recognized Holidays</label>
                                    <button className="btn text-btn" style={{ color: isEditing ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: '600' }} onClick={() => setShowAddHolidayForm(!showAddHolidayForm)} disabled={!isEditing}>
                                        + Add Holiday
                                    </button>
                                </div>

                                {showAddHolidayForm && (
                                    <form onSubmit={handleAddHoliday} style={{ display: 'flex', gap: '12px', padding: '16px', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '16px', alignItems: 'flex-end' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px' }}>Holiday Name</label>
                                            <input type="text" placeholder="Holiday name" value={newHolidayName} onChange={handleHolidayNameChange} maxLength={50} required />
                                        </div>
                                        <div className="form-group" style={{ width: '80px' }}>
                                            <label style={{ fontSize: '12px' }}>Day</label>
                                            <select value={newHolidayDay} onChange={(e) => setNewHolidayDay(e.target.value)} required>
                                                <option value="">--</option>
                                                {Array.from({ length: getDaysForMonth(newHolidayMonth) }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={String(d)}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ width: '120px' }}>
                                            <label style={{ fontSize: '12px' }}>Month</label>
                                            <select value={newHolidayMonth} onChange={(e) => { setNewHolidayMonth(e.target.value); if (newHolidayDay && parseInt(newHolidayDay) > getDaysForMonth(e.target.value)) setNewHolidayDay(''); }} required>
                                                <option value="">--</option>
                                                {monthNames.map((m, i) => (
                                                    <option key={m} value={String(i + 1)}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button type="submit" className="btn primary" style={{ height: '38px' }}>Add</button>
                                    </form>
                                )}

                                <ul className="holiday-list">
                                    {holidays.map(h => (
                                        <li className="holiday-item" key={h.id}>
                                            <span className="holiday-name">{formatDateDisplay(h.date)} – {h.name}</span>
                                            <button
                                                className="btn text-btn"
                                                style={{ color: isEditing ? 'var(--text-muted)' : 'var(--border-subtle)', display: 'inline-flex', alignItems: 'center' }}
                                                onClick={() => handleDeleteHoliday(h.id)}
                                                disabled={!isEditing}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Geofence Verification */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <MapPin size={24} style={{ color: 'var(--accent-blue)' }} />
                                    <h3 style={{ margin: 0 }}>Geofence Verification</h3>
                                </div>
                            </div>

                            <div className="form-row">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Enforce GPS Verification</h4>
                                            <p className="subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>Require devices to be within project boundaries to clock in.</p>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={geofence.enforceGps}
                                                onChange={(e) => setGeofence(prev => ({ ...prev, enforceGps: e.target.checked }))}
                                                disabled={!isEditing}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label>Allowed Radius (meters)</label>
                                        <input
                                            type="number"
                                            value={geofence.radius}
                                            disabled={!geofence.enforceGps || !isEditing}
                                            onChange={(e) => setGeofence(prev => ({ ...prev, radius: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="subtitle" style={{ fontSize: '11px', marginTop: '4px' }}>
                                            {geofence.enforceGps ? 'Specify radius margin for check-in eligibility.' : 'Enable GPS verification to modify radius.'}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <GeofencePreviewMap radius={geofence.radius} enforceGps={geofence.enforceGps} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: ALERTS & GOVERNANCE */}
                {activeTab === 'alerts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Alert Thresholds */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertTriangle size={24} style={{ color: 'var(--accent-amber)' }} />
                                    <h3 style={{ margin: 0 }}>Alert Thresholds</h3>
                                </div>
                            </div>
                            <p className="subtitle" style={{ fontSize: '13px', marginBottom: '20px' }}>Configure when the system should escalate issues based on "Management by Exception" rules.</p>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Silent Site Alert</label>
                                    <select
                                        value={alerts.silentAlert}
                                        onChange={(e) => setAlerts(prev => ({ ...prev, silentAlert: e.target.value }))}
                                        disabled={!isEditing}
                                    >
                                        <option value="12 hours">12 hours</option>
                                        <option value="24 hours">24 hours</option>
                                        <option value="48 hours">48 hours</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Proxy Review Reminder</label>
                                    <select
                                        value={alerts.proxyReminder}
                                        onChange={(e) => setAlerts(prev => ({ ...prev, proxyReminder: e.target.value }))}
                                        disabled={!isEditing}
                                    >
                                        <option value="1 day">1 day</option>
                                        <option value="3 days">3 days</option>
                                        <option value="7 days">7 days</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Dispute Resolution</label>
                                    <select
                                        value={alerts.disputeResolution}
                                        onChange={(e) => setAlerts(prev => ({ ...prev, disputeResolution: e.target.value }))}
                                        disabled={!isEditing}
                                    >
                                        <option value="3 days">3 days</option>
                                        <option value="5 days">5 days</option>
                                        <option value="10 days">10 days</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Rules */}
                        <div className="panel">
                            <div className="panel-header" style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckSquare size={24} style={{ color: 'var(--accent-blue)' }} />
                                    <h3 style={{ margin: 0 }}>Attendance Rules</h3>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Require Photo for Proxy Attendance</h4>
                                        <p className="subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>Mandate a live photo capture when a supervisor marks attendance for a worker.</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={attendanceRules.requirePhoto}
                                            onChange={(e) => setAttendanceRules(prev => ({ ...prev, requirePhoto: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Allow Self Clock-In Outside Shift</h4>
                                        <p className="subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>Workers can check in before the official shift start time.</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={attendanceRules.allowSelfClockIn}
                                            onChange={(e) => setAttendanceRules(prev => ({ ...prev, allowSelfClockIn: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Manual Attendance Requires Admin Reason</h4>
                                        <p className="subtitle" style={{ fontSize: '12px', marginTop: '4px' }}>Force input of a justification text when overriding system attendance.</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={attendanceRules.requireReason}
                                            onChange={(e) => setAttendanceRules(prev => ({ ...prev, requireReason: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
