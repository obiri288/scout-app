import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { inputStyle } from '../lib/styles';

export const NamePromptModal = () => {
    const { currentUserProfile, refreshProfile } = useUser();
    const { addToast } = useToast();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();

        if (!trimmedFirst || !trimmedLast) {
            addToast('Bitte gib Vor- und Nachname ein.', 'error');
            return;
        }

        setLoading(true);
        try {
            const fullName = `${trimmedFirst} ${trimmedLast}`;
            const { error } = await supabase
                .from('players_master')
                .update({ full_name: fullName })
                .eq('id', currentUserProfile.id);

            if (error) throw error;

            addToast(`Willkommen, ${trimmedFirst}! 🎉`, 'success');
            await refreshProfile();
        } catch (err) {
            console.error('Name update error:', err);
            addToast('Fehler beim Speichern. Versuche es erneut.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                {/* Icon */}
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-cyan-500/10 rounded-2xl mb-4">
                        <User className="text-cyan-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white text-center mb-2">
                        Wie heißt du auf dem Platz?
                    </h2>
                    <p className="text-zinc-400 text-sm text-center max-w-xs">
                        Zeig Scouts und Mitspielern, wer du bist. Dein echter Name schafft Vertrauen.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Vorname *</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={inputStyle}
                            autoFocus
                            placeholder="Max"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Nachname *</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={inputStyle}
                            placeholder="Mustermann"
                            required
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading || !firstName.trim() || !lastName.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-600/30 disabled:text-cyan-300/50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <><Loader2 size={18} className="animate-spin" /> Wird gespeichert...</>
                        ) : (
                            <><Sparkles size={18} /> Los geht's!</>
                        )}
                    </motion.button>
                </form>

                <p className="text-zinc-600 text-[10px] text-center mt-6">
                    Dein Name wird öffentlich auf deinem Profil angezeigt.
                </p>
            </motion.div>
        </div>
    );
};
