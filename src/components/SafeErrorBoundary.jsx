import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class SafeErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("UI Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 text-center text-white bg-zinc-900 rounded-xl m-4 border border-red-500/30">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                    <h3 className="font-bold mb-2">Ein Fehler ist aufgetreten</h3>
                    <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm">Neustarten</button>
                </div>
            );
        }
        return this.props.children;
    }
}
