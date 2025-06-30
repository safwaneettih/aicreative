import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error but don't throw it up
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Handle specific media-related errors more gracefully
        if (error.name === 'AbortError' ||
            error.message?.includes('removeAttribute') ||
            error.message?.includes('getMediaElement') ||
            error.message?.includes('signal is aborted')) {
            // For these specific errors, just reset silently
            console.warn('Media/Abort error caught and handled:', error.message);
            this.setState({ hasError: false, error: null, errorInfo: null });
            return;
        }

        // For other errors, show the error UI
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="flex items-center justify-center w-full h-full bg-gray-900 border border-gray-600 rounded-lg">
                    <div className="text-center text-gray-300 p-6">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Video Player Error</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Something went wrong with the video player.
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null, errorInfo: null });
                                // Force a re-render of the component
                                if (this.props.onRetry) {
                                    this.props.onRetry();
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-xs text-gray-500">Error Details</summary>
                                <pre className="mt-2 text-xs text-red-400 bg-gray-800 p-2 rounded overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
