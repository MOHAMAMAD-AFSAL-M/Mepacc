import React, { useState, useEffect } from 'react';
import { FileText, Eye, MoreVertical, Star, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import DeleteBlueprintModal from '../components/modals/DeleteBlueprintModal';

// Sub-component: fetches & renders blueprints for one project
function ProjectDrawings({ project }) {
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [blueprintToDelete, setBlueprintToDelete] = useState(null);

    const rawBlueprints = useQuery(api.blueprints.getByProject, { projectId: project._id }) || [];
    const blueprints = [...rawBlueprints].sort((a, b) => {
        const timeA = a.pinnedAt ?? a._creationTime;
        const timeB = b.pinnedAt ?? b._creationTime;
        return timeB - timeA;
    });

    const removeBlueprint = useMutation(api.blueprints.remove);
    const setAsLatest = useMutation(api.blueprints.setAsLatest);

    const handleDelete = async (blueprintId) => {
        try {
            await removeBlueprint({ blueprintId });
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete drawing. Please try again.');
        }
        setBlueprintToDelete(null);
    };

    const handleSetAsLatest = async (blueprintId) => {
        setMenuOpenId(null);
        try {
            await setAsLatest({ blueprintId });
        } catch (err) {
            console.error('Set as latest failed:', err);
        }
    };

    // Close menu on any outside click
    useEffect(() => {
        if (!menuOpenId) return;
        let listener;
        const timer = setTimeout(() => {
            listener = () => setMenuOpenId(null);
            document.addEventListener('click', listener, { once: true });
        }, 0);
        return () => {
            clearTimeout(timer);
            if (listener) document.removeEventListener('click', listener);
        };
    }, [menuOpenId]);

    if (blueprints.length === 0) return null;

    return (
        <>
            {/* Delete confirmation modal */}
            {blueprintToDelete && (
                <DeleteBlueprintModal
                    blueprint={blueprintToDelete}
                    onConfirm={handleDelete}
                    onClose={() => setBlueprintToDelete(null)}
                />
            )}


            <div className="panel">
                <div className="panel-header">
                    <h3>{project.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {blueprints.length} drawing{blueprints.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {blueprints.map((bp, idx) => (
                            <li
                                key={bp._id}
                                style={{
                                    position: 'relative',
                                    zIndex: menuOpenId === bp._id ? 10 : 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: idx === 0 ? 'rgba(59,130,246,0.03)' : 'transparent',
                                }}
                            >
                                {/* File info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                    <div style={{ flexShrink: 0, padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                                        <FileText size={20} color="var(--accent-blue)" />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{bp.name}</span>
                                            {idx === 0 && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.04em',
                                                    padding: '2px 7px',
                                                    borderRadius: '999px',
                                                    background: 'var(--accent-blue)',
                                                    color: 'white',
                                                    textTransform: 'uppercase',
                                                    flexShrink: 0,
                                                }}>
                                                    Latest
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            v{bp.currentVersion}
                                            {bp.latestRevision?.uploadedAt && (
                                                <> · {new Date(bp.latestRevision.uploadedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                            )}
                                            {bp.latestRevision?.uploadedBy && (
                                                <> · {bp.latestRevision.uploadedBy}</>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                    <button
                                        className="btn text-btn"
                                        style={{ padding: '8px' }}
                                        aria-label="View file"
                                        onClick={() => bp.fileUrl && window.open(bp.fileUrl, '_blank')}
                                        title={bp.fileUrl ? 'Open file' : 'No file available'}
                                    >
                                        <Eye size={18} />
                                    </button>

                                    {/* Three-dot menu */}
                                    <div style={{ position: 'relative', zIndex: 99 }}>
                                        <button
                                            className="icon-btn"
                                            style={{ width: '34px', height: '34px' }}
                                            aria-label="More options"
                                            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === bp._id ? null : bp._id); }}
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {menuOpenId === bp._id && (
                                            <div style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '100%',
                                                marginTop: '4px',
                                                background: 'white',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: '10px',
                                                boxShadow: '0 8px 24px -4px rgba(0,0,0,0.14), 0 4px 8px -2px rgba(0,0,0,0.08)',
                                                minWidth: '175px',
                                                zIndex: 200,
                                                overflow: 'hidden',
                                            }}>
                                                {idx !== 0 && (
                                                    <button
                                                        onClick={() => handleSetAsLatest(bp._id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            width: '100%', padding: '11px 14px',
                                                            background: 'transparent', border: 'none',
                                                            fontSize: '0.85rem', fontWeight: 500,
                                                            color: 'var(--accent-blue)', cursor: 'pointer',
                                                            transition: 'background 0.1s ease',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Star size={14} />
                                                        Set as Latest
                                                    </button>
                                                )}
                                                {idx !== 0 && <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />}
                                                <button
                                                    onClick={() => { setMenuOpenId(null); setBlueprintToDelete(bp); }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        width: '100%', padding: '11px 14px',
                                                        background: 'transparent', border: 'none',
                                                        fontSize: '0.85rem', fontWeight: 600,
                                                        color: '#dc2626', cursor: 'pointer',
                                                        transition: 'background 0.1s ease',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <Trash2 size={14} />
                                                    Delete Drawing
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}

export default function Drawings({ openModal, projects }) {
    return (
        <section className="view active">
            <div className="view-header">
                <div>
                    <h2>Drawings</h2>
                    <p className="subtitle">Latest MEP schematics and revisions.</p>
                </div>
                <button className="btn primary" onClick={() => openModal('upload-revision')}>Upload Drawing</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {projects.length === 0 ? (
                    <div className="panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No projects found.
                    </div>
                ) : (
                    projects.map(project => (
                        <ProjectDrawings key={project._id} project={project} />
                    ))
                )}
            </div>
        </section>
    );
}
