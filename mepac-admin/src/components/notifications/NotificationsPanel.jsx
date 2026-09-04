import React from 'react';
import { X, Bell, ShieldAlert, Check } from 'lucide-react';

export default function NotificationsPanel({ isOpen, onClose, notifications = [], deleteNotification }) {
    const formatNotifTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className={`side-panel ${isOpen ? 'active' : ''}`} id="notifications-panel" onClick={e => e.stopPropagation()}>
            <div className="side-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} style={{ color: 'var(--accent-blue)' }} />
                    <h3>Notifications ({notifications.length})</h3>
                </div>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="side-panel-body" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 70px)' }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600 }}>No new notifications</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Disputes and inquiries will appear here in real-time.</div>
                    </div>
                ) : (
                    notifications.map(notif => {
                        const notifId = notif._id || notif.id;
                        const isDispute = notif.title?.toLowerCase().includes('dispute');

                        return (
                            <div 
                                className="notification-item" 
                                key={notifId} 
                                style={{ 
                                    position: 'relative', 
                                    padding: '14px 16px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    backgroundColor: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                                    borderLeft: isDispute ? '3px solid #ef4444' : '3px solid #3b82f6',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '20px' }}>
                                    <div className="notif-title" style={{ fontWeight: notif.isRead ? '600' : '700', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isDispute && <ShieldAlert size={14} style={{ color: '#ef4444', shrink: 0 }} />}
                                        {notif.title}
                                        {!notif.isRead && (
                                            <span style={{ 
                                                width: '6px', height: '6px', borderRadius: '50%', 
                                                backgroundColor: '#ef4444', display: 'inline-block' 
                                            }} />
                                        )}
                                    </div>
                                </div>
                                <div className="notif-time" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '6px' }}>
                                    {notif.createdAt ? formatNotifTime(notif.createdAt) : (notif.time || 'Recently')}
                                </div>
                                <div className="notif-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                    {notif.desc}
                                </div>
                                <button 
                                    onClick={() => deleteNotification(notifId)} 
                                    style={{
                                        position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', 
                                        cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                                        padding: '4px',
                                    }}
                                    title="Delete notification"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

