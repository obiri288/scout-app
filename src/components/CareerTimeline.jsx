import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Clock, ExternalLink, Shield, Loader2, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmptyState } from './EmptyState';

export const CareerTimeline = ({ userId, refreshKey }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('career_history')
                    .select('*, clubs(is_verified)')
                    .eq('user_id', userId)
                    .order('start_date', { ascending: false });
                if (error) throw error;
                setEntries(data || []);
            } catch (e) {
                console.warn('Career history fetch failed:', e);
                setEntries([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, refreshKey]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Heute';
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    };

    const calcDuration = (start, end) => {
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
        const years = Math.floor(months / 12);
        const rem = months % 12;
        if (years > 0 && rem > 0) return `${years} J. ${rem} M.`;
        if (years > 0) return `${years} Jahr${years > 1 ? 'e' : ''}`;
        return `${rem} Monat${rem !== 1 ? 'e' : ''}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 size={24} className="text-muted-foreground animate-spin" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <EmptyState
                icon={Briefcase}
                title="Noch keine Stationen 📋"
                description="Dieser Spieler hat noch keine Vereinshistorie eingetragen."
            />
        );
    }

    return (
        <div className="px-4 py-6 animate-in fade-in">
            <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500/50 via-cyan-500/20 to-transparent" />

                <div className="space-y-4">
                    {entries.map((entry, index) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="relative flex gap-4"
                        >
                            {/* Timeline dot */}
                            <div className="relative z-10 flex-shrink-0 mt-4">
                                <div className={`w-[10px] h-[10px] rounded-full border-2 ${
                                    !entry.end_date
                                        ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                                        : 'bg-slate-600 border-slate-500'
                                }`} style={{ marginLeft: '15px' }} />
                            </div>

                            {/* Card */}
                            <motion.div
                                whileHover={{ scale: 1.01, borderColor: 'rgba(34,211,238,0.3)' }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                className="flex-1 bg-white/5 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-sm hover:shadow-lg hover:shadow-cyan-900/5 transition-all"
                            >
                                {/* Club name + verification */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-800/50 border border-white/10 flex items-center justify-center flex-shrink-0">
                                            <Shield size={14} className="text-slate-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="font-bold text-foreground text-sm truncate">
                                                    {entry.club_name}
                                                </h4>
                                                {entry.clubs?.is_verified ? (
                                                    <BadgeCheck size={16} className="text-cyan-400 flex-shrink-0" title="Offizieller Verein" />
                                                ) : entry.is_verified ? (
                                                    <BadgeCheck size={16} className="text-emerald-400 flex-shrink-0" title="Station verifiziert" />
                                                ) : entry.verification_status === 'pending' ? (
                                                    <Clock size={14} className="text-amber-500 flex-shrink-0" title="Prüfung ausstehend" />
                                                ) : null}
                                            </div>
                                            {entry.league && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    {entry.league}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Active badge */}
                                    {!entry.end_date && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                            Aktuell
                                        </span>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatDate(entry.start_date)}</span>
                                    <span className="w-3 h-px bg-muted-foreground/40" />
                                    <span>{formatDate(entry.end_date)}</span>
                                    <span className="text-[10px] text-muted-foreground/60 ml-1">
                                        ({calcDuration(entry.start_date, entry.end_date)})
                                    </span>
                                </div>

                                {/* Proof link */}
                                {entry.proof_url && (
                                    <a
                                        href={entry.proof_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition font-medium"
                                    >
                                        <ExternalLink size={12} />
                                        Beweis-Link ansehen
                                    </a>
                                )}

                                {/* Status removed as it's now integrated in the header badge */}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
