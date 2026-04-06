import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, Video, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Target, Upload, X, AtSign, ShieldAlert, Search, Crosshair } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { inputStyle } from '../lib/styles';
import { isUsernameBlocked, validateUsernameFormat } from '../lib/restrictedUsernames';
import { calculateAgeInfo, AGE_ERROR_MESSAGE } from '../lib/ageValidation';

const POSITIONS = ['Torwart', 'Innenverteidiger', 'Außenverteidiger', 'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld', 'Linksaußen', 'Rechtsaußen', 'Mittelstürmer'];

const ROLE_OPTIONS = [
    {
        value: 'player',
        label: 'Spieler',
        emoji: '⚽',
        description: 'Zeig dein Talent und werde entdeckt.',
        color: 'from-cyan-500 to-blue-600',
        border: 'border-cyan-500/40',
        bg: 'bg-cyan-500/10',
    },
    {
        value: 'scout',
        label: 'Scout',
        emoji: '🔍',
        description: 'Entdecke die nächste Generation.',
        color: 'from-amber-500 to-orange-600',
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
    },
    {
        value: 'coach',
        label: 'Trainer',
        emoji: '🎯',
        description: 'Finde Spieler für dein Team.',
        color: 'from-emerald-500 to-green-600',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
    },
];

const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const TOTAL_STEPS = 4;

