import React, { Component, type ReactNode } from 'react';
import { logError } from '@/utils/errorLog';

interface Props { 
  children: ReactNode; 
  featureName: string; 
}

interface State { 
  hasError: boolean; 
  error?: Error; 
}

export class AIErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError('AIErrorBoundary caught an error', `${error.toString()} | ${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p>{this.props.featureName} is temporarily unavailable.</p>
          <button 
            className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
