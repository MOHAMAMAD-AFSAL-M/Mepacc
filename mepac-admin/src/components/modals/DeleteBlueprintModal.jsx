import React from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteBlueprintModal({ blueprint, onConfirm, onClose }) {
    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                className="modal"
                style={{ maxWidth: '420px', width: '90%' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={20} color="#dc2626" />
                        Delete Drawing
                    </h3>
                    <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                        Are you sure you want to delete{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>"{blueprint.name}"</strong>?
                        <br />
                        This will permanently remove the file and all its revisions. This action cannot be undone.
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn"
                        style={{ background: '#dc2626', color: 'white', border: 'none' }}
                        onClick={() => onConfirm(blueprint._id)}
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
