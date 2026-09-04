import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { LayoutDashboard, Building2, Users, CalendarDays, FileText, PencilRuler, Settings, X } from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, mobileOpen = false, onClose }) {
    const settings = useQuery(api.settings.get);

    const navItems = [
        { id: 'view-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'view-projects', icon: Building2, label: 'Projects' },
        { id: 'view-workforce', icon: Users, label: 'Workforce' },
        { id: 'view-attendance', icon: CalendarDays, label: 'Attendance' },
        { id: 'view-rfis', icon: FileText, label: 'RFIs' },
        { id: 'view-drawings', icon: PencilRuler, label: 'Drawings' }
    ];

    const handleNavClick = (viewId) => {
        setActiveView(viewId);
        if (onClose) {
            onClose();
        }
    };

    return (
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {settings?.logoUrl ? (
                        <img src={settings.logoUrl} alt="Company Logo" className="logo-icon" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    ) : (
                        <img src="/images/logo.png" alt="MEPac Logo" className="logo-icon" />
                    )}
                    <div className="logo-text">
                        <h1>{settings?.companyName || 'MEPac'}</h1>
                        <span>Admin Console</span>
                    </div>
                </div>

                {/* Mobile Close Button */}
                <button
                    className="icon-btn mobile-sidebar-close"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <X size={20} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(item => {
                    const IconComponent = item.icon;
                    return (
                        <button 
                            key={item.id}
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                            style={{width: '100%', textAlign: 'left'}}
                        >
                            <span className="icon"><IconComponent size={18} /></span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
                
                <div className="spacer"></div>
                
                <button 
                    className={`nav-item ${activeView === 'view-settings' ? 'active' : ''}`}
                    onClick={() => handleNavClick('view-settings')}
                    style={{width: '100%', textAlign: 'left'}}
                >
                    <span className="icon"><Settings size={18} /></span>
                    <span>Settings</span>
                </button>
            </nav>
        </aside>
    );
}
