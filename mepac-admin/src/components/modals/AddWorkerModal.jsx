import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AddWorkerModal({ onClose }) {
    const [pin, setPin] = useState('');
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [role, setRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createWorker = useMutation(api.workers.create);

    const handlePinChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 6) {
            setPin(value);
        }
    };

    const handleNameChange = (e) => {
        // Remove digits and special characters (letters, spaces, and periods only)
        setFullName(e.target.value.replace(/[^a-zA-Z\s.]/g, ''));
    };

    const handleMobileChange = (e) => {
        // Remove non-digits
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
            setMobile(val);
        }
    };

    const handleSubmit = async () => {
        if (!fullName.trim() || !role || !mobile || mobile.length !== 10) return;
        setIsSubmitting(true);

        try {
            // Split full name into first and last name
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            // If no PIN set, default to last 6 digits of mobile
            const adminPin = pin || mobile.slice(-6);

            await createWorker({
                firstName,
                lastName,
                role,
                mobile,
                adminPin,
            });

            onClose();
        } catch (error) {
            console.error("Failed to add worker:", error);
            alert("Failed to add worker. " + (error.message || "Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = fullName.trim() && role && mobile.length === 10;

    return (
        <div className="modal" id="add-worker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Add Worker</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={fullName} onChange={handleNameChange} maxLength={50} />
                </div>
                <div className="form-group">
                    <label>Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="">Select a role...</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Foreman">Foreman</option>
                        <option value="Technician">Technician</option>
                        <option value="Designer">Designer</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" value={mobile} onChange={handleMobileChange} />
                </div>
                <div className="form-group">
                    <label>Set PIN <span style={{ fontWeight: 400, opacity: 0.6 }}>(6-digit login PIN)</span></label>
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={handlePinChange}
                        placeholder="XXXXXX"
                        style={{ letterSpacing: pin ? '0.35em' : 'normal' }}
                    />
                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem', display: 'block' }}>
                        {pin.length}/6 digits
                    </span>
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button
                    className="btn primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isValid}
                >
                    {isSubmitting ? 'Adding...' : 'Add Worker'}
                </button>
            </div>
        </div>
    );
}
