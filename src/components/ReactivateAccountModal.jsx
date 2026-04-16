import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Power, LogOut, User, CheckCircle2 } from 'lucide-react';

const ConfettiParticle = ({ index }) => {
    const randomX = Math.random() * 400 - 200;
    const randomY = Math.random() * -400 - 100;
    const colors = ['#22d3ee', '#818cf8', '#c084fc', '#fb7185', '#fbbf24'];
    
    return (
        <motion.div
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{ 
                x: randomX, 
                y: randomY, 
                opacity: 0,
                scale: Math.random() * 1.5 + 0.5,
                rotate: Math.random() * 360 
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute rounded-sm"
            style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: colors[index % colors.length] 
            }}
        />
    );
};

export const ReactivateAccountModal = ({ profile, onConfirm, onLogout }) => {
    const [isReactivating, setIsReactivating] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleConfirm = async () => {
        setIsReactivating(true);
        // Delay for dramatic effect
        setTimeout(async () => {
            setShowConfetti(true);
            await onConfirm();
        }, 1200);
    };

    if (!profile) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center overflow-hidden"
            >
                {/* Decorative background glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full" />

                <div className="relative z-10">
                    <motion.div 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6"
                    >
                        <Heart size={32} className="text-white animate-pulse" fill="currentColor" />
                    </motion.div>

                    <motion.h2 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-black text-white mb-2"
                    >
                        Willkommen zurück, {(profile?.full_name || 'Athlet').split(' ')[0]}!
                    </motion.h2>

                    <motion.p 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-zinc-400 text-sm leading-relaxed mb-8"
                    >
                        Wir haben dich vermisst. Dein Account ist derzeit deaktiviert. 
                        Möchtest du ihn jetzt reaktivieren und wieder voll durchstarten?
                    </motion.p>

                    <div className="space-y-3">
                        <motion.button
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleConfirm}
                            disabled={isReactivating}
                            className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition hover:bg-zinc-100 disabled:opacity-50"
                        >
                            {isReactivating ? (
                                <motion.div 
                                    animate={{ rotate: 360 }} 
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full"
                                />
                            ) : (
                                <>
                                    <Power size={18} />
                                    Account reaktivieren
                                </>
                            )}
                        </motion.button>

                        <motion.button
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            onClick={onLogout}
                            className="w-full bg-transparent text-zinc-500 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:text-white transition"
                        >
                            <LogOut size={16} />
                            Später vielleicht (Logout)
                        </motion.button>
                    </div>
                </div>

                {/* Confetti Explosion Area */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    {showConfetti && Array.from({ length: 40 }).map((_, i) => (
                        <ConfettiParticle key={i} index={i} />
                    ))}
                </div>

                {/* Success Indicator Overlay */}
                <AnimatePresence>
                    {showConfetti && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <motion.div
                                    initial={{ y: 20 }}
                                    animate={{ y: 0 }}
                                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center"
                                >
                                    <CheckCircle2 size={32} className="text-white" />
                                </motion.div>
                                <span className="text-white font-bold">Fertig!</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
