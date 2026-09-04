import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Users, Mail, Trash2, ArrowLeft, AlertTriangle, X } from 'lucide-react';

export default function ManageUsers({ onBack }) {
    const admins = useQuery(api.adminUsers.listAdmins);
    const invites = useQuery(api.adminUsers.listInvited);
    const currentUser = useQuery(api.adminUsers.current);
    
    const isOwner = currentUser?.email === 'admin@riverrtech.com';
    
    const inviteUser = useMutation(api.adminUsers.invite);
    const revokeInvite = useMutation(api.adminUsers.revokeInvite);
    const removeAdmin = useMutation(api.adminUsers.removeAdmin);

    const [newEmail, setNewEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState('');
    const [adminToRemove, setAdminToRemove] = useState(null);

    const handleInvite = async (e) => {
        e.preventDefault();
        setError('');
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        setIsInviting(true);
        try {
            await inviteUser({ email: newEmail });
            setNewEmail('');
        } catch (err) {
            setError(err.data || err.message || 'Failed to send invite.');
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <button className="btn secondary" onClick={onBack} style={{ padding: '8px' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h3 style={{ fontSize: '20px', margin: 0 }}>Manage Admin Users</h3>
                    <p className="subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>Invite new administrators and manage existing access.</p>
                </div>
            </div>

            <div className="panel">
                <div className="panel-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={18} /> Invite Administrator</h3>
                </div>
                {isOwner ? (
                    <form onSubmit={handleInvite} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <input
                                type="email"
                                placeholder="Email address"
                                value={newEmail}
                                onChange={(e) => { setNewEmail(e.target.value); setError(''); }}
                                style={{ 
                                    width: '100%', padding: '10px 12px', 
                                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)'
                                }}
                                disabled={isInviting}
                            />
                            {error && <span style={{ color: 'var(--accent-red)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
                        </div>
                        <button type="submit" className="btn primary" disabled={isInviting || !newEmail}>
                            {isInviting ? 'Inviting...' : 'Send Invite'}
                        </button>
                    </form>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                        Only the Owner account can invite new administrators.
                    </p>
                )}
            </div>

            {invites !== undefined && invites.length > 0 && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Pending Invites</h3>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Email Address</th>
                                <th>Invited On</th>
                                {isOwner && <th>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map(invite => (
                                <tr key={invite._id}>
                                    <td>{invite.email}</td>
                                    <td>{new Date(invite.invitedAt).toLocaleDateString()}</td>
                                    {isOwner && (
                                        <td>
                                            <button 
                                                className="btn text-btn" 
                                                style={{ color: 'var(--accent-red)' }} 
                                                onClick={() => revokeInvite({ inviteId: invite._id })}
                                            >
                                                <Trash2 size={16} style={{ marginRight: '4px' }} /> Revoke
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="panel">
                <div className="panel-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Active Administrators</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Email Address</th>
                            <th>Role</th>
                            <th>Joined On</th>
                            {isOwner && <th>Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {admins === undefined ? (
                            <tr><td colSpan={isOwner ? "4" : "3"} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                        ) : admins.length === 0 ? (
                            <tr><td colSpan={isOwner ? "4" : "3"} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No admins found.</td></tr>
                        ) : admins.map(admin => (
                            <tr key={admin._id}>
                                <td>{admin.email}</td>
                                <td>
                                    {admin.email === 'admin@riverrtech.com' ? (
                                        <span style={{ 
                                            fontSize: '12px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 600,
                                            backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' 
                                        }}>Owner</span>
                                    ) : (
                                        <span style={{ 
                                            fontSize: '12px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 500,
                                            backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)' 
                                        }}>Admin</span>
                                    )}
                                </td>
                                <td>{new Date(admin._creationTime).toLocaleDateString()}</td>
                                {isOwner && (
                                    <td>
                                        {admin.email !== 'admin@riverrtech.com' && (
                                            <button 
                                                className="btn text-btn" 
                                                style={{ color: 'var(--accent-red)' }} 
                                                onClick={() => setAdminToRemove(admin)}
                                            >
                                                <Trash2 size={16} style={{ marginRight: '4px' }} /> Remove
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Remove Admin Confirmation Modal */}
            {adminToRemove && createPortal(
                <div className="modal-overlay active" style={{ zIndex: 3000 }} onClick={() => setAdminToRemove(null)}>
                    <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} color="var(--accent-red)" />
                                </div>
                                <h3 style={{ margin: 0 }}>Remove Administrator</h3>
                            </div>
                            <button className="icon-btn close-btn" onClick={() => setAdminToRemove(null)}><X size={18} /></button>
                        </div>
                        
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Are you sure you want to revoke admin access for <strong>{adminToRemove.email}</strong>?
                            </p>
                            <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '13px' }}>
                                They will immediately lose access to the admin dashboard. This action cannot be undone.
                            </p>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn secondary" onClick={() => setAdminToRemove(null)}>Cancel</button>
                            <button className="btn danger" onClick={async () => {
                                try {
                                    await removeAdmin({ userId: adminToRemove._id });
                                    setAdminToRemove(null);
                                } catch (err) {
                                    alert(err.message);
                                }
                            }}>Remove Admin</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
