import React from 'react';
import { BadgeCheck } from 'lucide-react';

/**
 * ProBase Elite Verification Badge
 * 
 * Renders a Neon Gold BadgeCheck icon for verified users (scouts, agents, players).
 * Uses ProBase CI: amber-400 with gold drop-shadow glow.
 * 
 * @param {number} size - Icon size (default: 16)
 * @param {string} className - Additional CSS classes
 * @param {string} role - User role for tooltip ('scout', 'agent', 'player')
 */
export const VerificationBadge = ({ size = 16, className = '', role }) => {
    const roleLabels = {
        scout: 'Verifizierter Scout',
        agent: 'Verifizierter Agent',
        player: 'Verifizierter Spieler',
    };

    const label = roleLabels[role] || 'Verifiziert';

    return (
        <BadgeCheck
            size={size}
            className={`text-amber-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] shrink-0 ${className}`}
            aria-label={label}
            title={label}
        />
    );
};
