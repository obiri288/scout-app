import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2 } from 'lucide-react';
import { cardStyle } from '../lib/styles';
import { calculateAge } from '../lib/helpers';

/**
 * FIFA-Style Player Card — Canvas-rendered shareable image.
 */
export const PlayerCard = ({ player, avgRating, onClose }) => {
    const canvasRef = useRef(null);
    const [imageReady, setImageReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = 400;
        const H = 560;
        canvas.width = W;
        canvas.height = H;

        const primary = player.clubs?.color_primary || '#10b981';
        const secondary = player.clubs?.color_secondary || '#ffffff';
        const rating = Math.round(avgRating || 0);

        // Draw card
        const draw = (avatarImg) => {
            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, primary);
            grad.addColorStop(0.6, shadeColor(primary, -40));
            grad.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = grad;
            roundRect(ctx, 0, 0, W, H, 24);
            ctx.fill();

            // Subtle pattern overlay
            ctx.globalAlpha = 0.05;
            for (let i = 0; i < H; i += 20) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, i, W, 1);
            }
            ctx.globalAlpha = 1;

            // Inner border
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            roundRect(ctx, 12, 12, W - 24, H - 24, 18);
            ctx.stroke();

            // Rating - big number top left
            ctx.fillStyle = secondary;
            ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(rating || '-', 32, 88);

            // Position under rating
            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(player.position_primary || 'ST', 36, 115);

            // Avatar circle
            const avatarX = W / 2;
            const avatarY = 200;
            const avatarR = 80;

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            if (avatarImg) {
                ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
            }
            ctx.restore();

            // Avatar border ring
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
            ctx.stroke();

            // Name
            ctx.fillStyle = secondary;
            ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            const name = (player.full_name || 'Spieler').toUpperCase();
            ctx.fillText(name, W / 2, 320);

            // Club name
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(player.clubs?.name || 'Vereinslos', W / 2, 348);

            // Divider line
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 370);
            ctx.lineTo(W - 40, 370);
            ctx.stroke();

            // Stats row
            const stats = [
                { label: 'ALTER', value: player.birth_date ? calculateAge(player.birth_date) : '-' },
                { label: 'GRÖßE', value: player.height_user ? `${player.height_user}` : '-' },
                { label: 'FUß', value: (player.strong_foot || 'R')[0] },
            ];

            const statW = (W - 80) / stats.length;
            stats.forEach((s, i) => {
                const x = 40 + statW * i + statW / 2;
                ctx.fillStyle = secondary;
                ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(String(s.value), x, 420);

                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(s.label, x, 440);
            });

            // Branding
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PROBASE', W / 2, H - 24);

            // Nationality flag text  
            if (player.nationality) {
                ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.textAlign = 'right';
                ctx.fillText(player.nationality, W - 32, 88);
            }

            setImageReady(true);
        };

        // Load avatar
        if (player.avatar_url) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => draw(img);
            img.onerror = () => draw(null);
            img.src = player.avatar_url;
        } else {
            draw(null);
        }
    }, [player, avgRating]);

    const handleShare = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `${player.full_name || 'player'}-card.png`, { type: 'image/png' });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `${player.full_name} – ProBase Card`,
                        files: [file],
                    });
                } catch (_) { /* cancelled */ }
            } else {
                handleDownload();
            }
        }, 'image/png');
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${player.full_name || 'player'}-card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="flex flex-col items-center gap-4"
            >
                <canvas
                    ref={canvasRef}
                    className="rounded-3xl shadow-2xl shadow-black/60"
                    style={{ width: 300, height: 420 }}
                />
                {imageReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex gap-3"
                    >
                        <button onClick={handleShare} className="flex items-center gap-2 bg-amber-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg border border-amber-400/20">
                            <Share2 size={16} /> Teilen
                        </button>
                        <button onClick={handleDownload} className="flex items-center gap-2 bg-white/10 text-white font-bold text-sm px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/20 transition">
                            <Download size={16} /> Download
                        </button>
                    </motion.div>
                )}
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition mt-2">
                    <X size={24} />
                </button>
            </motion.div>
        </div>
    );
};

// Helpers
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
