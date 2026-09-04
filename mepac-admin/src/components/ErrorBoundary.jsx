import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-base, #F8FAFC)',
                    color: 'var(--text-primary, #0F172A)'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <AlertTriangle size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                        Something went wrong
                    </h3>
                    <p style={{ color: 'var(--text-secondary, #64748B)', maxWidth: '450px', marginBottom: '24px', fontSize: '0.9rem' }}>
                        {this.state.error?.message || 'An unexpected error occurred while rendering this view.'}
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="btn primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    >
                        <RefreshCw size={16} /> Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
