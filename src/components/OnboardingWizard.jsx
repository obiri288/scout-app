import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, Video, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Target, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const POSITIONS = ['Torwart', 'Innenverteidiger', 'Außenverteidiger', 'Defensives Mittelfeld', 'Zentrales Mittelfeld', 'Offensives Mittelfeld', 'Linksaußen', 'Rechtsaußen', 'Mittelstürmer'];

const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export const OnboardingWizard = ({ session, onComplete }) => {
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Step 1 data
    const [fullName, setFullName] = useState('');
    const [position, setPosition] = useState('');
    const [birthDate, setBirthDate] = useState('');

    // Step 2 data (avatar)
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const goNext = () => { setDir(1); setStep(s => s + 1); };
    const goBack = () => { setDir(-1); setStep(s => s - 1); };

    const handleFinish = async (skipVideo = true) => {
        if (!fullName.trim() || !position) {
            addToast('Bitte fülle Name und Position aus.', 'error');
            setDir(-1);
            setStep(0);
            return;
        }

        setLoading(true);
        try {
            // 1. Create or update player profile
            const profileData = {
                user_id: session.user.id,
                full_name: fullName.trim(),
                position_primary: position,
                date_of_birth: birthDate || null,
                transfer_status: 'Suche Verein',
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

            addToast('Profil erstellt! Willkommen bei ProBase 🎉', 'success');
            onComplete(player);
        } catch (e) {
            console.error('Onboarding error:', e);
            addToast('Fehler beim Speichern. Versuche es erneut.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            icon: <Target className="text-amber-400" size={28} />,
            title: 'Wer bist du?',
            subtitle: 'Erzähl uns ein bisschen über dich.',
        },
        {
            icon: <Camera className="text-amber-400" size={28} />,
            title: 'Dein Profilbild',
            subtitle: 'Ein gutes Foto erhöht deine Sichtbarkeit.',
        },
        {
            icon: <Sparkles className="text-amber-400" size={28} />,
            title: 'Fast geschafft!',
            subtitle: 'Starte jetzt und werde entdeckt.',
        },
    ];

    return (
        <div className="fixed inset-0 z-[10002] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                    initial={false}
                    animate={{ width: `${((step + 1) / 3) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            </div>

            {/* Step Indicator */}
            <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 px-6">
                {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-amber-500' : 'bg-zinc-700'}`} />
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
                        <div className="p-3 bg-amber-500/10 rounded-2xl mb-4">
                            {steps[step].icon}
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">{steps[step].title}</h2>
                        <p className="text-zinc-400 text-sm text-center mb-8">{steps[step].subtitle}</p>

                        {/* Step 1: Name, Position, Birthday */}
                        {step === 0 && (
                            <div className="w-full space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Vollständiger Name *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Dein vollständiger Name"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Position *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {POSITIONS.map(pos => (
                                            <button
                                                key={pos}
                                                onClick={() => setPosition(pos)}
                                                className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${position === pos
                                                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                                    }`}
                                            >
                                                {pos}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Geburtsdatum</label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Avatar */}
                        {step === 1 && (
                            <div className="w-full flex flex-col items-center space-y-6">
                                <label className="cursor-pointer group">
                                    <div className="relative w-36 h-36 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 group-hover:border-amber-500 transition-colors overflow-hidden flex items-center justify-center">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload size={28} className="text-zinc-500 mx-auto mb-2" />
                                                <span className="text-zinc-500 text-xs">Foto wählen</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                                <p className="text-zinc-500 text-xs text-center">
                                    {avatarPreview ? 'Tippe nochmal zum Ändern' : 'JPG, PNG oder WebP, max. 5MB'}
                                </p>
                            </div>
                        )}

                        {/* Step 3: Finish */}
                        {step === 2 && (
                            <div className="w-full space-y-4">
                                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                            {avatarPreview ? <img src={avatarPreview} className="w-full h-full rounded-full object-cover" /> : <User size={20} className="text-amber-400" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{fullName || 'Dein Name'}</p>
                                            <p className="text-xs text-zinc-400">{position || 'Position'}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-zinc-700"></div>
                                    <div className="text-xs text-zinc-400 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className="text-amber-500" /> Profil erstellen
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check size={14} className={avatarPreview ? 'text-amber-500' : 'text-zinc-600'} />
                                            <span className={avatarPreview ? '' : 'text-zinc-600'}>Profilbild hochladen</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Video size={14} className="text-zinc-600" />
                                            <span className="text-zinc-600">Erstes Highlight (später möglich)</span>
                                        </div>
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
                        className="px-5 py-3.5 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Zurück
                    </button>
                )}
                <div className="flex-1" />
                {step < 2 ? (
                    <button
                        onClick={goNext}
                        disabled={step === 0 && (!fullName.trim() || !position)}
                        className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/30 disabled:text-amber-300/50 text-white rounded-xl font-bold text-sm transition flex items-center gap-2"
                    >
                        Weiter <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={() => handleFinish(true)}
                        disabled={loading}
                        className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white rounded-xl font-bold text-sm transition flex items-center gap-2"
                    >
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Speichern...</> : <><Sparkles size={16} /> Los geht's!</>}
                    </button>
                )}
            </div>

            {/* Skip for step 1 (avatar) */}
            {step === 1 && !avatarPreview && (
                <button onClick={goNext} className="absolute bottom-20 text-zinc-500 text-xs hover:text-zinc-300 transition">
                    Überspringen →
                </button>
            )}
        </div>
    );
};