export const OnboardingWizard = ({ session, onComplete }) => {
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Step 0: Role selection
    const [selectedRole, setSelectedRole] = useState('player');

    // Step 1 data
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [position, setPosition] = useState('');
    const [birthDate, setBirthDate] = useState('');

    // Age Gate: calculate age and validate >= 16
    const ageInfo = useMemo(() => calculateAgeInfo(birthDate), [birthDate]);

    // Username validation state
    const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'blocked'
    const [usernameError, setUsernameError] = useState('');
    const debounceRef = useRef(null);

    // Step 2 data (avatar)
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Pre-fill username from user_metadata (if set during registration)
    useEffect(() => {
        const metaUsername = session?.user?.user_metadata?.username;
        if (metaUsername) {
            setUsername(metaUsername);
        }
    }, [session]);

    // Live-Validierung: Username (Debounce 500ms)
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
            if (data) {
                setUsernameStatus('available');
                setUsernameError('');
            } else {
                setUsernameStatus('taken');
                setUsernameError('Dieser Username ist bereits vergeben.');
            }
        } catch (err) {
            console.error('Username check error:', err);
            setUsernameStatus('invalid');
            setUsernameError('Prüfung fehlgeschlagen.');
        }
    }, []);

    useEffect(() => {
        if (!username) {
            setUsernameStatus('idle');
            setUsernameError('');
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            checkUsername(username);
        }, 500);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [username, checkUsername]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const goNext = () => { setDir(1); setStep(s => s + 1); };
    const goBack = () => { setDir(-1); setStep(s => s - 1); };

    // Step 1 validation: name, username, position (only required for players)
    const isStep1Valid = selectedRole === 'player'
        ? fullName.trim() && position && username.trim() && usernameStatus === 'available' && birthDate && !ageInfo.isUnder16
        : fullName.trim() && username.trim() && usernameStatus === 'available';

    const handleFinish = async (skipVideo = true) => {
        if (!fullName.trim()) {
            addToast('Bitte fülle deinen Namen aus.', 'error');
            setDir(-1);
            setStep(1);
            return;
        }

        if (!username.trim() || usernameStatus !== 'available') {
            addToast('Bitte wähle einen gültigen, verfügbaren Username.', 'error');
            setDir(-1);
            setStep(1);
            return;
        }

        setLoading(true);
        try {
            // 1. Create or update player profile
            const isPlayer = selectedRole === 'player';
            const profileData = {
                user_id: session.user.id,
                full_name: fullName.trim(),
                username: username.toLowerCase().trim(),
                position_primary: isPlayer ? position : null,
                birth_date: isPlayer ? (birthDate || null) : null,
                transfer_status: isPlayer ? 'Suche Verein' : null,
                role: selectedRole,
                verification_status: isPlayer ? 'approved' : 'pending',
                email: session.user.email || null,
            };

            // Check if player already exists
            let player;
            try {
                player = await api.fetchPlayerByUserId(session.user.id);
            } catch (_) {
                player = null;
            }

            if (player) {
                player = await api.updatePlayer(player.id, profileData);
            } else {
                const { data, error } = await supabase.from('players_master')
                    .insert(profileData)
                    .select('*, clubs(*, leagues(name))')
                    .single();
                if (error) throw error;
                player = data;
            }

            // 2. Upload avatar if selected
            if (avatarFile && player) {
                const ext = avatarFile.name.split('.').pop();
                const path = `${session.user.id}/avatar.${ext}`;
                const avatarUrl = await api.uploadAvatar(path, avatarFile);
                player = await api.updatePlayer(player.id, { avatar_url: avatarUrl });
            }

            if (isPlayer) {
                addToast('Profil erstellt! Willkommen bei Cavio 🎉', 'success');
            } else {
                addToast('Willkommen! Dein Verifiziert-Badge wird nach Prüfung freigeschaltet.', 'success');
            }
            onComplete(player);
        } catch (e) {
            console.error('Onboarding error:', e);
            if (e.message?.includes('username') || e.code === '23505') {
                addToast('Dieser Username ist bereits vergeben.', 'error');
            } else {
                addToast('Fehler beim Speichern. Versuche es erneut.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Username status indicator
    const UsernameIndicator = () => {
        if (usernameStatus === 'idle') return null;
        if (usernameStatus === 'checking') return <Loader2 className="animate-spin text-cyan-400" size={16} />;
        if (usernameStatus === 'available') return <Check className="text-emerald-400" size={16} />;
        return <X className="text-rose-500" size={16} />;
    };

    const steps = [
        {
            icon: <Sparkles className="text-cyan-400" size={28} />,
            title: 'Willkommen bei Cavio',
            subtitle: 'Was beschreibt dich am besten?',
        },
        {
            icon: <Target className="text-cyan-400" size={28} />,
            title: 'Wer bist du?',
            subtitle: selectedRole === 'player' ? 'Erzähl uns ein bisschen über dich.' : 'Wie sollen wir dich nennen?',
        },
        {
            icon: <Camera className="text-cyan-400" size={28} />,
            title: 'Dein Profilbild',
            subtitle: 'Ein gutes Foto erhöht deine Sichtbarkeit.',
        },
        {
            icon: <Sparkles className="text-cyan-400" size={28} />,
            title: 'Fast geschafft!',
            subtitle: selectedRole === 'player' ? 'Starte jetzt und werde entdeckt.' : 'Dein Profil wird nach Absenden geprüft.',
        },
    ];

    return (
        <div className="fixed inset-0 z-[10002] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-zinc-800">
                <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                    initial={false}
                    animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            </div>

            {/* Step Indicator */}
            <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 px-6">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'}`} />
                ))}
            </div>

            <div className="w-full max-w-md px-6 overflow-hidden">
                <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                        key={step}
                        custom={dir}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex flex-col items-center"
                    >
                        {/* Header */}
                        <div className="p-3 bg-cyan-500/10 rounded-2xl mb-4">
                            {steps[step].icon}
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-1">{steps[step].title}</h2>
                        <p className="text-muted-foreground text-sm text-center mb-8">{steps[step].subtitle}</p>

                        {/* Step 0: Role Selection */}
                        {step === 0 && (
                            <div className="w-full space-y-3">
                                {ROLE_OPTIONS.map((role) => (
                                    <button
                                        key={role.value}
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                                            selectedRole === role.value
                                                ? `${role.border} ${role.bg} shadow-lg`
                                                : 'border-border bg-white/5 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 ${
                                            selectedRole === role.value ? 'scale-110' : 'group-hover:scale-105'
                                        } ${role.bg}`}>
                                            {role.emoji}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-base ${
                                                selectedRole === role.value ? 'text-foreground' : 'text-foreground/70'
                                            }`}>{role.label}</p>
                                            <p className="text-muted-foreground text-xs mt-0.5">{role.description}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedRole === role.value
                                                ? `${role.border} bg-gradient-to-r ${role.color}`
                                                : 'border-zinc-600'
                                        }`}>
                                            {selectedRole === role.value && <Check size={12} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                                {selectedRole !== 'player' && (
                                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                                        <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                                        <span>Scout- und Trainer-Accounts werden von unserem Team manuell geprüft. Dies kann bis zu 48h dauern.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 1: Name, Username, Position, Birthday */}
                        {step === 1 && (
                            <div className="w-full space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Vollständiger Name *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className={inputStyle}
                                        placeholder="Dein vollständiger Name"
                                    />
                                </div>

                                {/* Username mit @-Prefix */}
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

                                {/* Position & Birthday — only for players */}
                                {selectedRole === 'player' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Position *</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {POSITIONS.map(pos => (
                                                    <button
                                                        key={pos}
                                                        onClick={() => setPosition(pos)}
                                                        className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${position === pos
                                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                                            : 'bg-slate-100 dark:bg-zinc-900 border-border text-muted-foreground hover:border-slate-400 dark:hover:border-zinc-500'
                                                            }`}
                                                    >
                                                        {pos}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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
                                                        {AGE_ERROR_MESSAGE}
                                                    </p>
                                                </div>
                                            )}
                                            {birthDate && !ageInfo.isUnder16 && (
                                                <p className="text-emerald-400 text-xs mt-1 ml-1 font-medium flex items-center gap-1">
                                                    <Check size={12} /> Alter: {ageInfo.age} Jahre ✓
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Step 2: Avatar */}
                        {step === 2 && (
                            <div className="w-full flex flex-col items-center space-y-6">
                                <label className="cursor-pointer group">
                                    <div className="relative w-36 h-36 rounded-full bg-slate-100 dark:bg-zinc-800 border-2 border-dashed border-border group-hover:border-cyan-500 transition-colors overflow-hidden flex items-center justify-center">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload size={28} className="text-muted-foreground mx-auto mb-2" />
                                                <span className="text-muted-foreground text-xs">Foto wählen</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                                <p className="text-muted-foreground text-xs text-center">
                                    {avatarPreview ? 'Tippe nochmal zum Ändern' : 'JPG, PNG oder WebP, max. 5MB'}
                                </p>
                            </div>
                        )}

                        {/* Step 3: Finish */}
                        {step === 3 && (
                            <div className="w-full space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                            {avatarPreview ? <img src={avatarPreview} className="w-full h-full rounded-full object-cover" /> : <User size={20} className="text-cyan-400" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{fullName || 'Dein Name'}</p>
                                            <p className="text-xs text-cyan-500 font-medium">@{username || 'username'}</p>
                                            <p className="text-xs text-muted-foreground">{selectedRole === 'player' ? (position || 'Position') : ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border"></div>
                                    <div className="text-xs text-muted-foreground space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className="text-cyan-500" /> Profil erstellen
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className="text-cyan-500" /> Username: @{username}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className={avatarPreview ? 'text-cyan-500' : 'text-muted-foreground'} />
                                            <span className={avatarPreview ? '' : 'text-muted-foreground'}>Profilbild hochladen</span>
                                        </div>
                                        {selectedRole === 'player' ? (
                                            <div className="flex items-center gap-2">
                                                <Video size={14} className="text-muted-foreground" />
                                                <span className="text-muted-foreground">Erstes Highlight (später möglich)</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-400">
                                                <ShieldAlert size={14} />
                                                <span>Account-Prüfung durch Team (bis 48h)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute bottom-8 left-0 right-0 px-6 flex gap-3 max-w-md mx-auto">
                {step > 0 && (
                    <button
                        onClick={goBack}
                        disabled={loading}
                        className="px-5 py-3.5 bg-slate-200 dark:bg-zinc-800 text-foreground rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Zurück
                    </button>
                )}
                <div className="flex-1" />
                {step < TOTAL_STEPS - 1 ? (
                    <button
                        onClick={goNext}
                        disabled={step === 1 && !isStep1Valid}
                        className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-30 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                        Weiter <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={() => handleFinish(true)}
                        disabled={loading}
                        className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Speichern...</> : <><Sparkles size={16} /> Los geht's!</>}
                    </button>
                )}
            </div>

            {/* Skip for step 2 (avatar) */}
            {step === 2 && !avatarPreview && (
                <button onClick={goNext} className="absolute bottom-20 text-muted-foreground text-xs hover:text-foreground transition">
                    Überspringen →
                </button>
            )}
        </div>
    );
};
