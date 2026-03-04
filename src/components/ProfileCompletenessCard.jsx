import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Camera, FileText, MapPin, User, Dumbbell, Instagram, Video as VideoIcon } from 'lucide-react';

/**
 * Gamified profile completeness card.
 * Shows animated progress bar + missing fields with CTAs.
 */

const FIELDS = [
    { key: 'full_name', label: 'Name', icon: User, weight: 15 },
    { key: 'avatar_url', label: 'Profilbild', icon: Camera, weight: 20 },
    { key: 'position_primary', label: 'Position', icon: Dumbbell, weight: 10 },
    { key: 'birth_date', label: 'Geburtsdatum', icon: FileText, weight: 5 },
    { key: 'height_user', label: 'Größe', icon: Dumbbell, weight: 5 },
    { key: 'strong_foot', label: 'Starker Fuß', icon: Dumbbell, weight: 5, skip: (v) => v === 'Rechts' }, // default value
    { key: 'club_id', label: 'Verein', icon: MapPin, weight: 10 },
    { key: 'bio', label: 'Bio', icon: FileText, weight: 10 },
    { key: 'social', label: 'Social Media', icon: Instagram, weight: 5, custom: true },
    { key: 'city', label: 'Stadt', icon: MapPin, weight: 5 },
    { key: 'nationality', label: 'Nationalität', icon: MapPin, weight: 5 },
    { key: 'highlights', label: 'Highlight-Video', icon: VideoIcon, weight: 5, custom: true },
];

const getMotivation = (score) => {
    if (score >= 100) return { text: 'Perfekt! 🏆', color: 'text-emerald-400' };
    if (score >= 80) return { text: 'Fast da! 🔥', color: 'text-amber-400' };
    if (score >= 50) return { text: 'Guter Start! 💪', color: 'text-blue-400' };
    return { text: 'Leg los! 🚀', color: 'text-purple-400' };
};

export const ProfileCompletenessCard = ({ player, highlightsCount = 0, onEditProfile }) => {
    const { score, missing } = useMemo(() => {
        let total = 0;
        const missingFields = [];

        for (const field of FIELDS) {
            if (field.custom) {
                if (field.key === 'social') {
                    const hasSocial = player.instagram_handle || player.tiktok_handle || player.youtube_handle;
                    if (hasSocial) {
                        total += field.weight;
                    } else {
                        missingFields.push(field);
                    }
                } else if (field.key === 'highlights') {
                    if (highlightsCount > 0) {
                        total += field.weight;
                    } else {
                        missingFields.push(field);
                    }
                }
            } else {
                const value = player[field.key];
                const isFilled = value !== null && value !== undefined && value !== '';
                if (field.skip && field.skip(value)) {
                    // Skip default values (not intentionally set)
                    missingFields.push(field);
                } else if (isFilled) {
                    total += field.weight;
                } else {
                    missingFields.push(field);
                }
            }
        }

        return { score: Math.min(100, total), missing: missingFields };
    }, [player, highlightsCount]);

    if (score >= 100) return null; // Fully complete — no need to show

    const motivation = getMotivation(score);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mx-4 mt-4"
        >
            <div className="bg-white/5 border border-border rounded-2xl p-4 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${motivation.color}`}>{motivation.text}</span>
                    </div>
                    <span className="text-2xl font-black text-foreground">{score}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-black/40 rounded-full overflow-hidden mb-4">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                            score >= 50 ? 'bg-gradient-to-r from-blue-500 to-emerald-400' :
                                'bg-gradient-to-r from-purple-500 to-blue-400'
                            }`}
                    />
                </div>

                {/* Missing fields */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {missing.slice(0, 5).map((field) => {
                        const Icon = field.icon;
                        return (
                            <span key={field.key} className="flex items-center gap-1 bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
                                <Icon size={10} /> {field.label}
                            </span>
                        );
                    })}
                    {missing.length > 5 && (
                        <span className="text-[10px] text-muted-foreground font-bold px-2 py-1">+{missing.length - 5} mehr</span>
                    )}
                </div>

                {/* CTA */}
                <button
                    onClick={onEditProfile}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-foreground font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle size={14} className="text-emerald-400" /> Profil vervollständigen
                </button>
            </div>
        </motion.div>
    );
};
