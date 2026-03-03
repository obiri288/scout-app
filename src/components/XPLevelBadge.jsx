import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Star, Crown, Shield, Sword } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LEVELS = [
    { name: 'Rookie', minXP: 0, icon: Shield, color: '#71717a' },
    { name: 'Amateur', minXP: 500, icon: Sword, color: '#22c55e' },
    { name: 'Semi-Pro', minXP: 1500, icon: Star, color: '#3b82f6' },
    { name: 'Pro', minXP: 3000, icon: Crown, color: '#f59e0b' },
    { name: 'Elite', minXP: 5000, icon: Trophy, color: '#ef4444' },
];

const getLevel = (xp) => {
    let level = LEVELS[0];
    for (const l of LEVELS) {
        if (xp >= l.minXP) level = l;
    }
    return level;
};

const getNextLevel = (xp) => {
    for (const l of LEVELS) {
        if (xp < l.minXP) return l;
    }
    return null;
};

const getProgress = (xp) => {
    const current = getLevel(xp);
    const next = getNextLevel(xp);
    if (!next) return 100;
    const range = next.minXP - current.minXP;
    const progress = xp - current.minXP;
    return Math.min(100, Math.round((progress / range) * 100));
};

export const XPLevelBadge = ({ playerId, compact = false }) => {
    const [totalXP, setTotalXP] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase.from('player_xp_ledger')
                    .select('xp_amount')
                    .eq('player_id', playerId);
                const total = (data || []).reduce((s, r) => s + r.xp_amount, 0);
                setTotalXP(total);
            } catch (_) { }
            setLoaded(true);
        };
        load();
    }, [playerId]);

    const level = useMemo(() => getLevel(totalXP), [totalXP]);
    const next = useMemo(() => getNextLevel(totalXP), [totalXP]);
    const progress = useMemo(() => getProgress(totalXP), [totalXP]);
    const LevelIcon = level.icon;

    if (!loaded) return null;

    if (compact) {
        return (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                    backgroundColor: `${level.color}15`,
                    borderColor: `${level.color}40`,
                    color: level.color,
                }}
            >
                <LevelIcon size={10} />
                {level.name}
            </motion.div>
        );
    }

    return (
        <div className="bg-white/5 border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${level.color}20` }}
                    >
                        <LevelIcon size={16} style={{ color: level.color }} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">{level.name}</div>
                        <div className="text-[10px] text-muted-foreground">{totalXP} XP</div>
                    </div>
                </div>
                {next && (
                    <div className="text-[10px] text-muted-foreground text-right">
                        Nächstes Level:<br />
                        <span className="font-bold" style={{ color: next.color }}>{next.name} ({next.minXP} XP)</span>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${level.color}, ${next?.color || level.color})` }}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">{progress}%</span>
                {next && <span className="text-[9px] text-muted-foreground">{next.minXP - totalXP} XP bis {next.name}</span>}
            </div>
        </div>
    );
};
