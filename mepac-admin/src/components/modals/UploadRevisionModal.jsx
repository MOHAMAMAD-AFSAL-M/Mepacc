import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function UploadRevisionModal({ onClose, projects = [] }) {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [mode, setMode] = useState('new'); // 'new' | 'revision'
    const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
    const [blueprintName, setBlueprintName] = useState('');
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createBlueprint = useMutation(api.blueprints.create);
    const uploadRevision = useMutation(api.blueprints.uploadRevision);
    const generateUploadUrl = useMutation(api.blueprints.generateUploadUrl);

    // Fetch existing blueprints for selected project
    const existingBlueprints = useQuery(
        api.blueprints.getByProject,
        selectedProjectId ? { projectId: selectedProjectId } : "skip"
    ) || [];

    const activeProjects = projects.filter(p => !p.isCompleted);

    const isValid = selectedProjectId && file && (
        mode === 'new' ? blueprintName.trim() : selectedBlueprintId
    );

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsSubmitting(true);
        try {
            const uploadUrl = await generateUploadUrl();
            const res = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });
            const { storageId } = await res.json();

            if (mode === 'new') {
                await createBlueprint({
                    projectId: selectedProjectId,
                    name: blueprintName.trim(),
                    fileStorageId: storageId,
                });
            } else {
                await uploadRevision({
                    blueprintId: selectedBlueprintId,
                    fileStorageId: storageId,
                });
            }
            onClose();
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Upload failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal" id="upload-revision-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Upload Drawing</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">
                {/* Project picker */}
                <div className="form-group">
                    <label>Project</label>
                    <select
                        value={selectedProjectId}
                        onChange={e => {
                            setSelectedProjectId(e.target.value);
                            setSelectedBlueprintId('');
                        }}
                    >
                        <option value="">Select a project...</option>
                        {activeProjects.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Mode toggle */}
                {selectedProjectId && (
                    <div className="form-group">
                        <label>Upload type</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setMode('new')}
                                style={{
                                    flex: 1,
                                    padding: '9px 0',
                                    borderRadius: '8px',
                                    border: mode === 'new' ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                                    background: mode === 'new' ? 'rgba(59,130,246,0.07)' : 'var(--bg-surface)',
                                    color: mode === 'new' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                    fontWeight: mode === 'new' ? 700 : 400,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                New Drawing
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('revision')}
                                disabled={existingBlueprints.length === 0}
                                style={{
                                    flex: 1,
                                    padding: '9px 0',
                                    borderRadius: '8px',
                                    border: mode === 'revision' ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                                    background: mode === 'revision' ? 'rgba(59,130,246,0.07)' : 'var(--bg-surface)',
                                    color: existingBlueprints.length === 0 ? 'var(--text-muted)' : (mode === 'revision' ? 'var(--accent-blue)' : 'var(--text-secondary)'),
                                    fontWeight: mode === 'revision' ? 700 : 400,
                                    fontSize: '0.85rem',
                                    cursor: existingBlueprints.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: existingBlueprints.length === 0 ? 0.5 : 1,
                                    transition: 'all 0.15s ease',
                                }}
                                title={existingBlueprints.length === 0 ? 'No existing drawings for this project' : ''}
                            >
                                New Revision
                            </button>
                        </div>
                    </div>
                )}

                {/* New drawing: name input */}
                {selectedProjectId && mode === 'new' && (
                    <div className="form-group">
                        <label>Drawing Name / Section</label>
                        <input
                            type="text"
                            placeholder="e.g. Electrical Layout – Floor 2"
                            value={blueprintName}
                            onChange={e => setBlueprintName(e.target.value)}
                            maxLength={100}
                        />
                    </div>
                )}

                {/* Revision: blueprint picker */}
                {selectedProjectId && mode === 'revision' && (
                    <div className="form-group">
                        <label>Drawing to revise</label>
                        <select
                            value={selectedBlueprintId}
                            onChange={e => setSelectedBlueprintId(e.target.value)}
                        >
                            <option value="">Select a drawing...</option>
                            {existingBlueprints.map(bp => (
                                <option key={bp._id} value={bp._id}>
                                    {bp.name} (v{bp.currentVersion})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* File picker */}
                {selectedProjectId && (
                    <div className="form-group">
                        <label>File (PDF / DWG)</label>
                        <input
                            type="file"
                            accept=".pdf,.dwg"
                            onChange={e => setFile(e.target.files[0] || null)}
                        />
                    </div>
                )}
            </div>
            <div className="modal-footer">
                <button className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button
                    className="btn primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isValid}
                >
                    {isSubmitting ? 'Uploading...' : 'Upload'}
                </button>
            </div>
        </div>
    );
}
