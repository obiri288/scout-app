import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';

const DEACTIVATION_REASONS = [
    'Benötige eine Pause',
    'Privatsphäre-Bedenken',
    'Zu viele Benachrichtigungen',
    'Habe einen anderen Account erstellt',
    'Zu zeitaufwendig / lenkt ab',
    'Anderer Grund'
];

export const DeactivateAccountModal = ({ onClose, user, onDeactivated }) => {
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { addToast } = useToast();

    const handleDeactivate = async (e) => {
        e.preventDefault();
        if (!reason) return setError('Bitte gib einen Grund an.');
        if (!password) return setError('Bitte gib dein Passwort zur Bestätigung ein.');

        setLoading(true);
        setError(null);

        try {
            // 1. Password verification
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (authError) {
                // Check specifically for invalid credentials
                if (authError.status === 400) throw new Error('Das eingegebene Passwort ist falsch.');
                throw authError;
            }

            // 2. Set is_deactivated = true in players_master
            const { error: dbError } = await supabase
                .from('players_master')
                .update({ is_deactivated: true })
                .eq('id', user.id);

            if (dbError) throw dbError;

            addToast('Dein Account wurde vorübergehend deaktiviert.', 'info');
            
            // 3. Complete deactivation (logout and redirect)
            onDeactivated();
        } catch (err) {
            console.error('Deactivation error:', err);
            setError(err.message || 'Fehler bei der Deaktivierung.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={!loading ? onClose : undefined}></div>
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[90vh] flex flex-col shadow-2xl border border-border overflow-hidden"
            >
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <RefreshCw size={18} className="text-blue-500" /> Konto deaktivieren
                    </h2>
                    <button onClick={onClose} disabled={loading} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col items-center text-center gap-4 mb-2">
                            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                                <Lock size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Bist du sicher?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                                    Dein Profil, deine Fotos, Kommentare und Likes werden ausgeblendet, bis du dein Konto durch ein erneutes Login wieder aktivierst.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleDeactivate} className="space-y-5">
                            {/* Reason Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Warum deaktivierst du dein Konto?
                                </label>
                                <div className="relative">
                                    <select 
                                        value={reason} 
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-blue-500 transition-colors appearance-none pr-10 text-sm"
                                        required
                                    >
                                        <option value="" disabled>Wähle einen Grund...</option>
                                        {DEACTIVATION_REASONS.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Password Confirmation */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                    Um fortzufahren, gib dein Passwort ein
                                </label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Dein Passwort"
                                    className="w-full bg-slate-100 dark:bg-black/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-blue-500 transition-colors text-sm"
                                    required 
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={loading || !reason || !password}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/30 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> Deaktiviere...</> : 'Mein Konto deaktivieren'}
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="w-full mt-3 text-sm text-muted-foreground font-medium hover:text-foreground transition py-2"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mt-4">
                        <p className="text-[11px] text-amber-500/80 leading-normal italic">
                            Hinweis: Deine Daten werden sicher gespeichert und sind sofort wieder sichtbar, sobald du dich das nächste Mal anmeldest.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
