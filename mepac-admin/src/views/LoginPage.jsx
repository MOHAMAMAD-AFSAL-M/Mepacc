import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const { signIn } = useAuthActions();
    const convex = useConvex();
    
    const [step, setStep] = useState('email'); // 'email' | 'password' | 'setPassword'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const isInvited = await convex.query(api.adminUsers.checkIsInvited, { email });
            if (isInvited) {
                setStep('setPassword');
            } else {
                setStep('password');
            }
        } catch (err) {
            setError("Failed to check email.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (step === 'setPassword') {
            if (password.length < 8) {
                setError("Password must be at least 8 characters long.");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (step === 'setPassword') {
                // Sign up flow for invited users
                await signIn("password", { email, password, flow: "signUp" });
                await convex.mutation(api.adminUsers.consumeInvite, { email });
            } else {
                // Standard sign in
                await signIn("password", { email, password, flow: "signIn" });
            }
        } catch (err) {
            setError(step === 'setPassword' ? "Failed to set password." : "Invalid email or password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            display: 'flex', 
            height: '100vh', 
            width: '100vw', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: 'var(--bg-base)'
        }}>
            <div className="panel" style={{ width: '400px', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img 
                        src="/images/logo.png" 
                        alt="MEPac Logo" 
                        style={{ width: 'auto', height: '48px', margin: '0 auto 16px', display: 'block' }} 
                    />
                    <h2>Welcome to MEPac</h2>
                    <p className="subtitle">Admin Console</p>
                </div>

                {error && (
                    <div style={{ 
                        padding: '12px', marginBottom: '16px', 
                        backgroundColor: 'var(--accent-red-bg)', color: 'var(--accent-red)',
                        borderRadius: 'var(--radius-md)', fontSize: '14px', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {step === 'email' && (
                    <form onSubmit={handleEmailSubmit}>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '10px 12px', 
                                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                    outline: 'none'
                                }}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
                            {isSubmitting ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                )}

                {(step === 'password' || step === 'setPassword') && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {email} <button type="button" onClick={() => setStep('email')} style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Change</button>
                        </div>
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {step === 'setPassword' ? 'Set your password' : 'Password'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete={step === 'setPassword' ? "new-password" : "current-password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '10px 40px 10px 12px', 
                                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                        outline: 'none'
                                    }}
                                    required
                                    disabled={isSubmitting}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {step === 'setPassword' && (
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>
                                    Must be at least 8 characters long.
                                </span>
                            )}
                        </div>
                        
                        {step === 'setPassword' && (
                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Confirm Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ 
                                            width: '100%', padding: '10px 40px 10px 12px', 
                                            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                            outline: 'none'
                                        }}
                                        required
                                        disabled={isSubmitting}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
