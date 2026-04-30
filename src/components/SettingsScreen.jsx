import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Settings, User, Shield, AlertTriangle,
    Mail, Key, UserCog, ChevronRight, Trash2, PowerOff,
    Globe, Sun, Moon, Bell, Share2, FileText, Lock,
    Loader2, AlertCircle, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import * as api from '../lib/api';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

const SectionHeader = ({ icon: Icon, label, danger = false }) => (
    <div className={`flex items-center gap-2 px-1 mb-2 mt-1 ${danger ? 'text-red-400' : 'text-zinc-400'}`}>
        <Icon size={13} className="shrink-0" />
        <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${danger ? 'text-red-400/80' : 'text-zinc-500'}`}>
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
                : 'hover:bg-white/5 active:bg-white/8'
            }
            ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
    >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
            ${danger
                ? 'bg-red-500/15 text-red-400 group-hover:bg-red-500/25'
                : 'bg-white/8 text-zinc-400 group-hover:bg-white/12 group-hover:text-zinc-200'
            }`}
        >
            <Icon size={18} />
        </div>
        <div className="flex-1 text-left min-w-0">
            <p className={`font-semibold text-[15px] leading-tight ${danger ? 'text-red-400' : 'text-foreground'}`}>
                {label}
            </p>
            {sublabel && (
                <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{sublabel}</p>
            )}
        </div>
        <ChevronRight size={16} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${danger ? 'text-red-400/50' : 'text-zinc-600'}`} />
    </motion.button>
);

const SectionCard = ({ children }) => (
    <div className="bg-zinc-900/60 border border-white/6 rounded-2xl overflow-hidden divide-y divide-white/5 backdrop-blur-sm">
        {children}
    </div>
);

const Divider = () => <div className="h-px bg-white/5 mx-4" />;

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
            className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-5 pb-4 border-b border-white/5">
                <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center mb-4">
                    <PowerOff size={22} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Account deaktivieren?</h3>
                <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                    Dein Profil wird für andere unsichtbar, bis du dich wieder anmeldest. Deine Daten bleiben erhalten.
                </p>
            </div>
            {/* Actions */}
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
                    className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-3 rounded-xl transition"
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
                className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-zinc-900 border border-red-500/20 rounded-2xl shadow-2xl shadow-red-900/20 overflow-hidden"
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-zinc-300 transition"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="p-5 pb-4">
                    <div className="w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center mb-4">
                        <Trash2 size={22} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-red-400">Account endgültig löschen</h3>
                    <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        Alle deine Daten, Videos und Nachrichten werden <span className="text-foreground font-semibold">unwiderruflich</span> gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                </div>

                {/* Confirmation input */}
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
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/60 rounded-xl p-3 text-foreground focus:outline-none transition-colors text-sm font-mono tracking-widest placeholder:text-zinc-700 placeholder:tracking-normal placeholder:font-sans"
                    />
                </div>

                {/* Actions */}
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
                        className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-3 rounded-xl transition"
                    >
                        Abbrechen
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

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
}) => {
    const { addToast } = useToast();
    const { lang, toggleLanguage } = useLanguage();
    const { isDark, toggleTheme } = useTheme();
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

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
            navigator.clipboard.writeText(`https://${window.location.host}/u/${currentUserProfile.id}`);
            addToast('Profil-Link kopiert!', 'success');
        }
    };

    return (
        <>
            {/* Screen */}
            <div className="min-h-screen bg-background pb-32">
                {/* Top Bar */}
                <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-foreground hover:bg-white/8 transition"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Settings size={20} className="text-zinc-400" />
                            <h1 className="text-lg font-bold text-foreground">Einstellungen</h1>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

                    {/* ── Block 1: Profil-Informationen ── */}
                    <div>
                        <SectionHeader icon={User} label="Profil" />
                        <SectionCard>
                            <SettingsRow
                                icon={UserCog}
                                label="Benutzernamen ändern"
                                sublabel={currentUserProfile?.full_name || '–'}
                                onClick={() => { onEditReq(); }}
                            />
                            <Divider />
                            <SettingsRow
                                icon={Mail}
                                label="E-Mail ändern"
                                sublabel={session?.user?.email || currentUserProfile?.email || '–'}
                                onClick={onOpenEmailModal}
                            />
                        </SectionCard>
                    </div>

                    {/* ── Block 2: Sicherheit ── */}
                    <div>
                        <SectionHeader icon={Shield} label="Sicherheit" />
                        <SectionCard>
                            <SettingsRow
                                icon={Key}
                                label="Passwort ändern"
                                onClick={onOpenPasswordModal}
                            />
                        </SectionCard>
                    </div>

                    {/* ── Preferences ── */}
                    <div>
                        <SectionHeader icon={Settings} label="Darstellung & App" />
                        <SectionCard>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={toggleTheme}
                                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 transition group"
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {isDark ? <Moon size={18} /> : <Sun size={18} />}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-[15px] text-foreground">Design-Modus</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{isDark ? 'Dunkles Theme aktiv' : 'Helles Theme aktiv'}</p>
                                </div>
                                <span className="text-xs bg-white/8 text-zinc-400 px-2.5 py-1 rounded-full font-medium">
                                    {isDark ? '☀️ Wechseln' : '🌙 Wechseln'}
                                </span>
                            </motion.button>
                            <Divider />
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={toggleLanguage}
                                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 transition group"
                            >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/8 text-zinc-400 group-hover:bg-white/12">
                                    <Globe size={18} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-[15px] text-foreground">Sprache</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{lang === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</p>
                                </div>
                                <span className="text-xs bg-white/8 text-zinc-400 px-2.5 py-1 rounded-full font-medium">
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

                    {/* ── Rechtliches ── */}
                    <div>
                        <SectionHeader icon={FileText} label="Rechtliches" />
                        <SectionCard>
                            <SettingsRow
                                icon={Lock}
                                label="Datenschutz"
                                onClick={() => window.open('/datenschutz', '_blank')}
                            />
                            <Divider />
                            <SettingsRow
                                icon={FileText}
                                label="Impressum"
                                onClick={() => window.open('/impressum', '_blank')}
                            />
                        </SectionCard>
                    </div>

                    {/* ── Block 3: Danger Zone ── */}
                    <div>
                        <SectionHeader icon={AlertTriangle} label="Account-Verwaltung" danger />
                        <div className="bg-red-950/20 border border-red-500/15 rounded-2xl overflow-hidden divide-y divide-red-500/10">
                            <SettingsRow
                                icon={PowerOff}
                                label="Account deaktivieren"
                                sublabel="Dein Profil wird vorübergehend ausgeblendet"
                                onClick={() => setShowDeactivateModal(true)}
                                danger
                            />
                            <SettingsRow
                                icon={Trash2}
                                label="Account löschen"
                                sublabel="Alle Daten werden unwiderruflich gelöscht"
                                onClick={() => setShowDeleteModal(true)}
                                danger
                            />
                        </div>
                    </div>

                    {/* Version */}
                    <p className="text-center text-zinc-700 text-xs pb-2">v3.0.0 Live</p>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showDeactivateModal && (
                    <DeactivateConfirmModal
                        onClose={() => setShowDeactivateModal(false)}
                        onConfirm={handleDeactivateConfirm}
                        loading={deactivateLoading}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showDeleteModal && (
                    <DeleteConfirmModal
                        onClose={() => setShowDeleteModal(false)}
                        onConfirm={handleDeleteConfirm}
                        loading={deleteLoading}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default SettingsScreen;
