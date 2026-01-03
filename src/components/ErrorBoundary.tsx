import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in its child component tree.
 * It logs errors and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info in state
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to an error reporting service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with retro Windows 95 styling
      return (
        <div className="retro-window m-4">
          <div className="retro-title-bar bg-red-600">
            <div className="flex items-center gap-2">
              <span className="text-xl">💥</span>
              <span>APPLICATION ERROR</span>
            </div>
          </div>
          <div className="p-6 bg-gray-300">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">😵</div>
              <h2 className="text-2xl font-bold text-black mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-700 text-sm">
                An unexpected error occurred. Please try again.
              </p>
            </div>

            {/* Error details (collapsed by default) */}
            <details className="retro-panel p-4 mb-4 bg-white">
              <summary className="cursor-pointer font-bold text-black mb-2">
                🔍 Error Details
              </summary>
              <div className="mt-2 text-xs font-mono overflow-auto max-h-40 bg-gray-100 p-2 border border-gray-400">
                <p className="text-red-600 font-bold">
                  {this.state.error?.message || 'Unknown error'}
                </p>
                {this.state.error?.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-gray-600">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="retro-btn px-6 py-2"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="retro-btn px-6 py-2"
              >
                🔃 Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized error boundary for 3D/WebGL components
 */
export class ThreeJSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('3D Rendering Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="retro-panel p-6 m-4 bg-yellow-50 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h3 className="font-bold text-black mb-2">3D View Unavailable</h3>
          <p className="text-gray-600 text-sm mb-4">
            There was a problem loading the 3D cube view.
            This might be due to WebGL not being supported.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={this.handleRetry} className="retro-btn text-sm">
              🔄 Retry
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Error: {this.state.error?.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
