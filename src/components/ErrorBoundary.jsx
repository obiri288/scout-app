import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Global Error Boundary — catches React render crashes and shows a
 * recovery UI instead of a white screen.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-6">
                    <div className="max-w-sm w-full text-center">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} className="text-red-400" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2">Etwas ist schiefgelaufen</h1>
                        <p className="text-zinc-400 text-sm mb-6">
                            Ein unerwarteter Fehler ist aufgetreten. Versuche die App neu zu laden.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                            >
                                <RefreshCcw size={18} /> Erneut versuchen
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-6 rounded-xl font-bold text-sm transition border border-zinc-700"
                            >
                                Seite neu laden
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-zinc-600 text-xs cursor-pointer hover:text-zinc-400">Technische Details</summary>
                                <pre className="text-[10px] text-red-400/60 mt-2 bg-zinc-900 p-3 rounded-lg overflow-x-auto border border-zinc-800">
                                    {this.state.error.message}
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
