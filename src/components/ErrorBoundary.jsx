import React from 'react';

/**
 * ErrorBoundary — Catches unexpected React component runtime errors
 * and renders a clean user-friendly fallback view instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-surface font-sans">
          <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mb-4 text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-primary-light transition-all shadow-md"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
