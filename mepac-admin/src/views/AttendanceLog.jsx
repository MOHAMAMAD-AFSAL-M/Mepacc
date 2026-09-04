import React, { useState, useMemo } from 'react';
import { Download, Search, Settings, Clock, Plus, Edit2 } from 'lucide-react';
import ManualAttendanceModal from '../components/modals/ManualAttendanceModal';

export default function AttendanceLog({ setActiveView, projects = [], checkIns = [], workforce = [] }) {
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showManualModal, setShowManualModal] = useState(false);

    // ── Computed KPIs from live data ─────────────────────────────
    const totalCheckIns = checkIns.length;
    const lateCheckIns = checkIns.filter(c => c.isLate).length;
    const proxyRequests = checkIns.filter(c => c.status === 'Pending Approval').length;

    const silentSites = useMemo(() => {
        const activeProjects = projects.filter(p => !p.isCompleted);
        const projectsWithCheckIns = new Set(checkIns.map(c => c.projectName));
        return activeProjects.filter(p => !projectsWithCheckIns.has(p.name)).length;
    }, [projects, checkIns]);

    return (
        <section className="view active">
            <div className="view-header">
                <div>
                    <h2>Global Attendance Log</h2>
                    <p className="subtitle">Unified Reconciliation Dashboard</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => { setSelectedRecord(null); setShowManualModal(true); }}
                    >
                        <Plus size={16} /> + Manual Attendance
                    </button>
                    <div className="v-divider"></div>
                    <button className="btn secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Export <Download size={16} />
                    </button>
                </div>
            </div>

            <div className="metrics-row">
                <div className="metric-card">
                    <div className="metric-header">Total Check-ins</div>
                    <div className="metric-value">{totalCheckIns}</div>
                    <div className="metric-desc highlight-green">{totalCheckIns > 0 ? 'Today' : 'No data yet'}</div>
                </div>
                <div className="metric-card">
                    <div className="metric-header">Late Check-ins</div>
                    <div className="metric-value">{lateCheckIns}</div>
                    <div className="metric-desc">{lateCheckIns > 0 ? 'After 08:30 AM' : 'None'}</div>
                </div>
                <div className="metric-card alert-amber">
                    <div className="metric-header">Proxy Requests</div>
                    <div className="metric-value">{proxyRequests}</div>
                    <div className="metric-desc highlight-amber">{proxyRequests > 0 ? 'Awaiting confirmation' : 'None pending'}</div>
                </div>
                <div className="metric-card alert-red">
                    <div className="metric-header">Silent Sites</div>
                    <div className="metric-value">{silentSites}</div>
                    <div className="metric-desc highlight-red">{silentSites > 0 ? 'No check-ins today' : 'All active'}</div>
                </div>
            </div>

            {/* Projects Overview */}
            <div className="panel">
                <div className="panel-header">
                    <h3>Projects Overview</h3>
                    <button className="btn text-btn" onClick={() => setActiveView('view-projects')}>View All Projects →</button>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>PROJECT</th>
                            <th>LOCATION</th>
                            <th>HEADCOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.slice(0, 4).map(project => {
                            const totalAssigned = project.totalAssigned || 0;
                            const present = project.employeesPresent || 0;
                            const percent = totalAssigned > 0 ? Math.round((present / totalAssigned) * 100) : 0;
                            const progressText = `${present}/${totalAssigned} (${percent}%)`;
                            return (
                                <tr key={project._id}>
                                    <td style={{ fontWeight: 500 }}>{project.name}</td>
                                    <td>{project.location}</td>
                                    <td>
                                        <div className="progress-cell">
                                            <span>{progressText}</span>
                                            <div className="progress-bar"><div className="fill green" style={{width: `${percent}%`}}></div></div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="attendance-grid">
                <div className="attendance-main panel">
                    <div className="panel-header">
                        <h3>Worker Attendance Log</h3>
                        <div className="header-actions">
                            <button className="icon-btn"><Search size={18} /></button>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Worker ID</th>
                                <th>Name</th>
                                <th>Project Site</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Hours</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checkIns.length > 0 ? (
                                checkIns.map(ci => {
                                    let statusPill = 'solid-grey';
                                    let statusText = 'On Site';
                                    let rowClass = '';

                                    if (ci.checkOutTime) {
                                        statusText = 'Completed';
                                        statusPill = 'solid-grey';
                                        rowClass = 'dimmed';
                                    } else if (ci.status === 'Pending Approval') {
                                        statusText = 'Proxy Req';
                                        statusPill = 'outline-amber';
                                        rowClass = 'row-amber';
                                    } else if (ci.isLate) {
                                        statusText = 'Late';
                                        statusPill = 'outline-amber';
                                        rowClass = 'row-amber';
                                    } else {
                                        statusText = 'On Site';
                                        statusPill = 'solid-green';
                                    }

                                    return (
                                        <tr key={ci._id} className={rowClass}>
                                            <td>{ci.workerCode}</td>
                                            <td style={{ fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: 26, height: 26, borderRadius: '50%',
                                                        background: 'var(--primary-light)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '10px', fontWeight: 600, flexShrink: 0
                                                    }}>
                                                        {ci.initials}
                                                    </div>
                                                    {ci.workerName}
                                                </div>
                                            </td>
                                            <td>{ci.projectName}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                                    {ci.checkInTimeStr}
                                                </div>
                                            </td>
                                            <td>{ci.checkOutTimeStr || '—'}</td>
                                            <td>{ci.hoursWorked ? `${ci.hoursWorked}h` : '—'}</td>
                                            <td><span className={`status-pill ${statusPill}`}>{statusText}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className="icon-btn" 
                                                    title="Edit Record"
                                                    onClick={() => { setSelectedRecord(ci); setShowManualModal(true); }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        No attendance records for today. Click "+ Manual Attendance" above or wait for worker clock-ins.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showManualModal && (
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setShowManualModal(false)}>
                    <ManualAttendanceModal 
                        onClose={() => setShowManualModal(false)}
                        recordToEdit={selectedRecord}
                        workers={workforce}
                        projects={projects}
                    />
                </div>
            )}
        </section>
    );
}
