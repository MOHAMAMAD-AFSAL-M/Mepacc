import React, { useState, useEffect, useRef } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Lock, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';

export default function SessionLockModal({ currentUser, onUnlock, reason = 'inactivity' }) {
    const { signIn, signOut } = useAuthActions();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password) {
            setError('Please enter your password.');
            return;
        }

        setError('');
        setIsUnlocking(true);

        const email = currentUser?.email || 'admin@riverrtech.com';

        try {
            await signIn("password", { email, password, flow: "signIn" });
            setPassword('');
            onUnlock();
        } catch (err) {
            setError('Incorrect password. Please try again.');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleSignOut = async () => {
        try {
            sessionStorage.removeItem('mepac_session_locked');
            sessionStorage.removeItem('mepac_last_active');
            window.location.hash = '';
            await signOut();
        } catch (err) {
            console.error('Sign out error:', err);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.25s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #E2E8F0)',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '420px',
                padding: '36px 32px',
                textAlign: 'center',
                color: 'var(--text-primary, #0F172A)',
                fontFamily: "'Inter', sans-serif"
            }}>
                {/* Lock Icon Badge */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(30, 64, 175, 0.08)',
                    border: '2px solid rgba(30, 64, 175, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    color: 'var(--accent-blue, #1E40AF)'
                }}>
                    <Lock size={30} />
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary, #0F172A)' }}>
                    Session Locked
                </h2>
                
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #64748B)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                    {reason === 'screen_off'
                        ? 'Screen turned off or tab was inactive. Enter your password to resume.'
                        : 'Session timed out after 3 hours of inactivity. Enter your password to resume.'}
                </p>

                {/* User Info Card */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-base, #F8FAFC)',
                    border: '1px solid var(--border-subtle, #E2E8F0)',
                    marginBottom: '20px',
                    textAlign: 'left'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-blue, #1E40AF)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        flexShrink: 0,
                        textTransform: 'uppercase'
                    }}>
                        {currentUser?.email ? currentUser.email.charAt(0) : 'A'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary, #0F172A)' }}>
                            Admin Account
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentUser?.email || 'admin@riverrtech.com'}
                        </div>
                    </div>
                    <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleUnlock}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            ref={inputRef}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password to unlock"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isUnlocking}
                            autoComplete="current-password"
                            style={{
                                width: '100%',
                                padding: '12px 42px 12px 14px',
                                border: '1.5px solid var(--border-subtle, #E2E8F0)',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                color: 'var(--text-primary, #0F172A)',
                                backgroundColor: 'var(--bg-surface, #ffffff)',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue, #1E40AF)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle, #E2E8F0)'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted, #94A3B8)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isUnlocking}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--accent-blue, #1E40AF)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: isUnlocking ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s',
                            opacity: isUnlocking ? 0.7 : 1
                        }}
                    >
                        {isUnlocking ? 'Verifying...' : 'Unlock Session'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle, #E2E8F0)' }}>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                    >
                        <LogOut size={15} /> Sign Out & Switch Account
                    </button>
                </div>
            </div>
        </div>
    );
}
