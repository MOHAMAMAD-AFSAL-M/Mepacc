import React from 'react';
import { MapPin, Users, ShieldCheck, Clock, UserCheck } from 'lucide-react';
import { getProjectColor } from '../utils/colors';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function ProjectsHub({ openModal, projects = [], isProjectsLoading, todayCheckIns = [], setActiveView, setSelectedProject }) {
    // Compute supervisor visits from today's check-ins
    const visitsByProject = React.useMemo(() => {
        const visits = {};
        for (const c of (todayCheckIns || [])) {
            if (c.role === 'Supervisor' || c.type === 'Proxy' || c.workerRole === 'Supervisor') {
                const pId = c.projectId;
                if (pId) {
                    if (!visits[pId]) {
                        visits[pId] = [];
                    }
                    visits[pId].push({
                        _id: c._id,
                        supervisorName: c.workerName || c.name || 'Supervisor',
                        initials: c.initials || 'SP',
                        checkInTimeStr: c.checkInTimeStr || (c.checkInTime ? new Date(c.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'),
                        ...c
                    });
                }
            }
        }
        // Sort visits per project by newest first
        for (const pId in visits) {
            visits[pId].sort((a, b) => (b.checkInTime || 0) - (a.checkInTime || 0));
        }
        return visits;
    }, [todayCheckIns]);

    const activeProjects = (projects || []).filter(p => !p.isCompleted);
    const pastProjects = (projects || []).filter(p => p.isCompleted);

    const handleProjectClick = (project) => {
        if (project && project._id) {
            setSelectedProject(project);
        }
    };

    // Show a skeleton loading state while projects are loading from Convex
    if (isProjectsLoading) {
        return (
            <section className="view active">
                <div className="view-header">
                    <div>
                        <h2>Projects & Supervisor Site Visits</h2>
                        <p className="subtitle">Track active MEP project deployments, assigned teams, and supervisor site inspection logs.</p>
                    </div>
                    <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn primary" disabled>+ Add Project</button>
                    </div>
                </div>
                <h3 style={{ marginTop: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Active Projects</h3>
                <div className="project-card-grid">
                    {[1, 2, 3].map(i => (
                        <div className="project-card" key={i} style={{ pointerEvents: 'none' }}>
                            <div className="project-card-img" style={{
                                backgroundColor: 'var(--border-subtle)',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }}></div>
                            <div className="project-card-content">
                                <div style={{
                                    height: '18px', width: '70%', borderRadius: '4px',
                                    backgroundColor: 'var(--border-subtle)',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    marginBottom: '8px',
                                }}></div>
                                <div style={{
                                    height: '14px', width: '40%', borderRadius: '4px',
                                    backgroundColor: 'var(--border-subtle)',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    animationDelay: '0.2s',
                                    marginBottom: '12px',
                                }}></div>
                                <div className="project-meta">
                                    <span style={{
                                        height: '14px', width: '100px', display: 'inline-block', borderRadius: '4px',
                                        backgroundColor: 'var(--border-subtle)',
                                        animation: 'pulse 1.5s ease-in-out infinite',
                                        animationDelay: '0.4s',
                                    }}></span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="view active">
            <div className="view-header">
                <div>
                    <h2>Projects & Supervisor Site Visits</h2>
                    <p className="subtitle">Track active MEP project deployments, assigned teams, and supervisor site inspection logs.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn primary" onClick={() => openModal('add-project')}>+ Add Project</button>
                </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Active Projects</h3>
            <div className="project-card-grid">
                {activeProjects.map(project => {
                    const visits = (visitsByProject && visitsByProject[project._id]) || project.supervisorVisits || [];
                    const isVisited = visits.length > 0 || Boolean(project.isVisitedToday);
                    const lastVisit = isVisited ? (visits[0] || { supervisorName: project.visitedBySupervisorName || 'Supervisor', checkInTimeStr: project.visitedAtTimeStr || 'Today' }) : null;

                    return (
                        <div className="project-card" key={project._id} onClick={() => handleProjectClick(project)}>
                            <div className="project-card-img" style={{ 
                                backgroundImage: project.imageUrl ? `url(${project.imageUrl})` : 'none',
                                backgroundColor: getProjectColor(project._id),
                                position: 'relative'
                            }}>
                                {/* Supervisor Visit Overlay Pill */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backgroundColor: isVisited ? 'rgba(22, 163, 74, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                                    color: 'white',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                    backdropFilter: 'blur(4px)',
                                }}>
                                    <UserCheck size={13} />
                                    {isVisited ? `Visited by ${lastVisit.supervisorName}` : 'No Supervisor Visit Today'}
                                </div>
                            </div>
                            <div className="project-card-content">
                                <h3>{project.name}</h3>
                                <p className="client-text">{project.client}</p>

                                <div className="project-meta">
                                    <span><MapPin size={14} /> {project.location}</span>
                                    <span><Users size={14} /> {project.employeesPresent} / {project.totalAssigned} Active</span>
                                </div>

                                {/* Supervisor Site Visit Status Sub-bar */}
                                <div style={{
                                    marginTop: '12px',
                                    paddingTop: '10px',
                                    borderTop: '1px solid var(--border-subtle)',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    color: isVisited ? '#15803d' : 'var(--text-muted)'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                        <ShieldCheck size={14} color={isVisited ? '#16a34a' : 'var(--text-muted)'} />
                                        {isVisited ? `Inspected at ${lastVisit.checkInTimeStr}` : 'Site Inspection Pending'}
                                    </span>
                                    {isVisited && (
                                        <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                            Checked-In
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {activeProjects.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active projects.</div>}
            </div>

            {pastProjects.length > 0 && (
                <>
                    <h3 style={{ marginTop: '48px', marginBottom: '8px', color: 'var(--text-primary)' }}>Past Projects</h3>
                    <div className="project-card-grid">
                        {pastProjects.map(project => (
                            <div className="project-card completed" key={project._id} onClick={() => handleProjectClick(project)}>
                                <div className="project-card-img" style={{ 
                                    backgroundImage: project.imageUrl ? `url(${project.imageUrl})` : 'none',
                                    backgroundColor: getProjectColor(project._id)
                                }}></div>
                                <div className="project-card-content">
                                    <h3>{project.name}</h3>
                                    <p className="client-text">{project.client}</p>
                                    
                                    <div className="project-meta">
                                        <span><MapPin size={14} /> {project.location}</span>
                                        <span><Users size={14} /> {project.totalAssigned} Total Workers</span>
                                    </div>
                                    <div className="progress-container">
                                        <span className="status-badge" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>Completed</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
