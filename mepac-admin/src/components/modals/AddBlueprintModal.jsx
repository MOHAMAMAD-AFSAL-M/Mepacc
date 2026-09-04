import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AddBlueprintModal({ onClose, projects = [], projectId: preselectedProjectId }) {
    const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
    const [blueprintName, setBlueprintName] = useState('');
    const [blueprintFile, setBlueprintFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createBlueprint = useMutation(api.blueprints.create);
    const generateUploadUrl = useMutation(api.blueprints.generateUploadUrl);

    // If opened from a project page, the project is pre-selected and locked
    const isProjectLocked = !!preselectedProjectId;

    const handleSubmit = async () => {
        if (!selectedProjectId || !blueprintName.trim() || !blueprintFile) return;
        setIsSubmitting(true);

        try {
            // Upload file to Convex storage
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": blueprintFile.type },
                body: blueprintFile,
            });
            const { storageId } = await result.json();

            await createBlueprint({
                projectId: selectedProjectId,
                name: blueprintName.trim(),
                fileStorageId: storageId,
            });

            onClose();
        } catch (error) {
            console.error("Failed to upload blueprint:", error);
            alert("Failed to upload blueprint. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Only show active projects in the picker
    const activeProjects = projects.filter(p => !p.isCompleted);
    const isValid = selectedProjectId && blueprintName.trim() && blueprintFile;

    // Find the locked project name for display
    const lockedProject = isProjectLocked ? projects.find(p => p._id === preselectedProjectId) : null;

    return (
        <div className="modal" id="add-blueprint-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>{isProjectLocked ? 'Upload Blueprint' : 'Add Blueprint to Project'}</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">
                {isProjectLocked ? (
                    <div className="form-group">
                        <label>Project</label>
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                        }}>
                            {lockedProject?.name || 'Current Project'}
                        </div>
                    </div>
                ) : (
                    <div className="form-group">
                        <label>Target Project</label>
                        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                            <option value="">Select a project...</option>
                            {activeProjects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="form-group">
                    <label>Upload Blueprint (PDF/DWG)</label>
                    <input type="file" accept=".pdf,.dwg" onChange={(e) => setBlueprintFile(e.target.files[0] || null)} />
                </div>
                <div className="form-group">
                    <label>Blueprint Name / Section</label>
                    <input
                        type="text"
                        placeholder="Blueprint name or section"
                        value={blueprintName}
                        onChange={(e) => setBlueprintName(e.target.value)}
                        maxLength={100}
                    />
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button
                    className="btn primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isValid}
                >
                    {isSubmitting ? 'Uploading...' : 'Upload Blueprint'}
                </button>
            </div>
        </div>
    );
}
