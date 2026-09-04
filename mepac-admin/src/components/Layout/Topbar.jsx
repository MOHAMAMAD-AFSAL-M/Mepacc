import React from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function Topbar({ activeView, selectedProject, activePanel, togglePanel, notifications = [], onToggleSidebar }) {
    const { signOut } = useAuthActions();
    const currentUser = useQuery(api.adminUsers.current);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    const getPageTitle = () => {
        if (activeView === 'view-project-details' && selectedProject) {
            return selectedProject.name;
        }
        switch (activeView) {
            case 'view-dashboard': return 'Dashboard';
            case 'view-projects': return 'Projects Hub';
            case 'view-workforce': return 'Workforce Directory';
            case 'view-attendance': return 'Attendance Log';
            case 'view-rfis': return 'RFIs';
            case 'view-drawings': return 'Blueprints & Drawings';
            case 'view-settings': return 'Settings';
            default: return '';
        }
    };

    return (
        <header className="topbar" style={{ position: 'relative', zIndex: 1000 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                    className="icon-btn mobile-menu-btn"
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation menu"
                    style={{
                        display: 'none',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '6px'
                    }}
                >
                    <Menu size={20} />
                </button>
                <div className="topbar-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {getPageTitle()}
                </div>
            </div>
            <div className="topbar-actions">
                <button className="icon-btn notif-btn" onClick={(e) => togglePanel('notifications', e)}>
                    <span className="icon" style={{ pointerEvents: 'none' }}><Bell size={18} /></span>
                    {unreadCount > 0 && <span className="badge" style={{ pointerEvents: 'none' }}>{unreadCount}</span>}
                </button>
                <div style={{ position: 'relative' }}>
                    <div 
                        className="avatar" 
                        onClick={(e) => togglePanel('profile', e)}
                        style={{ marginLeft: '12px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                        <span style={{ pointerEvents: 'none' }}>{currentUser?.email ? currentUser.email.charAt(0) : 'U'}</span>
                    </div>
                    
                    {activePanel === 'profile' && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                            position: 'absolute',
                            top: '48px',
                            right: '0',
                            width: '200px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            zIndex: 100,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Admin Account</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentUser?.email || 'Loading...'}</div>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <button className="btn text-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', justifyContent: 'flex-start', gap: '8px' }} onClick={() => togglePanel('profile', null)}><User size={16} /> View Profile</button>
                            </div>
                            <div style={{ padding: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                                <button className="btn text-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', color: 'var(--accent-red)', justifyContent: 'flex-start', gap: '8px' }} onClick={async () => {
                                    togglePanel('profile', null);
                                    window.location.hash = ''; // clear hash so next user goes to dashboard
                                    await signOut();
                                }}><LogOut size={16} /> Log Out</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
