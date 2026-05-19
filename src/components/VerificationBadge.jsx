import React from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Cavio Trust Protocol — 3-Tier Verification Badge
 * 
 * Renders a tier-appropriate verification badge:
 * - blue_athlete:   Blue BadgeCheck with blue glow (Peer Verified)
 * - gold_official:  Gold BadgeCheck with amber glow (Domain/Official)
 * - neon_endorsed:  Cyan ShieldCheck with pulse animation + neon glow (Scout Endorsed)
 * 
 * @param {number} size - Icon size (default: 16)
 * @param {string} className - Additional CSS classes
 * @param {string} status - verification_status from players_master
 * @param {string} role - LEGACY: still accepted for backward compatibility
 */
export const VerificationBadge = ({ size = 16, className = '', status, role, verificationStatus, isOfficial }) => {
    // isOfficial prop takes precedence for official platform accounts
    if (isOfficial) {
        const badgeSize = size + 4;
        return (
            <motion.div
                whileHover={{ scale: 1.25, rotate: 8 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 450, damping: 12 }}
                className="inline-flex shrink-0 cursor-pointer relative"
            >
                {/* Glowing dual-tone cyan & gold brand ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 to-amber-400 opacity-70 blur-[3px] animate-pulse" />
                <div 
                    className="relative rounded-full bg-slate-950 border border-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    style={{ width: badgeSize, height: badgeSize, padding: '2px' }}
                >
                    <img 
                        src="/cavio-icon.png" 
                        className="w-full h-full object-contain brightness-125" 
                        alt="CAVIO Official"
                        title="Offizieller CAVIO Account"
                    />
                </div>
            </motion.div>
        );
    }

    // Role-based verification gate: only 'approved' users may show a badge
    // verificationStatus prop = the role approval status (pending/approved/rejected)
    // status prop = the visual badge tier (blue_athlete/gold_official/neon_endorsed)
    if (verificationStatus && verificationStatus !== 'approved') return null;

    // Backward compatibility: if no status prop, derive from old is_verified/role pattern
    const resolvedStatus = status || (role ? 'gold_official' : null);

    if (!resolvedStatus || resolvedStatus === 'unverified') return null;

    const tiers = {
        blue_athlete: {
            icon: BadgeCheck,
            color: 'text-blue-500',
            glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]',
            label: 'Peer-Verifiziert',
            animate: '',
        },
        gold_official: {
            icon: BadgeCheck,
            color: 'text-amber-400',
            glow: 'drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]',
            label: 'Offiziell Verifiziert',
            animate: '',
        },
        neon_endorsed: {
            icon: ShieldCheck,
            color: 'text-cyan-400',
            glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]',
            label: 'Scout-Endorsed',
            animate: 'animate-pulse',
        },
    };

    const tier = tiers[resolvedStatus] || tiers.gold_official;
    const Icon = tier.icon;

    return (
        <Icon
            size={size}
            className={`${tier.color} ${tier.glow} ${tier.animate} shrink-0 ${className}`}
            aria-label={tier.label}
            title={tier.label}
        />
    );
};
