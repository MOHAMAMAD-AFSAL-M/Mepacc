import React from 'react';
import { X, RefreshCcw } from 'lucide-react';

export default function ReopenProjectModal({ onClose, onConfirm, project }) {
    if (!project) return null;

    const handleConfirm = () => {
        onConfirm(project._id);
        onClose();
    };

    return (
        <div className="modal" id="reopen-project-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCcw size={20} color="var(--accent-blue)" />
                    </div>
                    <h3 style={{ margin: 0 }}>Reopen Project</h3>
                </div>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            
            <div className="modal-body">
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Are you sure you want to reopen <strong>{project.name}</strong>? 
                </p>
                <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    This will mark the project as active and move it back to the Active Projects section.
                </p>
            </div>
            
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn secondary" onClick={onClose} autoFocus>Cancel</button>
                <button className="btn primary" onClick={handleConfirm}>Reopen Project</button>
            </div>
        </div>
    );
}
