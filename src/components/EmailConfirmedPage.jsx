import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';

export const EmailConfirmedPage = () => {
    useEffect(() => {
        // Automatically redirect to the dashboard/home after 5 seconds
        const timer = setTimeout(() => {
            window.location.hash = ''; // Back to root (or dashboard)
            window.location.pathname = '/';
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleRedirect = () => {
        window.location.hash = ''; 
        window.location.pathname = '/';
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center"
            >
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-emerald-500/20">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                    >
                        <CheckCircle size={48} className="text-emerald-500" />
                    </motion.div>
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-3">
                    E-Mail bestätigt!
                </h1>
                
                <p className="text-zinc-400 mb-8 leading-relaxed">
                    Deine E-Mail-Adresse wurde erfolgreich aktualisiert. Du bist nun sicher mit deiner neuen Adresse eingeloggt.
                </p>

                <button
                    onClick={handleRedirect}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 group"
                >
                    Zurück zur App
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
};
