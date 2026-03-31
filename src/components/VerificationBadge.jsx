import React from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';

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
export const VerificationBadge = ({ size = 16, className = '', status, role }) => {
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
