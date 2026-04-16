import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, Play, ArrowRight, User } from 'lucide-react';
import { calculateProReadinessScore } from '../lib/helpers';

/**
 * Gamified Pro-Readiness Card.
 * Replaces ProfileCompletenessCard.
 */
export const ProReadinessCard = ({ profile, highlights = [], onEditProfile }) => {
    const { score, quests } = useMemo(() => calculateProReadinessScore(profile, highlights), [profile, highlights]);

    if (score >= 100) return null; // Fully complete — no need to show unless desired

    // Offset calculation for SVG circle (circumference = 2 * Math.PI * r)
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mx-4 mt-4"
        >
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group">
                {/* Subtle background glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                <div className="flex items-center gap-5 relative z-10">
                    {/* Circular Progress */}
                    <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-20 h-20">
                            {/* Background circle */}
                            <circle
                                cx="40"
                                cy="40"
                                r={radius}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="6"
                                fill="none"
                            />
                            {/* Progress circle */}
                            <motion.circle
                                cx="40"
                                cy="40"
                                r={radius}
                                stroke="url(#gradient)"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                className="drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#4f46e5" /> {/* indigo-600 */}
                                    <stop offset="100%" stopColor="#22d3ee" /> {/* cyan-400 */}
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* Score Text inside Circle */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-white">{score}</span>
                            <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest -mt-1">Score</span>
                        </div>
                    </div>

                    {/* Text & Primary Quest */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-['Montserrat'] font-bold text-white text-lg tracking-tight uppercase mb-1">
                            Pro-Readiness
                        </h3>
                        {quests.length > 0 ? (
                            <div className="text-xs text-muted-foreground leading-relaxed">
                                <span className="text-cyan-400 font-bold">Nächste Quest:</span> {quests[0]}
                            </div>
                        ) : (
                            <div className="text-xs text-cyan-400 font-bold">
                                Du bist 100% Pro-Ready! 🏆
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-Quests List (if any beyond the first) */}
                {quests.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2 relative z-10">
                        {quests.slice(1, 4).map((quest, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
                                <div className="mt-0.5 w-1 h-1 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
                                <span>{quest}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA Button */}
                <button
                    onClick={onEditProfile}
                    className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 relative z-10 group-hover:border-cyan-500/30"
                >
                    <User size={14} className="text-cyan-400" />
                    Profil aktualisieren
                    <ArrowRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
            </div>
        </motion.div>
    );
};
