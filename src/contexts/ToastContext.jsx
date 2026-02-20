import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, Bell, CheckCircle, WifiOff, Wifi } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Dynamic toast duration based on content length
    const getDuration = (content, type) => {
        const base = type === 'error' ? 5000 : 3500;
        const textLen = typeof content === 'string' ? content.length : 30;
        // ~50ms per character beyond 30 chars, max 8s
        return Math.min(8000, base + Math.max(0, textLen - 30) * 50);
    };

    const addToast = useCallback((content, type = 'info') => {
        const id = Date.now() + Math.random();
        const duration = getDuration(content, type);
        setToasts(prev => [...prev, { id, content, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Offline/Online detection
    useEffect(() => {
        const goOffline = () => {
            setIsOffline(true);
            addToast('Keine Internetverbindung. Einige Funktionen sind eingeschränkt.', 'error');
        };
        const goOnline = () => {
            setIsOffline(false);
            addToast('Wieder online! 🟢', 'success');
        };

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, isOffline }}>
            {children}

            {/* Offline banner */}
            {isOffline && (
                <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-xs font-bold text-center py-1.5 flex items-center justify-center gap-2 animate-in slide-in-from-top">
                    <WifiOff size={14} /> Offline
                </div>
            )}

            {/* Toast Container */}
            <div className={`fixed ${isOffline ? 'top-12' : 'top-6'} left-0 right-0 z-[120] flex flex-col items-center gap-3 pointer-events-none px-4 transition-all`}>
                {toasts.map(t => (
                    <div
                        key={t.id}
                        onClick={() => removeToast(t.id)}
                        className="bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer animate-in slide-in-from-top-2"
                    >
                        <div className={`p-3 rounded-full shrink-0 ${t.type === 'error' ? 'bg-red-500/20 text-red-400' :
                            t.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                'bg-blue-500/20 text-blue-400'
                            }`}>
                            {t.type === 'error' ? <AlertCircle size={20} /> :
                                t.type === 'success' ? <CheckCircle size={20} /> :
                                    <Bell size={20} />}
                        </div>
                        <div className="flex-1 text-sm font-medium">{t.content}</div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
