import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Send, AlertTriangle } from 'lucide-react';
import * as api from '../lib/api';

export const AppealModal = ({ videoId, onClose, session, onAppealSubmitted }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Bitte gib eine Begründung ein.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Send the appeal as a special report
            await api.submitReport(session.user.id, videoId, 'video_appeal', reason);
            if (onAppealSubmitted) {
                onAppealSubmitted();
            }
            onClose();
        } catch (err) {
            console.error("Appeal Submit Error:", err);
            setError('Es gab ein Problem beim Senden. Bitte versuche es später erneut.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/5 bg-[#050505] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Widerspruch einlegen</h2>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Video-Entfernung</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-6 flex gap-3">
                        <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-200/80 leading-relaxed">
                            Dein Video wurde aufgrund von Nutzer-Meldungen entfernt. Wenn du glaubst, dass dies ein Fehler war, 
                            kannst du hier eine Begründung einreichen. Unser Admin-Team wird deinen Fall prüfen.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                                Deine Stellungnahme
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Bitte beschreibe, warum dein Video nicht gegen unsere Richtlinien verstößt..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 min-h-[120px] resize-none"
                            />
                        </div>

                        {error && (
                            <p className="text-sm font-medium text-red-500">{error}</p>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Widerspruch senden
                                    <Send size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
