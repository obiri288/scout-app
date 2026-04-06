import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, LogOut, ShieldAlert, RefreshCw, UserCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { btnPrimary } from '../lib/styles';

/**
 * PendingVerificationScreen — Shown to non-player users whose verification_status
 * is 'pending' or 'rejected'. Blocks access to the main app.
 *
 * If rejected, offers an option to switch back to "Spieler" role (auto-approved).
 */
export const PendingVerificationScreen = ({ profile, onLogout, onRoleChanged }) => {
    const isRejected = profile?.verification_status === 'rejected';
    const [switching, setSwitching] = useState(false);
    const { addToast } = useToast();

    const handleSwitchToPlayer = async () => {
        setSwitching(true);
        try {
            const { error } = await supabase.from('players_master')
                .update({ role: 'player', verification_status: 'approved' })
                .eq('id', profile.id);
            if (error) throw error;
            addToast('Rolle geändert! Du bist jetzt als Spieler registriert.', 'success');
            onRoleChanged?.();
        } catch (e) {
            console.error('Role switch error:', e);
            addToast(e.message || 'Fehler beim Rollenwechsel.', 'error');
        } finally {
            setSwitching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-background flex flex-col items-center justify-center px-6">
            {/* Background gradient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/5 to-indigo-500/5 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative w-full max-w-md text-center space-y-8"
            >
                {/* Logo */}
                <div className="flex justify-center">
                    <img
                        src="/cavio-icon.png"
                        alt="Cavio"
                        className="h-16 w-16 object-contain mix-blend-screen drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    />
                </div>

                {/* Icon */}
                <motion.div
                    animate={isRejected ? {} : { rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center ${
                        isRejected
                            ? 'bg-rose-500/10 border border-rose-500/20'
                            : 'bg-amber-500/10 border border-amber-500/20'
                    }`}
                >
                    {isRejected
                        ? <ShieldAlert size={36} className="text-rose-400" />
                        : <Clock size={36} className="text-amber-400" />
                    }
                </motion.div>

                {/* Text */}
                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-foreground">
                        {isRejected ? 'Verifizierung abgelehnt' : 'Verifizierung ausstehend'}
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                        {isRejected
                            ? 'Dein Account als ' + (profile?.role === 'scout' ? 'Scout' : 'Trainer') + ' wurde leider abgelehnt. Du kannst dich stattdessen als Spieler registrieren.'
                            : 'Dein Profil als ' + (profile?.role === 'scout' ? 'Scout' : 'Trainer') + ' wird aktuell von unserem Team geprüft. Bitte habe etwas Geduld – dies kann bis zu 48 Stunden dauern.'
                        }
                    </p>
                </div>

                {/* Role Info Card */}
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 text-left">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        profile?.role === 'scout' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                    }`}>
                        {profile?.role === 'scout' ? '🔍' : '🎯'}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-foreground text-sm">{profile?.full_name || 'Dein Profil'}</p>
                        <p className="text-muted-foreground text-xs">
                            Gewünschte Rolle: <span className="font-bold text-foreground">{profile?.role === 'scout' ? 'Scout' : 'Trainer'}</span>
                        </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        isRejected
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                        {isRejected ? 'Abgelehnt' : 'In Prüfung'}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {isRejected && (
                        <button
                            onClick={handleSwitchToPlayer}
                            disabled={switching}
                            className={`${btnPrimary} w-full flex items-center justify-center gap-2`}
                        >
                            {switching
                                ? <><Loader2 size={18} className="animate-spin" /> Wird geändert...</>
                                : <><UserCircle size={18} /> Als Spieler weiter</>
                            }
                        </button>
                    )}

                    {!isRejected && (
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-white/5 hover:bg-white/10 border border-border text-foreground font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                        >
                            <RefreshCw size={16} /> Status erneut prüfen
                        </button>
                    )}

                    <button
                        onClick={onLogout}
                        className="w-full text-muted-foreground hover:text-foreground text-sm py-3 rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} /> Abmelden
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
