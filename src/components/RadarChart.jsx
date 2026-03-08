import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

const ATTRS = [
    { key: 'pace', label: 'PAC' },
    { key: 'shooting', label: 'SHO' },
    { key: 'passing', label: 'PAS' },
    { key: 'dribbling', label: 'DRI' },
    { key: 'defending', label: 'DEF' },
    { key: 'physical', label: 'PHY' },
];

export const RadarChart = ({ playerId, session, isOwnProfile, compact = false }) => {
    const [avgValues, setAvgValues] = useState([50, 50, 50, 50, 50, 50]);
    const [myValues, setMyValues] = useState(null);
    const [raterCount, setRaterCount] = useState(0);
    const [showRating, setShowRating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase.from('player_attributes')
                    .select('*')
                    .eq('player_id', playerId);

                const rows = data || [];
                setRaterCount(rows.length);

                if (rows.length > 0) {
                    const avgs = ATTRS.map(a => {
                        const sum = rows.reduce((s, r) => s + (r[a.key] || 50), 0);
                        return Math.round(sum / rows.length);
                    });
                    setAvgValues(avgs);
                }

                if (session) {
                    const mine = rows.find(r => r.rater_id === session.user.id);
                    if (mine) {
                        setMyValues(ATTRS.map(a => mine[a.key] || 50));
                    }
                }
            } catch (e) {
                console.warn("Failed to load attributes:", e);
            }
        };
        load();
    }, [playerId, session]);

    const [editValues, setEditValues] = useState([50, 50, 50, 50, 50, 50]);

    useEffect(() => {
        if (myValues) setEditValues([...myValues]);
    }, [myValues]);

    const handleSubmit = async () => {
        if (!session || submitting) return;
        setSubmitting(true);
        try {
            const attrs = {};
            ATTRS.forEach((a, i) => { attrs[a.key] = editValues[i]; });

            const { error } = await supabase.from('player_attributes')
                .upsert({
                    player_id: playerId,
                    rater_id: session.user.id,
                    ...attrs,
                }, { onConflict: 'player_id,rater_id' });
            if (error) throw error;

            setMyValues([...editValues]);
            addToast('Bewertung gespeichert! ⚡', 'success');
            setShowRating(false);

            // Reload averages
            const { data } = await supabase.from('player_attributes')
                .select('*').eq('player_id', playerId);
            if (data && data.length > 0) {
                setRaterCount(data.length);
                setAvgValues(ATTRS.map(a => {
                    const sum = data.reduce((s, r) => s + (r[a.key] || 50), 0);
                    return Math.round(sum / data.length);
                }));
            }
        } catch (e) {
            addToast('Bewertung fehlgeschlagen.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const overall = useMemo(() => Math.round(avgValues.reduce((s, v) => s + v, 0) / avgValues.length), [avgValues]);
    const chartData = useMemo(() => {
        return ATTRS.map((a, i) => ({
            subject: a.label,
            A: displayValues[i],
            fullMark: 99,
        }));
    }, [displayValues]);

    return (
        <div className={compact ? "" : "bg-white/5 border border-border rounded-2xl p-4 relative"}>
            {!compact && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">{overall}</span>
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">OVR</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold">
                        {raterCount} {raterCount === 1 ? 'Bewertung' : 'Bewertungen'}
                    </span>
                </div>
            )}

            {/* Recharts Radar */}
            <div className={`w-full mx-auto relative ${compact ? 'h-[250px]' : 'h-[300px]'}`}>
                {/* Glow behind the chart */}
                <div className="absolute inset-0 bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none" />

                <ResponsiveContainer width="100%" height="100%">
                    <RechartsRadar cx="50%" cy="50%" outerRadius={compact ? "70%" : "80%"} data={chartData}>
                        <PolarGrid
                            gridType="polygon"
                            stroke="rgba(255, 255, 255, 0.1)"
                            polarRadius={[20, 40, 60, 80, 100].map(r => r * 0.8)} // Optional visual sub-rings
                        />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{
                                fill: '#a1a1aa', // text-zinc-400
                                fontSize: compact ? 10 : 12,
                                fontWeight: 800,
                                fontFamily: 'system-ui'
                            }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 99]}
                            tick={false}
                            axisLine={false}
                        />
                        <Radar
                            name="Attributes"
                            dataKey="A"
                            stroke="#00F0FF"
                            strokeWidth={2}
                            fill="#00F0FF"
                            fillOpacity={0.3}
                            isAnimationActive={true}
                            animationDuration={1500}
                        />
                    </RechartsRadar>
                </ResponsiveContainer>
            </div>

            {/* Rating UI */}
            {session && !isOwnProfile && !compact && (
                <div className="mt-3">
                    {!showRating ? (
                        <button
                            onClick={() => setShowRating(true)}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground font-bold text-xs py-2.5 rounded-xl transition-all"
                        >
                            {myValues ? '⚡ Bewertung ändern' : '⚡ Spieler bewerten'}
                        </button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2 pt-2 border-t border-white/5"
                        >
                            {ATTRS.map((a, i) => (
                                <div key={a.key} className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-500 w-8">{a.label}</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="99"
                                        value={editValues[i]}
                                        onChange={e => {
                                            const next = [...editValues];
                                            next[i] = parseInt(e.target.value);
                                            setEditValues(next);
                                        }}
                                        className="flex-1 h-1.5 accent-cyan-500 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-foreground w-6 text-right">{editValues[i]}</span>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 bg-cyan-600 text-white font-bold text-xs py-2 rounded-lg"
                                >
                                    {submitting ? 'Speichern...' : 'Bewertung speichern'}
                                </button>
                                <button
                                    onClick={() => { setShowRating(false); if (myValues) setEditValues([...myValues]); }}
                                    className="px-4 bg-white/5 text-zinc-400 font-bold text-xs py-2 rounded-lg"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
};
