import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Settings, User, Shield, AlertTriangle,
    Mail, Key, UserCog, ChevronRight, Trash2, PowerOff,
    Globe, Sun, Moon, Bell, Share2, FileText, Lock,
    Loader2, AlertCircle, X, MessageCircle, Briefcase, Users, Search, Crosshair
} from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { saveAccount } from '../lib/savedAccounts';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../lib/api';
import { useUser } from '../contexts/UserContext';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

const SectionHeader = ({ icon: Icon, label, danger = false }) => (
    <div className={`flex items-center gap-2 px-1 mb-2 mt-1 ${danger ? 'text-red-400' : 'text-muted-foreground/60'}`}>
        <Icon size={13} className="shrink-0" />
        <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${danger ? 'text-red-400/80' : 'text-muted-foreground'}`}>
            {label}
        </span>
    </div>
);

const SettingsRow = ({ icon: Icon, label, sublabel, onClick, danger = false, disabled = false }) => (
    <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-4 px-4 py-3.5 transition-all group rounded-xl
            ${danger
                ? 'hover:bg-red-500/8 active:bg-red-500/15'
                : 'hover:bg-muted/50 active:bg-white/8'
            }
            ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
    >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
            ${danger
                ? 'bg-red-500/15 text-red-400 group-hover:bg-red-500/25'
                : 'bg-white/8 text-muted-foreground/60 group-hover:bg-white/12 group-hover:text-zinc-200'
            }`}
        >
            <Icon size={18} />
        </div>
        <div className="flex-1 text-left min-w-0">
            <p className={`font-semibold text-[15px] leading-tight ${danger ? 'text-red-400' : 'text-foreground'}`}>
                {label}
            </p>
            {sublabel && (
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{sublabel}</p>
            )}
        </div>
        <ChevronRight size={16} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${danger ? 'text-red-400/50' : 'text-muted-foreground/40'}`} />
    </motion.button>
);

const SectionCard = ({ children }) => (
    <div className="bg-card/60 border border-white/6 rounded-2xl overflow-hidden divide-y divide-white/5 backdrop-blur-sm">
        {children}
    </div>
);

const Divider = () => <div className="h-px bg-muted/50 mx-4" />;

/* ─────────────────────────────────────────────
   Confirmation Modal — Password Change Request
   ───────────────────────────────────────────── */
const PasswordChangeRequestModal = ({ onClose, email }) => {
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSendLink = async () => {
        setLoading(true);
        setError('');
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`
            });
            if (resetError) throw resetError;
            setIsSuccess(true);
        } catch (err) {
            console.error('Password reset request error:', err);
            setError(err.message || 'Fehler beim Senden des Links.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            />
            <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
                {!loading && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-muted-foreground/60 hover:text-foreground transition"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="p-6">
                    {!isSuccess ? (
                        <>
                            <div className="w-12 h-12 bg-cyan-500/15 rounded-xl flex items-center justify-center mb-4">
                                <Key size={22} className="text-cyan-400" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Passwort ändern</h3>
                            <p className="text-sm text-muted-foreground/60 mt-2 leading-relaxed">
                                Aus Sicherheitsgründen senden wir dir einen Bestätigungslink an <span className="text-foreground font-semibold">{email}</span>. 
                                Klicke auf den Link in der E-Mail, um dein Passwort neu zu setzen.
                            </p>

                            {error && (
                                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                                    <AlertCircle size={14} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="mt-6 space-y-2">
                                <button
                                    onClick={handleSendLink}
                                    disabled={loading}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                                    Bestätigungslink senden
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="w-full bg-muted/50 hover:bg-muted text-muted-foreground/60 font-semibold py-3 rounded-xl transition"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="py-4 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in-95">
                                <CheckCircle size={32} className="text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">E-Mail gesendet!</h3>
                            <p className="text-sm text-muted-foreground/60 mt-2 leading-relaxed">
                                Bitte prüfe dein Postfach (und den Spam-Ordner). Klicke auf den Link in der E-Mail, um dein Passwort zu ändern.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition active:scale-95"
                            >
                                Verstanden
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Confirmation Modal — Deactivate Account
───────────────────────────────────────────── */
const DeactivateConfirmModal = ({ onClose, onConfirm, loading }) => (
    <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!loading ? onClose : undefined}
        />
        <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
            <div className="p-5 pb-4 border-b border-border">
                <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center mb-4">
                    <PowerOff size={22} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Account deaktivieren?</h3>
                <p className="text-sm text-muted-foreground/60 mt-1.5 leading-relaxed">
                    Dein Profil wird für andere unsichtbar, bis du dich wieder anmeldest. Deine Daten bleiben erhalten.
                </p>
            </div>
            <div className="p-4 space-y-2">
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-95"
                >
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Deaktiviere...</> : 'Deaktivieren'}
                </button>
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="w-full bg-muted/50 hover:bg-muted text-muted-foreground font-semibold py-3 rounded-xl transition"
                >
                    Abbrechen
                </button>
            </div>
        </motion.div>
    </div>
);

/* ─────────────────────────────────────────────
   Hard-Security Modal — Delete Account
───────────────────────────────────────────── */
const DeleteConfirmModal = ({ onClose, onConfirm, loading }) => {
    const [input, setInput] = useState('');
    const isConfirmed = input === 'LÖSCHEN';

    return (
        <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            />
            <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-card border border-red-500/20 rounded-2xl shadow-2xl shadow-red-900/20 overflow-hidden"
            >
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-4 right-4 p-1.5 text-muted-foreground/60 hover:text-foreground transition"
                >
                    <X size={18} />
                </button>

                <div className="p-5 pb-4">
                    <div className="w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center mb-4">
                        <Trash2 size={22} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-red-400">Account endgültig löschen</h3>
                    <p className="text-sm text-muted-foreground/60 mt-1.5 leading-relaxed">
                        Alle deine Daten, Videos und Nachrichten werden <span className="text-foreground font-semibold">unwiderruflich</span> gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                </div>

                <div className="px-5 pb-4">
                    <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300/80 leading-relaxed">
                                Tippe <span className="font-black text-red-300 tracking-widest px-1 py-0.5 bg-red-500/15 rounded">LÖSCHEN</span> in das Feld unten, um zu bestätigen.
                            </p>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        placeholder="LÖSCHEN"
                        className="w-full bg-black/40 border border-border focus:border-red-500/60 rounded-xl p-3 text-foreground focus:outline-none transition-colors text-sm font-mono tracking-widest placeholder:text-zinc-700 placeholder:tracking-normal placeholder:font-sans"
                    />
                </div>

                <div className="px-5 pb-5 space-y-2">
                    <button
                        onClick={() => onConfirm()}
                        disabled={!isConfirmed || loading}
                        className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900/40 disabled:text-red-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed"
                    >
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Wird gelöscht...</> : 'Endgültig löschen'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full bg-muted/50 hover:bg-muted text-muted-foreground font-semibold py-3 rounded-xl transition"
                    >
                        Abbrechen
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Support Contact Modal
   ───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   Support Contact Modal (Wizard)
   ───────────────────────────────────────────── */
const SupportContactModal = ({ onClose, onDirectMessage }) => {
    const [step, setStep] = useState('choice'); // 'choice' | 'wizard'
    const [category, setCategory] = useState(null);
    const [otherText, setOtherText] = useState('');

    const categories = [
        { id: 'tech', label: 'Technisches Problem', icon: '🐛' },
        { id: 'account', label: 'Account & Profil', icon: '🔐' },
        { id: 'b2b', label: 'Scouting & B2B-Anfragen', icon: '💼' },
        { id: 'legal', label: 'Datenschutz & Sicherheit', icon: '🛡️' },
        { id: 'feedback', label: 'Feedback & Ideen', icon: '⭐' },
        { id: 'report', label: 'Nutzer/Inhalte melden', icon: '🚩' },
        { id: 'other', label: 'Sonstiges (Eigenes Anliegen)', icon: '✏️' },
    ];

    const handleContinue = () => {
        if (!category) return;
        const selectedCat = categories.find(c => c.id === category);
        let prefill = `Support-Anfrage: ${selectedCat.icon} ${selectedCat.label}`;
        if (category === 'other' && otherText.trim()) {
            prefill += `\n\nBeschreibung:\n${otherText}`;
        } else if (category === 'other') {
            prefill += `\n\n(Bitte beschreibe dein Anliegen hier...)`;
        }
        onDirectMessage(prefill);
    };

    return (
        <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    {step === 'choice' ? (
                        <motion.div
                            key="choice"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col"
                        >
                            <div className="p-6 pb-4">
                                <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center mb-4">
                                    <MessageCircle size={22} className="text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">Support kontaktieren</h3>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                    Wie möchtest du uns erreichen? Unser Team ist für dich da.
                                </p>
                            </div>

                            <div className="p-4 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setStep('wizard')}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 hover:bg-muted/60 rounded-2xl border border-border transition-all active:scale-[0.96] group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                                        <MessageCircle size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-foreground text-xs">Chat</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">Wizard-Assistent</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        window.location.href = 'mailto:kontakt@cavio.me';
                                        onClose();
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/40 hover:bg-muted/60 rounded-2xl border border-border transition-all active:scale-[0.96] group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-sm">
                                        <Mail size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-foreground text-xs">E-Mail</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">kontakt@cavio.me</p>
                                    </div>
                                </button>
                            </div>

                            <div className="p-4 pt-2 pb-6 text-center">
                                <button
                                    onClick={onClose}
                                    className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="wizard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col"
                        >
                            <div className="p-6 pb-2">
                                <button 
                                    onClick={() => setStep('choice')}
                                    className="text-xs font-bold text-blue-500 flex items-center gap-1 mb-2 hover:opacity-70 transition-opacity"
                                >
                                    <ArrowLeft size={14} /> Zurück zur Auswahl
                                </button>
                                <h3 className="text-xl font-bold text-foreground">Worum geht es?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Wähle ein Thema, damit wir dir schneller helfen können.
                                </p>
                            </div>

                            <div className="p-4 pt-2 max-h-[40vh] overflow-y-auto space-y-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                            category === cat.id 
                                                ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm' 
                                                : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border'
                                        }`}
                                    >
                                        <span className="text-xl">{cat.icon}</span>
                                        <span className="text-sm font-medium flex-1">{cat.label}</span>
                                        {category === cat.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                    </button>
                                ))}
                            </div>

                            {category === 'other' && (
                                <div className="px-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <textarea
                                        value={otherText}
                                        onChange={(e) => setOtherText(e.target.value)}
                                        placeholder="Beschreibe dein Anliegen kurz..."
                                        className="w-full bg-muted/40 border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-blue-500 transition-colors h-20 resize-none"
                                    />
                                </div>
                            )}

                            <div className="p-4 pt-2 pb-6 space-y-3">
                                <button
                                    onClick={handleContinue}
                                    disabled={!category}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    Weiter zum Chat <ChevronRight size={18} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Strict Role Switch Modal
   ───────────────────────────────────────────── */
const RoleSwitchModal = ({ onClose, onConfirm, currentRole, loading }) => {
    const [selectedRole, setSelectedRole] = useState(currentRole || 'player');
    const [confirmText, setConfirmText] = useState('');
    const isConfirmed = confirmText === 'WECHSELN';

    const roles = [
        { id: 'player', label: 'Spieler', icon: Search, color: 'text-cyan-400' },
        { id: 'coach', label: 'Trainer', icon: Crosshair, color: 'text-emerald-400' },
        { id: 'scout', label: 'Scout', icon: Briefcase, color: 'text-amber-400' },
        { id: 'manager', label: 'Manager', icon: Users, color: 'text-indigo-400' },
    ];

    return (
        <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={!loading ? onClose : undefined}
            />
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md bg-card border-t sm:border border-border sm:rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-1">Karrierepfad wechseln</h3>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Wähle deine neue Rolle. Deine App-Erfahrung wird entsprechend angepasst.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                    selectedRole === role.id
                                        ? 'bg-muted border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                                        : 'bg-muted/30 border-transparent hover:bg-muted/50'
                                }`}
                            >
                                <div className={`p-3 rounded-xl ${selectedRole === role.id ? 'bg-cyan-500/20' : 'bg-background'}`}>
                                    <role.icon size={24} className={selectedRole === role.id ? 'text-cyan-400' : 'text-muted-foreground'} />
                                </div>
                                <span className={`font-bold text-sm ${selectedRole === role.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {role.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={16} className="text-red-400" />
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Sicherheitsbestätigung</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            Tippe <span className="font-black text-foreground tracking-widest px-1">WECHSELN</span> um die Rolle zu aktualisieren.
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="WECHSELN"
                            className="w-full bg-black/40 border border-border focus:border-red-500/50 rounded-xl p-3 text-sm font-mono tracking-widest text-center focus:outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground/60 font-bold transition active:scale-95"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={() => onConfirm(selectedRole)}
                            disabled={!isConfirmed || loading}
                            className="flex-[2] py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:grayscale text-white font-bold transition shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Rolle aktualisieren'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Confirmation Modal — Logout
   ───────────────────────────────────────────── */
const LogoutConfirmModal = ({ onClose, onConfirm, session, currentUserProfile }) => (
    <div className="fixed inset-0 z-[10100] flex items-end sm:items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        />
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
            <div className="p-8 pt-10 text-center">
                <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-red-500/10 rounded-3xl blur-xl animate-pulse" />
                    <LogOut size={32} className="text-red-500 relative z-10" />
                </div>
                <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">Abmelden?</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px] mx-auto">
                    Möchtest du dich wirklich von deinem Account abmelden?
                </p>
            </div>
            <div className="p-6 pt-0 space-y-3">
                <button
                    onClick={onConfirm}
                    className="w-full py-4.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-red-600/20"
                >
                    Ja, Abmelden
                </button>
                <button
                    onClick={onClose}
                    className="w-full py-4.5 bg-muted/50 hover:bg-muted text-muted-foreground/60 font-bold rounded-2xl transition-all active:scale-[0.98]"
                >
                    Abbrechen
                </button>
            </div>
        </motion.div>
    </div>
);

/* ─────────────────────────────────────────────
   Main SettingsScreen
───────────────────────────────────────────── */
const SettingsScreen = ({
    currentUserProfile,
    session,
    onBack,
    onLogout,
    onEditReq,
    onOpenEmailModal,
    onOpenPasswordModal,
    onMenuOpen,
    onSelectChat,
}) => {
    const { addToast } = useToast();
    const { lang, toggleLanguage } = useLanguage();
    const { isDark, toggleTheme } = useTheme();
    const { userProfile } = useUser();
    
    // Internal Navigation State
    const [activeView, setActiveView] = useState('main'); // 'main' | 'account' | 'notifications' | 'support'
    
    // Modals
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showPasswordRequestModal, setShowPasswordRequestModal] = useState(false);
    
    // Loading States
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [roleLoading, setRoleLoading] = useState(false);

    // Deep Linking Support
    useEffect(() => {
        const hash = window.location.hash;
        if (hash === '#settings/support') setActiveView('support');
        if (hash === '#settings/account') setActiveView('account');
    }, []);

    const handleBack = () => {
        if (activeView !== 'main') {
            setActiveView('main');
            window.history.replaceState(null, '', '#settings');
        } else {
            onBack();
        }
    };

    const handleRoleSwitch = async (newRole) => {
        if (!currentUserProfile?.id) return;
        setRoleLoading(true);
        try {
            const { error } = await supabase
                .from('players_master')
                .update({ role: newRole })
                .eq('id', currentUserProfile.id);

            if (error) throw error;
            
            addToast(`Rolle zu ${newRole} gewechselt.`, 'success');
            setShowRoleModal(false);
            // Optional: Force reload or context update
            window.location.reload(); 
        } catch (err) {
            console.error('Role switch error:', err);
            addToast('Fehler beim Rollenwechsel.', 'error');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleDirectMessage = async (prefill = null) => {
        setShowSupportModal(false);
        try {
            // Search for the official support account
            const { data: supportUsers, error } = await supabase
                .from('players_master')
                .select('*')
                .eq('is_official', true)
                .limit(1);

            if (error) throw error;
            
            if (supportUsers && supportUsers.length > 0) {
                const supportUser = supportUsers[0];
                
                // Construct partner object for ChatWindow
                const partner = {
                    user_id: supportUser.user_id, // Important: use user_id for messaging
                    full_name: supportUser.full_name || 'CAVIO Support',
                    avatar_url: supportUser.avatar_url,
                    is_official: true,
                    verification_status: supportUser.verification_status,
                    prefill: prefill // Inject our wizard prefill
                };
                
                onSelectChat(partner);
            } else {
                // Fallback to email if no official account found
                window.location.href = 'mailto:kontakt@cavio.me';
                addToast('Support-Chat aktuell nicht verfügbar. E-Mail wird geöffnet.', 'info');
            }
        } catch (err) {
            console.error('Support redirect error:', err);
            addToast('Fehler beim Weiterleiten zum Support.', 'error');
        }
    };

    const handleDeactivateConfirm = async () => {
        if (!currentUserProfile) return;
        setDeactivateLoading(true);
        try {
            const { error } = await supabase
                .from('players_master')
                .update({ is_deactivated: true })
                .eq('id', currentUserProfile.id);
            if (error) throw error;
            addToast('Dein Account wurde vorübergehend deaktiviert.', 'info');
            onLogout();
        } catch (err) {
            console.error('Deactivation error:', err);
            addToast('Fehler bei der Deaktivierung. Bitte versuche es erneut.', 'error');
            setDeactivateLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!session) return;
        setDeleteLoading(true);
        try {
            await api.deleteUserAccount();
            addToast('Dein Account wurde vollständig gelöscht.', 'info');
            onLogout();
        } catch (e) {
            console.error('Account deletion failed:', e);
            addToast('Fehler beim Löschen. Bitte kontaktiere den Support.', 'error');
            setDeleteLoading(false);
        }
    };

    const handleShare = () => {
        if (currentUserProfile?.id) {
            const url = `https://${window.location.host}/u/${currentUserProfile.id}`;
            navigator.clipboard.writeText(url);
            addToast('Profil-Link kopiert!', 'success');
        }
    };

    const renderView = () => {
        switch (activeView) {
            case 'account':
                return (
                    <motion.div
                        key="account"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <SectionHeader icon={User} label="Profil-Details" />
                            <SectionCard>
                                <SettingsRow
                                    icon={UserCog}
                                    label="Benutzernamen ändern"
                                    sublabel={currentUserProfile?.full_name || '–'}
                                    onClick={onEditReq}
                                />
                                <Divider />
                                <SettingsRow
                                    icon={Mail}
                                    label="E-Mail-Adresse"
                                    sublabel={session?.user?.email || currentUserProfile?.email || '–'}
                                    onClick={onOpenEmailModal}
                                />
                                <Divider />
                                <SettingsRow
                                    icon={Lock}
                                    label="Passwort"
                                    sublabel="Sicherheitseinstellungen"
                                    onClick={() => setShowPasswordRequestModal(true)}
                                />
                            </SectionCard>
                        </div>

                        <div>
                            <SectionHeader icon={Shield} label="Accountverwaltung" danger />
                            <SectionCard className="border-red-500/10">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowRoleModal(true)}
                                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition group"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                        <UserCog size={20} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-[15px] text-foreground">Karrierepfad wechseln</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Aktuelle Rolle: <span className="text-amber-500 font-bold uppercase tracking-wider">{currentUserProfile?.role || 'Spieler'}</span></p>
                                    </div>
                                    <ChevronRight size={18} className="text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                                </motion.button>
                                <Divider />
                                <SettingsRow
                                    icon={PowerOff}
                                    label="Account deaktivieren"
                                    sublabel="Dein Profil wird vorübergehend unsichtbar"
                                    onClick={() => setShowDeactivateModal(true)}
                                    danger
                                />
                                <Divider />
                                <SettingsRow
                                    icon={Trash2}
                                    label="Account löschen"
                                    sublabel="Alle Daten werden unwiderruflich entfernt"
                                    onClick={() => setShowDeleteModal(true)}
                                    danger
                                />
                            </SectionCard>
                        </div>
                    </motion.div>
                );

            case 'support':
                return (
                    <motion.div
                        key="support"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <SectionHeader icon={MessageCircle} label="Hilfe & Kontakt" />
                            <SectionCard>
                                <SettingsRow
                                    icon={Mail}
                                    label="Support kontaktieren"
                                    sublabel="Chat oder E-Mail"
                                    onClick={() => setShowSupportModal(true)}
                                />
                                <Divider />
                                <SettingsRow
                                    icon={Share2}
                                    label="Problem melden"
                                    sublabel="Fehler in der App mitteilen"
                                    onClick={() => window.location.href = 'mailto:kontakt@cavio.me?subject=Fehlermeldung'}
                                />
                            </SectionCard>
                        </div>

                        <div>
                            <SectionHeader icon={FileText} label="Rechtliches" />
                            <SectionCard>
                                <SettingsRow
                                    icon={Lock}
                                    label="Datenschutz"
                                    onClick={() => {
                                        window.location.hash = 'privacy';
                                        // Wait, the PrivacyScreen handles /#privacy. 
                                        // But in App.jsx it might be mapped to /#privacy.
                                        window.location.href = '/#privacy';
                                    }}
                                />
                                <Divider />
                                <SettingsRow
                                    icon={FileText}
                                    label="Impressum"
                                    onClick={() => {
                                        window.location.href = '/#impressum';
                                    }}
                                />
                            </SectionCard>
                        </div>
                    </motion.div>
                );

            default:
                return (
                    <motion.div
                        key="main"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="space-y-6"
                    >
                        <SectionCard>
                            <SettingsRow
                                icon={User}
                                label="Account & Profil"
                                sublabel="Name, E-Mail, Sicherheit"
                                onClick={() => {
                                    setActiveView('account');
                                    window.history.pushState(null, '', '#settings/account');
                                }}
                            />
                            <Divider />
                            <SettingsRow
                                icon={MessageCircle}
                                label="Hilfe & Support"
                                sublabel="Kontakt, Datenschutz, Impressum"
                                onClick={() => {
                                    setActiveView('support');
                                    window.history.pushState(null, '', '#settings/support');
                                }}
                            />
                        </SectionCard>

                        <div>
                            <SectionHeader icon={Settings} label="App-Einstellungen" />
                            <SectionCard>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={toggleTheme}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition group"
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {isDark ? <Moon size={18} /> : <Sun size={18} />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-[15px] text-foreground">Design-Modus</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{isDark ? 'Dunkles Theme aktiv' : 'Helles Theme aktiv'}</p>
                                    </div>
                                    <span className="text-xs bg-white/8 text-muted-foreground/60 px-2.5 py-1 rounded-full font-medium">
                                        {isDark ? '☀️ Wechseln' : '🌙 Wechseln'}
                                    </span>
                                </motion.button>
                                <Divider />
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={toggleLanguage}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted transition group"
                                >
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                                        <Globe size={18} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-[15px] text-foreground">Sprache</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{lang === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</p>
                                    </div>
                                    <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                                        {lang === 'de' ? 'EN →' : 'DE →'}
                                    </span>
                                </motion.button>
                                <Divider />
                                <SettingsRow
                                    icon={Share2}
                                    label="Profil teilen"
                                    sublabel="Link in Zwischenablage kopieren"
                                    onClick={handleShare}
                                />
                            </SectionCard>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="w-full group flex items-center gap-4 px-4 py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                                    <PowerOff size={20} />
                                </div>
                                <span className="font-bold text-red-500">Abmelden</span>
                            </button>
                        </div>
                    </motion.div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border pt-[env(safe-area-inset-top)]">
                <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-white/8 transition"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-foreground">
                            {activeView === 'account' ? 'Account & Profil' : 
                             activeView === 'support' ? 'Hilfe & Support' : 'Einstellungen'}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-lg mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {renderView()}
                </AnimatePresence>

                <p className="mt-12 text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    CAVIO PLATFORM v3.0.4 • 2026
                </p>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showDeactivateModal && (
                    <DeactivateConfirmModal
                        onClose={() => setShowDeactivateModal(false)}
                        onConfirm={handleDeactivateConfirm}
                        loading={deactivateLoading}
                    />
                )}
                {showDeleteModal && (
                    <DeleteConfirmModal
                        onClose={() => setShowDeleteModal(false)}
                        onConfirm={handleDeleteConfirm}
                        loading={deleteLoading}
                    />
                )}
                {showLogoutModal && (
                    <LogoutConfirmModal
                        onClose={() => setShowLogoutModal(false)}
                        onConfirm={onLogout}
                    />
                )}
                {showSupportModal && (
                    <SupportContactModal
                        onClose={() => setShowSupportModal(false)}
                        onDirectMessage={handleDirectMessage}
                    />
                )}
                {showRoleModal && (
                    <RoleSwitchModal
                        onClose={() => setShowRoleModal(false)}
                        onConfirm={handleRoleSwitch}
                        currentRole={currentUserProfile?.role}
                        loading={roleLoading}
                    />
                )}
                {showPasswordRequestModal && (
                    <PasswordChangeRequestModal
                        onClose={() => setShowPasswordRequestModal(false)}
                        email={session?.user?.email}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsScreen;
