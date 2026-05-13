import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle, ArrowRight, Loader2 
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

/**
 * AuthCallbackScreen — Handles the post-registration email confirmation flow.
 * Provides visual feedback (Loading -> Success) and ensures the session is stable.
 */
export const AuthCallbackScreen = () => {
    const { session, setIsAuthCallback } = useUser();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success'

    useEffect(() => {
        // If we have a session, it means Supabase has processed the token
        if (session) {
            // Short delay for a smoother visual transition
            const timer = setTimeout(() => {
                setStatus('success');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [session]);

    const handleContinue = () => {
        // Signal that the callback flow is complete
        setIsAuthCallback(false);
        
        // Clean URL: remove hash tokens & query params left by Supabase
        const cleanUrl = window.location.origin + '/';
        window.history.replaceState(null, '', cleanUrl);
        
        // Final redirect to the app root
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
            <AnimatePresence mode="wait">
                {status === 'loading' ? (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center gap-6"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img src="/cavio-icon.png" alt="Cavio" className="w-10 h-10 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold text-white tracking-tight">Verifizierung läuft...</h2>
                            <p className="text-zinc-500 text-sm">Deine Zugangsdaten werden sicher verarbeitet.</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full" />

                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 ring-1 ring-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                            >
                                <CheckCircle size={56} className="text-emerald-500" strokeWidth={1.5} />
                            </motion.div>
                        </div>
                        
                        <div className="space-y-3 mb-10">
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                E-Mail bestätigt!
                            </h1>
                            <p className="text-zinc-400 leading-relaxed px-4">
                                Willkommen bei Cavio. Deine E-Mail-Adresse wurde erfolgreich verifiziert. Du kannst jetzt alle Funktionen nutzen.
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleContinue}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(8,145,178,0.3)] flex justify-center items-center gap-3 group border border-white/10"
                        >
                            Weiter zur App
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
