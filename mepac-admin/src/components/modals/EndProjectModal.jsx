import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function EndProjectModal({ onClose, onConfirm, project }) {
    if (!project) return null;

    const handleConfirm = () => {
        onConfirm(project._id);
        onClose();
    };

    return (
        <div className="modal" id="end-project-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={20} color="var(--accent-red)" />
                    </div>
                    <h3 style={{ margin: 0 }}>End Project</h3>
                </div>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            
            <div className="modal-body">
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Are you sure you want to end <strong>{project.name}</strong>? 
                </p>
                <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    This will mark the project as completed and move it to the Past Projects section. You can reopen it later if needed.
                </p>
            </div>
            
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                <button className="btn secondary" onClick={onClose} autoFocus>Cancel</button>
                <button className="btn danger" onClick={handleConfirm}>End Project</button>
            </div>
        </div>
    );
}
