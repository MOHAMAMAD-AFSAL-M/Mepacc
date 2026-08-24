import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, MoreVertical, Key, UserX, UserCheck, Trash2, X, AlertTriangle, Copy, Check, ChevronDown, ChevronRight, RefreshCcw, Edit2, User } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import EditWorkerModal from '../components/modals/EditWorkerModal';
import WorkerProfileModal from '../components/modals/WorkerProfileModal';

export default function Workforce({ openModal, workforce = [], projects = [] }) {
    const [activeTab, setActiveTab] = useState('Supervisor');
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuWorkerId, setOpenMenuWorkerId] = useState(null);
    const [workerToDelete, setWorkerToDelete] = useState(null);
    const [workerToDeactivate, setWorkerToDeactivate] = useState(null);
    const [workerForPin, setWorkerForPin] = useState(null);
    const [workerToEdit, setWorkerToEdit] = useState(null);
    const [workerForProfile, setWorkerForProfile] = useState(null);
    const [copiedPin, setCopiedPin] = useState(false);
    const [inactiveExpanded, setInactiveExpanded] = useState(true);


    // Convex Mutations
    const toggleStatus = useMutation(api.workers.toggleStatus);
    const removeWorker = useMutation(api.workers.remove);
    const resetPinMutation = useMutation(api.workers.resetPin);
    const [workerToResetPin, setWorkerToResetPin] = useState(null);
    const [isResettingPin, setIsResettingPin] = useState(false);

    const menuRef = useRef(null);

    // Close action menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuWorkerId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const supervisors = workforce.filter(w => w.role === 'Supervisor');
    const foremen = workforce.filter(w => w.role === 'Foreman');
    const technicians = workforce.filter(w => w.role === 'Technician');
    const designers = workforce.filter(w => w.role === 'Designer');

    const getTabWorkers = () => {
        switch (activeTab) {
            case 'Supervisor': return supervisors;
            case 'Foreman': return foremen;
            case 'Technician': return technicians;
            case 'Designer': return designers;
            default: return [];
        }
    };

    const currentWorkers = getTabWorkers();

    const filteredWorkers = currentWorkers.filter(w => {
        const query = searchQuery.toLowerCase();
        return (
            w.name.toLowerCase().includes(query) ||
            (w.displayId && w.displayId.toLowerCase().includes(query)) ||
            (w.mobile && w.mobile.includes(query))
        );
    });

    const activeWorkers = filteredWorkers.filter(w => w.isActive);
    const inactiveWorkers = filteredWorkers.filter(w => !w.isActive);

    const handleActionClick = (worker, e) => {
        e.stopPropagation();
        setOpenMenuWorkerId(null);
        if (worker.isActive) {
            // Confirm deactivation
            setWorkerToDeactivate(worker);
        } else {
            // Reactivate directly
            toggleStatus({ workerId: worker._id }).catch(err => {
                console.error("Failed to activate worker:", err);
                alert("Could not activate worker.");
            });
        }
    };

    const confirmDeactivation = async () => {
        if (!workerToDeactivate) return;
        try {
            await toggleStatus({ workerId: workerToDeactivate._id });
            setWorkerToDeactivate(null);
        } catch (err) {
            console.error("Failed to deactivate worker:", err);
            alert("Could not deactivate worker.");
        }
    };

    const handleDeleteWorker = async () => {
        if (!workerToDelete) return;
        try {
            await removeWorker({ workerId: workerToDelete._id });
            setWorkerToDelete(null);
        } catch (err) {
            console.error("Failed to delete worker:", err);
            alert("Failed to delete worker. " + (err.message || ""));
        }
    };

    const handleCopyPin = (pin) => {
        navigator.clipboard.writeText(pin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const renderWorkerRow = (w) => {
        return (
            <tr 
                key={w._id}
                onClick={() => setWorkerForProfile(w)}
                style={{ cursor: 'pointer' }}
                className="worker-table-row"
                title="Click to view worker profile & attendance history"
            >
                <td style={{ width: '130px' }}>
                    <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 600, 
                        fontSize: '13px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-surface-hover)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        color: w.isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                        {w.displayId || 'W-000'}
                    </span>
                </td>
                <td style={{ width: 'auto' }}>
                    <div className="worker-cell" style={{ opacity: w.isActive ? 1 : 0.8 }}>
                        <div className="avatar-small blue" style={{ filter: w.isActive ? 'none' : 'grayscale(60%)' }}>{w.initials}</div>
                        <div>
                            <div style={{ fontWeight: 600, color: w.isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{w.name}</div>
                        </div>
                    </div>
                </td>
                <td style={{ width: '220px', fontVariantNumeric: 'tabular-nums', color: w.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {w.mobile}
                </td>
                <td style={{ width: '160px' }}>
                    {w.isActive ? (
                        <span className="status-pill solid-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                            Active
                        </span>
                    ) : (
                        <span className="status-pill solid-grey" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></span>
                            Inactive
                        </span>
                    )}
                </td>
                <td style={{ width: '110px', textAlign: 'right', paddingRight: '28px', position: 'relative' }}>
                    <button 
                        className="icon-btn" 
                        style={{ padding: '6px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuWorkerId(openMenuWorkerId === w._id ? null : w._id);
                        }}
                        title="Actions"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {openMenuWorkerId === w._id && (
                        <div 
                            ref={menuRef}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: '20px',
                                width: '230px',
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 1000,
                                overflow: 'hidden',
                                textAlign: 'left'
                            }}
                        >
                            <div style={{ padding: '6px' }}>
                                <button 
                                    className="btn text-btn" 
                                    style={{ width: '100%', padding: '10px 14px', justifyContent: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuWorkerId(null);
                                        setWorkerForProfile(w);
                                    }}
                                >
                                    <User size={16} color="var(--accent-blue)" />
                                    View Profile & Attendance
                                </button>

                                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }}></div>

                                <button 
                                    className="btn text-btn" 
                                    style={{ width: '100%', padding: '10px 14px', justifyContent: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 500 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuWorkerId(null);
                                        setWorkerToEdit(w);
                                    }}
                                >
                                    <Edit2 size={16} color="var(--text-secondary)" />
                                    Edit Worker Details
                                </button>

                                <button 
                                    className="btn text-btn" 
                                    style={{ width: '100%', padding: '10px 14px', justifyContent: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 500 }}
                                    onClick={(e) => handleActionClick(w, e)}
                                >
                                    {w.isActive ? (
                                        <>
                                            <UserX size={16} color="var(--text-muted)" />
                                            Deactivate Worker
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck size={16} color="var(--accent-green)" />
                                            Activate Worker
                                        </>
                                    )}
                                </button>

                                <button 
                                    className="btn text-btn" 
                                    style={{ width: '100%', padding: '10px 14px', justifyContent: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 500 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuWorkerId(null);
                                        setWorkerForPin(w);
                                    }}
                                >
                                    <Key size={16} color="var(--accent-blue)" />
                                    Show Login PIN
                                </button>

                                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '6px 0' }}></div>

                                <button 
                                    className="btn text-btn" 
                                    style={{ width: '100%', padding: '10px 14px', justifyContent: 'flex-start', gap: '10px', fontSize: '14px', fontWeight: 500, color: 'var(--accent-red)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuWorkerId(null);
                                        setWorkerToDelete(w);
                                    }}
                                >
                                    <Trash2 size={16} color="var(--accent-red)" />
                                    Delete Worker
                                </button>
                            </div>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    return (
        <section className="view active">
            <div className="view-header">
                <div>
                    <h2>Workforce</h2>
                    <p className="subtitle">Manage all site personnel, supervisors, and technicians.</p>
                </div>
                <button className="btn primary" onClick={() => openModal('add-worker')}>+ Add Worker</button>
            </div>

            {/* Role Tabs */}
            <div className="settings-top-tabs" style={{ marginBottom: '20px' }}>
                <button 
                    className={`settings-top-tab-btn ${activeTab === 'Supervisor' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('Supervisor'); setOpenMenuWorkerId(null); }}
                >
                    Supervisors
                    <span style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: activeTab === 'Supervisor' ? 'var(--accent-blue-bg)' : 'var(--bg-surface-hover)',
                        color: activeTab === 'Supervisor' ? 'var(--accent-blue)' : 'var(--text-muted)'
                    }}>
                        {supervisors.length}
                    </span>
                </button>
                <button 
                    className={`settings-top-tab-btn ${activeTab === 'Foreman' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('Foreman'); setOpenMenuWorkerId(null); }}
                >
                    Foremen
                    <span style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: activeTab === 'Foreman' ? 'var(--accent-blue-bg)' : 'var(--bg-surface-hover)',
                        color: activeTab === 'Foreman' ? 'var(--accent-blue)' : 'var(--text-muted)'
                    }}>
                        {foremen.length}
                    </span>
                </button>
                <button 
                    className={`settings-top-tab-btn ${activeTab === 'Technician' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('Technician'); setOpenMenuWorkerId(null); }}
                >
                    Technicians
                    <span style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: activeTab === 'Technician' ? 'var(--accent-blue-bg)' : 'var(--bg-surface-hover)',
                        color: activeTab === 'Technician' ? 'var(--accent-blue)' : 'var(--text-muted)'
                    }}>
                        {technicians.length}
                    </span>
                </button>
                <button 
                    className={`settings-top-tab-btn ${activeTab === 'Designer' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('Designer'); setOpenMenuWorkerId(null); }}
                >
                    Designers
                    <span style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: activeTab === 'Designer' ? 'var(--accent-blue-bg)' : 'var(--bg-surface-hover)',
                        color: activeTab === 'Designer' ? 'var(--accent-blue)' : 'var(--text-muted)'
                    }}>
                        {designers.length}
                    </span>
                </button>
            </div>

            <div className="panel">
                <div className="panel-header">
                    <h3>{activeTab} Directory</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="search-container" style={{ width: '260px' }}>
                            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab.toLowerCase()}s...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Active Workers Table */}
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '130px' }}>ID</th>
                            <th style={{ width: 'auto' }}>NAME</th>
                            <th style={{ width: '220px' }}>MOBILE NUMBER</th>
                            <th style={{ width: '160px' }}>STATUS</th>
                            <th style={{ textAlign: 'right', width: '110px', paddingRight: '28px' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeWorkers.length > 0 ? (
                            activeWorkers.map(w => renderWorkerRow(w))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                                    {inactiveWorkers.length > 0 ? `No active ${activeTab.toLowerCase()}s.` : `No ${activeTab.toLowerCase()}s found.`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Inactive Workers Section at Bottom */}
                {inactiveWorkers.length > 0 && (
                    <div style={{ marginTop: '36px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                marginBottom: '14px',
                                userSelect: 'none'
                            }}
                            onClick={() => setInactiveExpanded(prev => !prev)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {inactiveExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} />}
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Inactive {activeTab}s ({inactiveWorkers.length})
                                </h4>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {inactiveExpanded ? 'Click to collapse' : 'Click to expand'}
                            </span>
                        </div>

                        {inactiveExpanded && (
                            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '130px' }}>ID</th>
                                        <th style={{ width: 'auto' }}>NAME</th>
                                        <th style={{ width: '220px' }}>MOBILE NUMBER</th>
                                        <th style={{ width: '160px' }}>STATUS</th>
                                        <th style={{ textAlign: 'right', width: '110px', paddingRight: '28px' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inactiveWorkers.map(w => renderWorkerRow(w))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Show PIN Modal */}
            {workerForPin && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setWorkerForPin(null)}>
                    <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'var(--accent-blue-bg)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Key size={18} color="var(--accent-blue)" />
                                </div>
                                <h3 style={{ margin: 0 }}>Worker Login PIN</h3>
                            </div>
                            <button className="icon-btn close-btn" onClick={() => setWorkerForPin(null)}><X size={18} /></button>
                        </div>
                        
                        <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{workerForPin.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {workerForPin.displayId} • {workerForPin.role}
                            </div>

                            <div style={{ 
                                margin: '20px auto 12px auto',
                                padding: '16px 24px',
                                backgroundColor: 'var(--bg-base)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-lg)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <span style={{ 
                                    fontSize: '28px', 
                                    fontWeight: 700, 
                                    letterSpacing: '6px', 
                                    fontFamily: 'monospace',
                                    color: 'var(--accent-blue)'
                                }}>
                                    {workerForPin.adminPin || '—'}
                                </span>
                                <button 
                                    className="icon-btn" 
                                    onClick={() => handleCopyPin(workerForPin.adminPin || '')}
                                    title="Copy PIN"
                                    style={{ padding: '6px' }}
                                >
                                    {copiedPin ? <Check size={18} color="#22c55e" /> : <Copy size={18} />}
                                </button>
                            </div>
                            {copiedPin && <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>PIN copied to clipboard!</div>}

                            {!workerForPin.pinIsDefault && (
                                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--accent-amber-border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    This worker has changed their PIN. The above is the admin-set default.
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                className="btn secondary" 
                                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }} 
                                onClick={() => {
                                    setWorkerToResetPin(workerForPin);
                                    setWorkerForPin(null);
                                }}
                            >
                                <RefreshCcw size={16} /> Reset PIN to Default
                            </button>
                            <button 
                                className="btn primary" 
                                style={{ flex: 1, justifyContent: 'center', display: 'flex' }} 
                                onClick={() => setWorkerForPin(null)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Deactivate Worker Confirmation Modal */}
            {workerToDeactivate && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setWorkerToDeactivate(null)}>
                    <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserX size={20} color="#eab308" />
                                </div>
                                <h3 style={{ margin: 0 }}>Deactivate Worker</h3>
                            </div>
                            <button className="icon-btn close-btn" onClick={() => setWorkerToDeactivate(null)}><X size={18} /></button>
                        </div>
                        
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Are you sure you want to deactivate <strong>{workerToDeactivate.name}</strong> ({workerToDeactivate.displayId})?
                            </p>
                            <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '13px' }}>
                                They will be moved to the Inactive {workerToDeactivate.role}s list. You can reactivate them at any time.
                            </p>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn secondary" onClick={() => setWorkerToDeactivate(null)}>Cancel</button>
                            <button 
                                className="btn primary" 
                                style={{ backgroundColor: '#eab308', borderColor: '#eab308', color: '#000' }} 
                                onClick={confirmDeactivation}
                            >
                                Deactivate Worker
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Worker Confirmation Modal */}
            {workerToDelete && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setWorkerToDelete(null)}>
                    <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} color="var(--accent-red)" />
                                </div>
                                <h3 style={{ margin: 0 }}>Delete Worker</h3>
                            </div>
                            <button className="icon-btn close-btn" onClick={() => setWorkerToDelete(null)}><X size={18} /></button>
                        </div>
                        
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Are you sure you want to permanently delete <strong>{workerToDelete.name}</strong> ({workerToDelete.displayId})?
                            </p>
                            <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '13px' }}>
                                This action cannot be undone. This worker will also be removed from any assigned projects.
                            </p>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn secondary" onClick={() => setWorkerToDelete(null)}>Cancel</button>
                            <button className="btn danger" onClick={handleDeleteWorker}>Delete Worker</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Reset PIN Confirmation Modal */}
            {workerToResetPin && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setWorkerToResetPin(null)}>
                    <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RefreshCcw size={20} color="#eab308" />
                                </div>
                                <h3 style={{ margin: 0 }}>Reset PIN to Default</h3>
                            </div>
                            <button className="icon-btn close-btn" onClick={() => setWorkerToResetPin(null)}><X size={18} /></button>
                        </div>
                        
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Are you sure you want to reset <strong>{workerToResetPin.name}</strong>'s PIN back to the admin-set default (<strong style={{ fontFamily: 'monospace' }}>{workerToResetPin.adminPin}</strong>)?
                            </p>
                            <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '13px' }}>
                                The worker will be required to change their PIN on their next login.
                            </p>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn secondary" onClick={() => setWorkerToResetPin(null)} disabled={isResettingPin}>Cancel</button>
                            <button className="btn primary" disabled={isResettingPin} onClick={async () => {
                                setIsResettingPin(true);
                                try {
                                    await resetPinMutation({ workerId: workerToResetPin._id });
                                    setWorkerToResetPin(null);
                                } catch (err) {
                                    alert('Failed to reset PIN: ' + (err.message || 'Unknown error'));
                                } finally {
                                    setIsResettingPin(false);
                                }
                            }}>
                                {isResettingPin ? 'Resetting...' : 'Reset PIN'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Worker Profile Modal */}
            {workerToEdit && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setWorkerToEdit(null)}>
                    <EditWorkerModal
                        worker={workerToEdit}
                        onClose={() => setWorkerToEdit(null)}
                    />
                </div>,
                document.body
            )}

            {/* Worker Profile & Attendance Modal */}
            {workerForProfile && createPortal(
                <WorkerProfileModal
                    worker={workerForProfile}
                    onClose={() => setWorkerForProfile(null)}
                    onEditWorker={(w) => {
                        setWorkerForProfile(null);
                        setWorkerToEdit(w);
                    }}
                    onShowPin={(w) => {
                        setWorkerForProfile(null);
                        setWorkerForPin(w);
                    }}
                    projects={projects}
                    workforce={workforce}
                />,
                document.body
            )}
        </section>
    );
}
