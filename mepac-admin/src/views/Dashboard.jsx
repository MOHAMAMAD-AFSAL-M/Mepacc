import React, { useMemo } from 'react';
import { SlidersHorizontal, Clock, ArrowRight } from 'lucide-react';

export default function Dashboard({ setActiveView, projects = [], workforce = [], checkIns = [] }) {
    // ── Computed KPIs ─────────────────────────────────────────────
    const absentToday = useMemo(() => {
        const checkedInWorkerIds = new Set(checkIns.map(c => c.workerCode));
        return workforce.filter(w => w.isActive && !checkedInWorkerIds.has(w.workerCode)).length;
    }, [checkIns, workforce]);

    const activeCheckIns = checkIns.filter(c => !c.checkOutTime);
    const completedCheckIns = checkIns.filter(c => c.checkOutTime);

    return (
        <section className="view active">
            <div className="view-header">
                <div>
                    <h2>Mission Control</h2>
                    <p className="subtitle">Real-time operational overview.</p>
                </div>
                <div className="date-display">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
            
            <div className="metrics-row">
                <div className="metric-card">
                    <div className="metric-header">Total Workforce</div>
                    <div className="metric-value">{workforce.length}</div>
                    <div className="metric-desc">registered workers</div>
                </div>
                <div className="metric-card">
                    <div className="metric-header">Checked In Today</div>
                    <div className="metric-value highlight-green">{checkIns.length}</div>
                    <div className="metric-desc">{activeCheckIns.length} active, {completedCheckIns.length} completed</div>
                </div>
                <div className="metric-card alert-red">
                    <div className="metric-header">Absent Today</div>
                    <div className="metric-value">{absentToday}</div>
                    <div className="metric-desc">{absentToday > 0 ? 'Not checked in yet' : 'All accounted for'}</div>
                </div>
                <div className="metric-card">
                    <div className="metric-header">Active Projects</div>
                    <div className="metric-value">{projects.filter(p => !p.isCompleted).length}</div>
                    <div className="metric-desc">across all sites</div>
                </div>
            </div>

            <div className="live-feed panel">
                <div className="panel-header">
                    <h3>Live Worker Check-in Feed</h3>
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button className="btn secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Filter <SlidersHorizontal size={16} /></button>
                        <button className="btn primary" onClick={() => setActiveView('view-attendance')}>View All Attendance →</button>
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>WORKER</th>
                            <th>ROLE</th>
                            <th>PROJECT</th>
                            <th>CHECK-IN TIME</th>
                            <th>STATUS</th>
                            <th>METHOD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checkIns.length > 0 ? (
                            checkIns.slice(0, 10).map(ci => {
                                let statusPill = 'solid-grey';
                                let statusText = 'On Site';
                                let rowClass = '';

                                if (ci.checkOutTime) {
                                    statusText = `Out ${ci.checkOutTimeStr}`;
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
                                        <td style={{ fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: 'var(--primary-light)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '11px', fontWeight: 600, flexShrink: 0
                                                }}>
                                                    {ci.initials}
                                                </div>
                                                <div>
                                                    <div>{ci.workerName}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ci.workerCode}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{ci.role}</td>
                                        <td>{ci.projectName}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                                                <span>{ci.checkInTimeStr}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${statusPill}`}>{statusText}</span>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${ci.type === 'Proxy' ? 'outline-amber' : 'solid-grey'}`}>
                                                {ci.type}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No check-ins recorded today. Workers will appear here as they clock in.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {checkIns.length > 10 && (
                    <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                            className="btn text-btn"
                            onClick={() => setActiveView('view-attendance')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            View all {checkIns.length} check-ins <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
