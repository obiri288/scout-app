import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { inputStyle } from '../lib/styles';
import { isUsernameBlocked, validateUsernameFormat } from '../lib/restrictedUsernames';

export const NamePromptModal = () => {
    const { currentUserProfile, refreshProfile } = useUser();
    const { addToast } = useToast();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [birthDate, setBirthDate] = useState('');

    // Age Gate: calculate age and validate >= 16
    const ageInfo = useMemo(() => {
        if (!birthDate) return { age: null, isUnder16: false };
        const today = new Date();
        const dob = new Date(birthDate);
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return { age, isUnder16: age < 16 };
    }, [birthDate]);

    // Username validation
    const [usernameStatus, setUsernameStatus] = useState('idle');
    const [usernameError, setUsernameError] = useState('');
    const debounceRef = useRef(null);

    // Pre-fill from existing profile or user_metadata
    useEffect(() => {
        if (currentUserProfile?.username) {
            setUsername(currentUserProfile.username);
        }
    }, [currentUserProfile]);

    const checkUsername = useCallback(async (value) => {
        const lower = value.toLowerCase().trim();
        const formatResult = validateUsernameFormat(lower);
        if (!formatResult.valid) {
            setUsernameStatus('invalid');
            setUsernameError(formatResult.reason);
            return;
        }
        const blockResult = isUsernameBlocked(lower);
        if (blockResult.blocked) {
            setUsernameStatus('blocked');
            setUsernameError(blockResult.reason);
            return;
        }
        setUsernameStatus('checking');
        setUsernameError('');
        try {
            const { data, error } = await supabase.rpc('check_username_available', { p_username: lower });
            if (error) throw error;
            setUsernameStatus(data ? 'available' : 'taken');
            setUsernameError(data ? '' : 'Dieser Username ist bereits vergeben.');
        } catch (err) {
            setUsernameStatus('invalid');
            setUsernameError('Prüfung fehlgeschlagen.');
        }
    }, []);

    useEffect(() => {
        if (!username) { setUsernameStatus('idle'); setUsernameError(''); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => checkUsername(username), 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [username, checkUsername]);

    const UsernameIndicator = () => {
        if (usernameStatus === 'idle') return null;
        if (usernameStatus === 'checking') return <Loader2 className="animate-spin text-cyan-400" size={16} />;
        if (usernameStatus === 'available') return <Check className="text-emerald-400" size={16} />;
        return <X className="text-rose-500" size={16} />;
    };

    // Check if user already has a username — if so, don't require it
    const hasExistingUsername = !!currentUserProfile?.username;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();

        if (!trimmedFirst || !trimmedLast) {
            addToast('Bitte gib Vor- und Nachname ein.', 'error');
            return;
        }

        if (!birthDate) {
            addToast('Bitte gib dein Geburtsdatum ein.', 'error');
            return;
        }

        if (ageInfo.isUnder16) {
            addToast('Du musst mindestens 16 Jahre alt sein.', 'error');
            return;
        }

        if (!hasExistingUsername && (!username.trim() || usernameStatus !== 'available')) {
            addToast('Bitte wähle einen verfügbaren Username.', 'error');
            return;
        }

        setLoading(true);
        try {
            const fullName = `${trimmedFirst} ${trimmedLast}`;
            const updateData = { full_name: fullName };
            if (!hasExistingUsername && username.trim()) {
                updateData.username = username.toLowerCase().trim();
            }
            if (birthDate) {
                updateData.birth_date = birthDate;
            }

            const { error } = await supabase
                .from('players_master')
                .update(updateData)
                .eq('id', currentUserProfile.id);

            if (error) throw error;

            addToast(`Willkommen, ${trimmedFirst}! 🎉`, 'success');
            await refreshProfile();
        } catch (err) {
            console.error('Name update error:', err);
            if (err.message?.includes('username') || err.code === '23505') {
                addToast('Dieser Username ist bereits vergeben.', 'error');
            } else {
                addToast('Fehler beim Speichern. Versuche es erneut.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = firstName.trim() && lastName.trim() && birthDate && !ageInfo.isUnder16 && (hasExistingUsername || usernameStatus === 'available');

    return (
        <div className="fixed inset-0 z-[10001] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                {/* Icon */}
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-cyan-500/10 rounded-2xl mb-4">
                        <User className="text-cyan-600 dark:text-cyan-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-foreground text-center mb-2">
                        Wie heißt du auf dem Platz?
                    </h2>
                    <p className="text-muted-foreground text-sm text-center max-w-xs">
                        Zeig Scouts und Mitspielern, wer du bist. Dein echter Name schafft Vertrauen.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Vorname *</label>
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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Nachname *</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={inputStyle}
                            placeholder="Mustermann"
                            required
                        />
                    </div>

                    {/* Username mit @-Prefix — nur wenn noch kein Username gesetzt */}
                    {!hasExistingUsername && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Cavio-Username *</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-cyan-500 font-bold text-base select-none pointer-events-none z-10">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    maxLength={20}
                                    className={`${inputStyle} pl-8 pr-10 ${
                                        usernameStatus === 'available' ? '!border-emerald-500/50 focus:!border-emerald-500' :
                                        (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'blocked') ? '!border-rose-500/50 focus:!border-rose-500' : ''
                                    }`}
                                    placeholder="dein_username"
                                    autoComplete="username"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <UsernameIndicator />
                                </div>
                            </div>
                            {usernameError && (
                                <p className="text-rose-500 text-xs mt-1 ml-1 font-medium flex items-center gap-1">
                                    <X size={12} /> {usernameError}
                                </p>
                            )}
                            {usernameStatus === 'available' && (
                                <p className="text-emerald-400 text-xs mt-1 ml-1 font-medium flex items-center gap-1">
                                    <Check size={12} /> Username ist verfügbar!
                                </p>
                            )}
                            {usernameStatus === 'idle' && username === '' && (
                                <p className="text-muted-foreground text-xs mt-1 ml-1">
                                    Nur Kleinbuchstaben, Zahlen und _ (3–20 Zeichen)
                                </p>
                            )}
                        </div>
                    )}

                    {/* Geburtsdatum mit Age Gate */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Geburtsdatum *</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={`${inputStyle} ${ageInfo.isUnder16 ? '!border-rose-500/50 focus:!border-rose-500' : birthDate && !ageInfo.isUnder16 ? '!border-emerald-500/50' : ''}`}
                        />
                        {ageInfo.isUnder16 && (
                            <div className="flex items-start gap-2 mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                <ShieldAlert size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                                <p className="text-rose-500 text-xs font-medium leading-relaxed">
                                    Du musst mindestens 16 Jahre alt sein, um Cavio zu nutzen. Für jüngere Spieler folgt in Zukunft ein Managed-Account-System.
                                </p>
                            </div>
                        )}
                        {birthDate && !ageInfo.isUnder16 && (
                            <p className="text-emerald-400 text-xs mt-1 ml-1 font-medium flex items-center gap-1">
                                <Check size={12} /> Alter: {ageInfo.age} Jahre ✓
                            </p>
                        )}
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading || !isFormValid}
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

                <p className="text-muted-foreground text-[10px] text-center mt-6">
                    Dein Name und Username werden öffentlich auf deinem Profil angezeigt.
                </p>
            </motion.div>
        </div>
    );
};
