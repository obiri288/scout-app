import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Crown, Shield, Navigation } from 'lucide-react';
import { calculateProReadinessScore } from '../lib/helpers';
import { RadarChart } from './RadarChart'; // We will build the recharts version
import { calculateAge } from '../lib/helpers';

/**
 * The VIP Elite Player Card for sharing.
 * DOM-based, no Canvas. Uses Web Share API.
 */
export const ElitePlayerCard = ({ player, avgRating, onClose, highlights }) => {
    // Score
    const { score } = useMemo(() => calculateProReadinessScore(player, highlights), [player, highlights]);

    const handleShare = async () => {
        // Construct a URL to the profile
        const profileUrl = window.location.origin + `/profile/${player.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${player.full_name} – ProBase Elite Card`,
                    text: `Sieh dir das Profil von ${player.full_name} auf ProBase an. Pro-Readiness: ${score}%.`,
                    url: profileUrl,
                });
            } catch (err) {
                console.warn('Share cancelled or failed', err);
            }
        } else {
            // Fallback for desktop: copy to clipboard
            navigator.clipboard.writeText(profileUrl);
            alert('Profil-Link kopiert!');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[340px] flex flex-col items-center gap-6"
            >
                {/* The Card */}
                <div className="relative w-full bg-zinc-950 border border-amber-400/30 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.15)] group">
                    {/* Background subtle effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-zinc-900/50 to-zinc-950 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

                    {/* Top Bar: Nationality & Position */}
                    <div className="w-full flex justify-between px-6 pt-5 pb-2 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                {score}
                            </span>
                            <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest leading-none mt-1">
                                Readiness
                            </span>
                        </div>
                        <div className="flex flex-col items-end pt-1">
                            <span className="text-xl font-black text-white">{player.position_primary || 'ST'}</span>
                            {player.nationality && (
                                <span className="text-xs text-white/50 font-bold uppercase mt-1">
                                    {player.nationality}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center -mt-2 relative z-10">
                        <div className="relative w-32 h-32 rounded-full border-2 border-amber-400/50 p-1 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                                {player.avatar_url ? (
                                    <img src={player.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-zinc-600" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name & Club */}
                    <div className="text-center mt-3 relative z-10">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase px-4 truncate">
                            {player.full_name}
                        </h2>
                        <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-zinc-400 font-medium">
                            {player.clubs?.is_icon_league && <Crown size={12} className="text-amber-400" />}
                            <span>{player.clubs?.name || 'Vereinslos'}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full px-8 mt-4 relative z-10">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                    </div>

                    {/* Bottom Split: Archetype & Radar */}
                    <div className="flex px-6 py-5 relative z-10 min-h-[140px]">
                        {/* Status/Archetype block */}
                        <div className="w-1/2 flex flex-col justify-center space-y-4">
                            <div>
                                <h4 className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Spielertyp</h4>
                                <div className="text-cyan-400 font-bold text-sm bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20 inline-block">
                                    {player.player_archetype || 'Universell'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 font-bold">
                                <div>
                                    <div className="text-[9px] text-zinc-500 mb-0.5">ALTER</div>
                                    <div>{player.birth_date ? calculateAge(player.birth_date) : '-'}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-zinc-500 mb-0.5">FUß</div>
                                    <div>{player.strong_foot?.[0] || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Radar Chart (Scaled down) */}
                        <div className="w-1/2 flex items-center justify-center border-l border-white/5 pl-4 -my-2 opacity-90">
                            <div className="transform scale-[0.65] origin-center -ml-8 -mt-6">
                                {/* Wir übergeben compact=true, damit das Radar keine UI zum bewerten zeigt */}
                                <RadarChart playerId={player.id} isOwnProfile={true} compact={true} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Share Action */}
                <div className="w-full space-y-3">
                    <button
                        onClick={handleShare}
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-400 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
                    >
                        <Share2 size={20} /> Profil Teilen
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-white/10 text-zinc-300 font-bold py-3.5 rounded-2xl hover:bg-white/20 transition-all active:scale-95 outline-none"
                    >
                        Schließen
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
