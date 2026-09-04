import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function NewRfiModal({ onClose, projects = [], workers = [] }) {
    const createRfi = useMutation(api.rfis.createRfi);

    const eligibleWorkers = workers.filter(w => w.role === 'Supervisor' || w.role === 'Foreman');

    const [projectId, setProjectId] = useState('');
    const [workerId, setWorkerId] = useState('');
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !details.trim()) return;

        setIsSubmitting(true);
        try {
            const selectedProject = projects.find(p => p._id === projectId);
            const selectedWorker = workers.find(w => w._id === workerId);

            await createRfi({
                projectId: projectId && projectId !== 'none' ? projectId : undefined,
                projectName: selectedProject ? selectedProject.name : 'General Project',
                workerId: selectedWorker ? selectedWorker._id : undefined,
                workerName: selectedWorker ? selectedWorker.name : undefined,
                workerRole: selectedWorker ? selectedWorker.role : undefined,
                createdByName: 'Admin',
                createdByRole: 'Admin',
                title: title.trim(),
                details: details.trim(),
                priority: 'High',
            });
            onClose();
        } catch (err) {
            console.error('Failed to create RFI:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal" id="new-rfi-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>New Request for Information</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Related Project</label>
                        <select 
                            value={projectId} 
                            onChange={e => setProjectId(e.target.value)}
                        >
                            <option value="">Select a project...</option>
                            <option value="none">Not Specific to Project</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Directed To (Optional)</label>
                        <select 
                            value={workerId} 
                            onChange={e => setWorkerId(e.target.value)}
                        >
                            <option value="">Select a worker...</option>
                            {eligibleWorkers.map((w) => (
                                <option key={w._id} value={w._id}>
                                    {w.name} — {w.role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Subject</label>
                        <input 
                            type="text" 
                            placeholder="Brief subject of inquiry" 
                            maxLength={100} 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Details</label>
                        <textarea 
                            placeholder="Provide detailed information..." 
                            maxLength={500} 
                            rows={4} 
                            value={details} 
                            onChange={e => setDetails(e.target.value)} 
                            required
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button type="submit" className="btn primary" disabled={isSubmitting || !title.trim() || !details.trim()}>
                        {isSubmitting ? 'Submitting...' : 'Submit RFI'}
                    </button>
                </div>
            </form>
        </div>
    );
}

