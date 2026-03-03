import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

const ATTRS = [
    { key: 'pace', label: 'PAC', color: '#22c55e' },
    { key: 'shooting', label: 'SHO', color: '#ef4444' },
    { key: 'passing', label: 'PAS', color: '#3b82f6' },
    { key: 'dribbling', label: 'DRI', color: '#f59e0b' },
    { key: 'defending', label: 'DEF', color: '#8b5cf6' },
    { key: 'physical', label: 'PHY', color: '#06b6d4' },
];

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 90;
const LABEL_OFFSET = 24;

// Calculate point on hexagon for a given index and value (0-99)
const getPoint = (index, value, maxVal = 99) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / maxVal) * RADIUS;
    return {
        x: CENTER + r * Math.cos(angle),
        y: CENTER + r * Math.sin(angle),
    };
};

const getLabelPos = (index) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    return {
        x: CENTER + (RADIUS + LABEL_OFFSET) * Math.cos(angle),
        y: CENTER + (RADIUS + LABEL_OFFSET) * Math.sin(angle),
    };
};

// Build polygon path from values
const buildPolygon = (values) => {
    return values.map((v, i) => {
        const p = getPoint(i, v);
        return `${p.x},${p.y}`;
    }).join(' ');
};

// Build grid rings
const buildRing = (fraction) => {
    return Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, fraction * 99);
        return `${p.x},${p.y}`;
    }).join(' ');
};

export const RadarChart = ({ playerId, session, isOwnProfile }) => {
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
    const displayValues = showRating ? editValues : avgValues;
    const polygon = buildPolygon(displayValues);

    return (
        <div className="bg-white/5 border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">{overall}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">OVR</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-bold">
                    {raterCount} Bewertung{raterCount !== 1 ? 'en' : ''}
                </span>
            </div>

            {/* SVG Radar */}
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[280px] mx-auto">
                {/* Grid rings */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                    <polygon
                        key={f}
                        points={buildRing(f)}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis lines */}
                {ATTRS.map((_, i) => {
                    const p = getPoint(i, 99);
                    return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
                })}

                {/* Value polygon */}
                <motion.polygon
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, points: polygon }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    points={polygon}
                    fill="rgba(16,185,129,0.15)"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {displayValues.map((v, i) => {
                    const p = getPoint(i, v);
                    return <circle key={i} cx={p.x} cy={p.y} r="4" fill={ATTRS[i].color} stroke="#0a0a0a" strokeWidth="2" />;
                })}

                {/* Labels */}
                {ATTRS.map((a, i) => {
                    const p = getLabelPos(i);
                    return (
                        <g key={a.key}>
                            <text
                                x={p.x}
                                y={p.y - 6}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-zinc-400 text-[9px] font-bold"
                                style={{ fontFamily: 'system-ui' }}
                            >
                                {a.label}
                            </text>
                            <text
                                x={p.x}
                                y={p.y + 7}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-white text-[11px] font-black"
                                style={{ fontFamily: 'system-ui' }}
                            >
                                {displayValues[i]}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Rating UI */}
            {session && !isOwnProfile && (
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
                                        className="flex-1 h-1.5 accent-emerald-500 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-white w-6 text-right">{editValues[i]}</span>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg"
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
