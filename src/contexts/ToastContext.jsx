import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Bell, CheckCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((content, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, content, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-6 left-0 right-0 z-[120] flex flex-col items-center gap-3 pointer-events-none px-4">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        onClick={() => removeToast(t.id)}
                        className={`bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer animate-in slide-in-from-top-2`}
                    >
                        <div className={`p-3 rounded-full ${t.type === 'error' ? 'bg-red-500/20 text-red-400' :
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
