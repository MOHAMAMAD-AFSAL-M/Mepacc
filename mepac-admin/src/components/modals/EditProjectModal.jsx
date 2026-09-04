import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LocationPicker from '../LocationPicker';

export default function EditProjectModal({ onClose, project }) {
    const [projectName, setProjectName] = useState('');
    const [client, setClient] = useState('');
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateProject = useMutation(api.projects.update);
    const generateUploadUrl = useMutation(api.projects.generateUploadUrl);

    useEffect(() => {
        if (project) {
            setProjectName(project.name || '');
            setClient(project.client || '');
            setLatitude(project.latitude || null);
            setLongitude(project.longitude || null);
            setLocationName(project.location || '');
        }
    }, [project]);

    if (!project) return null;

    const handleProjectNameChange = (e) => {
        setProjectName(e.target.value);
    };

    const handleClientChange = (e) => {
        setClient(e.target.value);
    };

    const handleSubmit = async () => {
        if (!projectName.trim() || !client.trim() || !locationName.trim()) return;
        setIsSubmitting(true);

        try {
            let imageStorageId;

            if (imageFile) {
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": imageFile.type },
                    body: imageFile,
                });
                const { storageId } = await result.json();
                imageStorageId = storageId;
            }

            const updates = {
                projectId: project._id,
                name: projectName.trim(),
                client: client.trim(),
                location: locationName.trim(),
            };

            if (latitude != null) updates.latitude = latitude;
            if (longitude != null) updates.longitude = longitude;
            if (imageStorageId) updates.imageStorageId = imageStorageId;

            await updateProject(updates);
            onClose();
        } catch (error) {
            console.error("Failed to update project:", error);
            alert("Failed to update project. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal" id="edit-project-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Edit Project</h3>
                <button className="icon-btn close-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                    <label>Project Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input type="text" value={projectName} onChange={handleProjectNameChange} maxLength={50} />
                </div>
                <div className="form-group">
                    <label>Client <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input type="text" value={client} onChange={handleClientChange} maxLength={50} />
                </div>
                <div className="form-group">
                    <label>Preview Image (JPG/PNG) <span style={{ fontWeight: 400, opacity: 0.6 }}>— leave empty to keep current</span></label>
                    <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setImageFile(e.target.files[0] || null)} />
                </div>
                <div className="form-group">
                    <label>Location Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input 
                        type="text" 
                        value={locationName} 
                        onChange={(e) => setLocationName(e.target.value)} 
                        placeholder="Location name"
                        maxLength={200}
                    />
                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px', display: 'block' }}>
                        This name appears on the project card. Type your own short name.
                    </span>
                </div>
                <div className="form-group">
                    <label>Google Maps Link or Coordinates <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input 
                        type="text" 
                        placeholder="Paste Google Maps URL or coordinates (e.g. 19.0760, 72.8777)..."
                        onChange={(e) => {
                            const val = e.target.value;
                            const match = val.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                            if (match) {
                                setLatitude(parseFloat(match[1]));
                                setLongitude(parseFloat(match[2]));
                            }
                        }}
                    />
                    {latitude != null && longitude != null && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                            ✓ Coordinates Extracted: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </span>
                    )}
                </div>
                <div className="form-group">
                    <label>Search Location <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <LocationPicker 
                        lat={latitude} 
                        lng={longitude} 
                        onChange={(lat, lng) => {
                            setLatitude(lat);
                            setLongitude(lng);
                        }} 
                    />
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                <button
                    className="btn primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !projectName.trim() || !client.trim() || !locationName.trim()}
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
