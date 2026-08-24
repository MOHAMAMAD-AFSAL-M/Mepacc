import React, { useState, useEffect } from 'react';
import { X, User, Phone, Tag } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function EditWorkerModal({ onClose, worker }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('Technician');
    const [mobile, setMobile] = useState('');
    const [workerCode, setWorkerCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateWorker = useMutation(api.workers.update);

    useEffect(() => {
        if (worker) {
            setFirstName(worker.firstName || worker.name?.split(' ')[0] || '');
            setLastName(worker.lastName || worker.name?.split(' ').slice(1).join(' ') || '');
            setRole(worker.role || 'Technician');
            setMobile(worker.mobile || '');
            setWorkerCode(worker.workerCode || worker.displayId || '');
        }
    }, [worker]);

    if (!worker) return null;

    const handleSubmit = async () => {
        if (!firstName.trim() || !lastName.trim() || !mobile.trim()) return;
        setIsSubmitting(true);

        try {
            await updateWorker({
                workerId: worker._id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: role,
                mobile: mobile.trim(),
                ...(workerCode.trim() && { workerCode: workerCode.trim() }),
            });
            onClose();
        } catch (error) {
            console.error("Failed to update worker:", error);
            alert("Failed to update worker: " + (error.message || ""));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal" id="edit-worker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Edit Worker Profile</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>First Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <input 
                            type="text" 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                            maxLength={30}
                            required 
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Last Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <input 
                            type="text" 
                            value={lastName} 
                            onChange={(e) => setLastName(e.target.value)} 
                            maxLength={30}
                            required 
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Role <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Foreman">Foreman</option>
                        <option value="Technician">Technician</option>
                        <option value="Designer">Designer</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Mobile Number <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input 
                        type="tel" 
                        value={mobile} 
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        maxLength={10}
                        required 
                    />
                </div>

                <div className="form-group">
                    <label>Worker Code / ID <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input 
                        type="text" 
                        value={workerCode} 
                        onChange={(e) => setWorkerCode(e.target.value)} 
                        maxLength={20}
                        placeholder="e.g. W-104" 
                    />
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button
                    className="btn primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !mobile.trim()}
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
