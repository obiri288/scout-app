import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import * as api from '../lib/api';

const STEPS = {
    REPORT: 'report',
    HIDE: 'hide',
    SUCCESS: 'success'
};

const REASONS = [
    "Unangemessene Inhalte",
    "Spam oder Betrug",
    "Belästigung oder Mobbing",
    "Urheberrechtsverletzung",
    "Falsche Informationen",
    "Sonstiges"
];

export const ReportModal = ({ targetId, targetType, onClose, session }) => {
    const [step, setStep] = useState(STEPS.REPORT);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleSubmitReport = async () => {
        if (!reason) return;
        setIsSubmitting(true);
        try {
            const result = await api.submitReport(session.user.id, targetId, targetType, reason);
            console.log("Report Insert Result:", result);
            setStep(STEPS.HIDE);
        } catch (error) {
            console.error("Report Insert Error:", error);
            addToast("Meldung konnte nicht gesendet werden.", "error");
            setIsSubmitting(false);
        }
    };

    const handleHideContent = async (hide) => {
        if (hide) {
            try {
                await api.hideContent(session.user.id, targetId, targetType);
                addToast("Inhalt wird zukünftig ausgeblendet.", "success");
            } catch (error) {
                console.error("Hide failed:", error);
            }
        }
        setStep(STEPS.SUCCESS);
        setTimeout(onClose, 2000);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            <Flag size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Inhalt melden</h2>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sicherheit & Community</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {step === STEPS.REPORT && (
                            <motion.div 
                                key="step-report"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    Warum möchtest du diesen {targetType === 'video' ? 'Inhalt' : 'Nutzer'} melden? Deine Meldung ist anonym.
                                </p>
                                
                                <div className="space-y-2 py-2">
                                    {REASONS.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setReason(r)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${
                                                reason === r 
                                                ? 'bg-red-500/10 border-red-500/50 text-white' 
                                                : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10'
                                            }`}
                                        >
                                            <span className="font-bold text-sm">{r}</span>
                                            {reason === r && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleSubmitReport}
                                    disabled={!reason || isSubmitting}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900/20 disabled:text-red-500/50 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : 'Meldung absenden'}
                                </button>
                            </motion.div>
                        )}

                        {step === STEPS.HIDE && (
                            <motion.div 
                                key="step-hide"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 py-4 text-center"
                            >
                                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <EyeOff size={40} />
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white">Inhalt ausblenden?</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed px-4">
                                        Möchtest du, dass wir diesen {targetType === 'video' ? 'Inhalt' : 'Nutzer'} zukünftig in deinem Feed ausblenden?
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <button
                                        onClick={() => handleHideContent(true)}
                                        className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                                    >
                                        Ja, ausblenden
                                    </button>
                                    <button
                                        onClick={() => handleHideContent(false)}
                                        className="w-full bg-white/5 text-zinc-400 font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
                                    >
                                        Nein, danke
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === STEPS.SUCCESS && (
                            <motion.div 
                                key="step-success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 text-center space-y-4"
                            >
                                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white">Vielen Dank!</h3>
                                    <p className="text-sm text-zinc-500">Deine Meldung wurde erfolgreich übermittelt.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
