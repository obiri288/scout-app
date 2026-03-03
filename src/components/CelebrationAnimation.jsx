import React, { useEffect, useState } from 'react';

/**
 * Particle burst celebration animation.
 * Renders colored particles that burst outward and fade. 
 * Auto-dismisses after animation.
 */
export const CelebrationAnimation = ({ active, onComplete }) => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!active) return;

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: 50 + (Math.random() - 0.5) * 10,
            y: 50 + (Math.random() - 0.5) * 10,
            dx: (Math.random() - 0.5) * 200,
            dy: (Math.random() - 0.5) * 200 - 50,
            size: 4 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            delay: Math.random() * 0.2,
        }));
        setParticles(newParticles);

        const timer = setTimeout(() => {
            setParticles([]);
            onComplete?.();
        }, 1200);

        return () => clearTimeout(timer);
    }, [active]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-sm"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        transform: `rotate(${p.rotation}deg)`,
                        animation: `celebrate-burst 1s ease-out ${p.delay}s forwards`,
                        '--dx': `${p.dx}px`,
                        '--dy': `${p.dy}px`,
                    }}
                />
            ))}
            <style>{`
                @keyframes celebrate-burst {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(720deg) scale(0.2); }
                }
            `}</style>
        </div>
    );
};
