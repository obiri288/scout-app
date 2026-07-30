import React from 'react';

/**
 * EcosystemBadge — Visuelles Tag für Herren/Damen Zugehörigkeit.
 * 
 * Dezentes, elegantes Badge das perfekt zum Dark-Theme passt.
 * Wird nicht gerendert wenn ecosystem 'all', null oder undefined ist.
 * 
 * @param {'mens'|'womens'|'all'} ecosystem - Das Ecosystem des Profils
 * @param {'sm'|'md'} size - Badge-Größe (default: 'sm')
 * @param {string} className - Zusätzliche CSS-Klassen
 */
export const EcosystemBadge = ({ ecosystem, size = 'sm', className = '' }) => {
    if (!ecosystem || ecosystem === 'all') return null;

    const isMens = ecosystem === 'mens';

    const label = isMens ? 'HERREN' : 'DAMEN';

    const colorClasses = isMens
        ? 'bg-blue-500/12 border-blue-500/25 text-blue-400'
        : 'bg-violet-500/12 border-violet-500/25 text-violet-400';

    const sizeClasses = size === 'md'
        ? 'px-2.5 py-1 text-[10px] tracking-[0.12em]'
        : 'px-2 py-0.5 text-[9px] tracking-[0.15em]';

    return (
        <span
            className={`
                inline-flex items-center gap-1
                ${colorClasses}
                ${sizeClasses}
                font-black uppercase
                border rounded-md
                backdrop-blur-sm
                select-none shrink-0
                transition-colors duration-200
                ${className}
            `.trim()}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isMens ? 'bg-blue-400' : 'bg-violet-400'}`} />
            {label}
        </span>
    );
};

export default EcosystemBadge;
