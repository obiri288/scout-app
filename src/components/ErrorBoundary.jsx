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

                            {/* Technical Details for Support/Dev */}
                            <details className="mt-8 text-left group">
                                <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition list-none flex items-center gap-1 justify-center">
                                    Technische Details anzeigen
                                </summary>
                                {this.state.error && (
                                    <div className="mt-6 p-4 bg-zinc-900 border border-white/10 rounded-xl text-left overflow-auto max-h-[300px]">
                                        <p className="text-pink-500 font-mono text-xs mb-2">Technical Details:</p>
                                        <div className="text-white/60 font-mono text-[10px] whitespace-pre-wrap break-all leading-relaxed">
                                            {this.state.error.toString()}
                                            {"\n\n"}
                                            {this.state.errorInfo?.componentStack}
                                        </div>
                                    </div>
                                )}
                            </details>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mt-8 text-left bg-zinc-900 border border-red-500/30 rounded-xl p-4 overflow-hidden max-w-xl mx-auto">
                                <h2 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
                                    <AlertTriangle size={14} /> Developer Info:
                                </h2>
                                <div className="bg-black/50 rounded-lg p-3 overflow-auto max-h-[300px]">
                                    <p className="text-red-400 font-mono text-xs mb-2 font-bold">{this.state.error.toString()}</p>
                                    <pre className="text-zinc-500 font-mono text-[10px] leading-relaxed">
                                        {this.state.error.stack}
                                    </pre>
                                </div>
                                <p className="mt-3 text-[10px] text-zinc-500 italic">
                                    Dieser Bereich ist nur im Entwicklungsmodus (Localhost) sichtbar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
