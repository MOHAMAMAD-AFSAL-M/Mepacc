import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, User, Building2 } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ManualAttendanceModal({ 
  onClose, 
  recordToEdit, 
  preSelectedWorkerId = null,
  workers = [], 
  projects = [] 
}) {
    const getTodayDateStr = () => {
        const today = new Date();
        const yr = today.getFullYear();
        const mo = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${day}`;
    };

    const [workerId, setWorkerId] = useState(preSelectedWorkerId || '');
    const [projectId, setProjectId] = useState('');
    const [dateStr, setDateStr] = useState(getTodayDateStr());
    const [checkInTimeStr, setCheckInTimeStr] = useState('08:30');
    const [checkOutTimeStr, setCheckOutTimeStr] = useState('');
    const [status, setStatus] = useState('Verified');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const overrideAttendance = useMutation(api.checkIns.adminOverrideAttendance);
    const deleteAttendance = useMutation(api.checkIns.adminDeleteAttendance);

    useEffect(() => {
        if (recordToEdit) {
            setWorkerId(recordToEdit.workerId || '');
            const foundProject = projects.find(p => p._id === recordToEdit.projectId || p.name === recordToEdit.projectName);
            setProjectId(foundProject?._id || recordToEdit.projectId || projects[0]?._id || '');
            
            if (recordToEdit.checkInTime) {
              const d = new Date(recordToEdit.checkInTime);
              const yr = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              setDateStr(`${yr}-${mo}-${day}`);

              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              setCheckInTimeStr(`${hh}:${mm}`);
            }
            if (recordToEdit.checkOutTime) {
              const d = new Date(recordToEdit.checkOutTime);
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              setCheckOutTimeStr(`${hh}:${mm}`);
            }
            setStatus(recordToEdit.status || 'Verified');
        } else {
            if (preSelectedWorkerId) {
                setWorkerId(preSelectedWorkerId);
            } else if (workers.length > 0) {
                setWorkerId(workers[0]._id);
            }
            if (projects.length > 0) setProjectId(projects[0]._id);
        }
    }, [recordToEdit, preSelectedWorkerId, workers, projects]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!workerId || !projectId || !checkInTimeStr || !dateStr) return;
        setIsSubmitting(true);

        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const [inH, inM] = checkInTimeStr.split(':').map(Number);
            const inDate = new Date(year, month - 1, day, inH, inM);

            let outTimestamp = undefined;
            if (checkOutTimeStr) {
              const [outH, outM] = checkOutTimeStr.split(':').map(Number);
              const outDate = new Date(year, month - 1, day, outH, outM);
              outTimestamp = outDate.getTime();
            }

            await overrideAttendance({
                ...(recordToEdit?._id && { checkInId: recordToEdit._id }),
                workerId: workerId,
                projectId: projectId,
                checkInTime: inDate.getTime(),
                ...(outTimestamp !== undefined ? { checkOutTime: outTimestamp } : {}),
                type: 'Manual Override',
                status: status,
            });

            onClose();
        } catch (error) {
            console.error("Failed to save manual attendance:", error);
            alert("Failed to save attendance: " + (error.message || ""));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!recordToEdit?._id) return;
        if (!confirm("Are you sure you want to delete this attendance record?")) return;
        setIsSubmitting(true);
        try {
            await deleteAttendance({ checkInId: recordToEdit._id });
            onClose();
        } catch (error) {
            console.error("Failed to delete attendance:", error);
            alert("Failed to delete attendance.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal" id="manual-attendance-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
                <h3>{recordToEdit ? 'Edit Attendance Record' : 'Manual Attendance Log'}</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                    <div className="form-group">
                        <label>Worker <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <select 
                            value={workerId} 
                            onChange={(e) => setWorkerId(e.target.value)}
                            disabled={Boolean(recordToEdit) || Boolean(preSelectedWorkerId)}
                        >
                            {workers.map(w => (
                                <option key={w._id} value={w._id}>
                                    {w.name} ({w.workerCode || 'W-000'}) — {w.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Project Site <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>
                                    {p.name} ({p.location})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Date <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                        <input 
                            type="date" 
                            value={dateStr} 
                            onChange={(e) => setDateStr(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Time In (Check-In) <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                            <input 
                                type="time" 
                                value={checkInTimeStr} 
                                onChange={(e) => setCheckInTimeStr(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Time Out (Check-Out)</label>
                            <input 
                                type="time" 
                                value={checkOutTimeStr} 
                                onChange={(e) => setCheckOutTimeStr(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Attendance Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="Verified">Verified (Regular)</option>
                            <option value="On Site">On Site (Active Shift)</option>
                            <option value="Completed">Shift Completed</option>
                            <option value="Pending Approval">Pending Approval (Proxy/Dispute)</option>
                        </select>
                    </div>
                </div>

                <div className="modal-footer" style={{ justifyContent: recordToEdit ? 'space-between' : 'flex-end' }}>
                    {recordToEdit && (
                        <button type="button" className="btn danger" onClick={handleDelete} disabled={isSubmitting}>
                            Delete Record
                        </button>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button
                            type="submit"
                            className="btn primary"
                            disabled={isSubmitting || !workerId || !projectId || !checkInTimeStr || !dateStr}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
