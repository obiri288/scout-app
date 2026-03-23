import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, ChevronRight, Download, Bell, RefreshCw, Edit, BadgeCheck, Share2, Key, Lock, FileText, LogOut, Trash2, Globe, Sun, Moon } from 'lucide-react';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export const SettingsModal = ({ onClose, onLogout, onRequestPush, user, onEditReq, onVerifyReq, onCloseAndOpen }) => {
    const [showToast, setShowToast] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const { addToast } = useToast();
    const { lang, toggleLanguage, t } = useLanguage();
    const { isDark, toggleTheme } = useTheme();

    if (!user) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleCloseAndOpen = (target) => {
        setIsClosing(true);
        setTimeout(() => onCloseAndOpen(target), 300);
    };

    const showFeedback = (msg) => { setShowToast(msg); setTimeout(() => setShowToast(null), 2000); };



    const handleShare = () => {
        if (user?.id) {
            navigator.clipboard.writeText(`https://probase.app/u/${user.id}`);
            addToast('Link in Zwischenablage!', 'success');
        }
    };

    const handleDeleteAccount = () => {
        if (confirm("ACHTUNG: Möchtest du deinen Account wirklich unwiderruflich löschen?")) {
            onLogout();
            addToast("Account gelöscht.", 'info');
        }
    };

    const SettingsItem = ({ icon: Icon, label, onClick, danger = false, highlight = false }) => (
        <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} onClick={onClick} className={`w-full p-3 flex items-center justify-between group transition-all rounded-xl ${danger ? 'hover:bg-red-500/10' : highlight ? 'bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${danger ? 'bg-red-500/20 text-red-500' : highlight ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5 text-muted-foreground group-hover:text-foreground'}`}><Icon size={18} /></div><span className={`font-medium text-sm ${danger ? 'text-red-500' : highlight ? 'text-blue-600 dark:text-blue-100' : 'text-foreground/80 group-hover:text-foreground'}`}>{label}</span></div>
            <ChevronRight size={16} className={danger ? 'text-red-500' : highlight ? 'text-blue-400' : 'text-muted-foreground/50 group-hover:text-muted-foreground'} />
        </motion.button>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex justify-end">
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}></div>
            <div className={`relative w-80 max-w-[85vw] h-full bg-white dark:bg-zinc-900 border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}>
                <div className="p-5 border-b border-border flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Settings size={18} /> {t('settings_title')}</h2>
                    <button onClick={handleClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>
                <SafeErrorBoundary>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="space-y-1"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">{t('settings_language')}</h3>
                            <button onClick={toggleLanguage} className="w-full p-3 flex items-center justify-between group transition-all rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground group-hover:text-foreground"><Globe size={18} /></div><span className="font-medium text-sm text-foreground/80 group-hover:text-foreground">{lang === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</span></div>
                                <span className="text-xs text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">{lang === 'de' ? 'EN →' : 'DE →'}</span>
                            </button>
                        </div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">{t('settings_theme')}</h3>
                            <button onClick={toggleTheme} className="w-full p-3 flex items-center justify-between group transition-all rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                                <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>{isDark ? <Moon size={18} /> : <Sun size={18} />}</div><span className="font-medium text-sm text-foreground/80 group-hover:text-foreground">{isDark ? t('settings_dark') : t('settings_light')}</span></div>
                                <span className="text-xs text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">{isDark ? '☀️' : '🌙'}</span>
                            </button>
                        </div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">App</h3><SettingsItem icon={Bell} label={t('settings_push') || "Push-Benachrichtigungen"} onClick={() => handleCloseAndOpen('push')} /></div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Account</h3><SettingsItem icon={Edit} label="Profil bearbeiten" onClick={onEditReq} />{!user.is_verified && <SettingsItem icon={BadgeCheck} label="Verifizierung beantragen" onClick={() => handleCloseAndOpen('verification')} highlight />}<SettingsItem icon={Share2} label="Profil teilen" onClick={handleShare} /><SettingsItem icon={Key} label="Passwort ändern" onClick={() => handleCloseAndOpen('password')} /></div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Rechtliches</h3><SettingsItem icon={Lock} label="Datenschutz" onClick={() => handleCloseAndOpen('privacy')} /><SettingsItem icon={FileText} label="Impressum" onClick={() => handleCloseAndOpen('imprint')} /></div>
                        <div className="pt-4 border-t border-border space-y-2"><SettingsItem icon={LogOut} label="Abmelden" onClick={onLogout} danger /><SettingsItem icon={Trash2} label="Account löschen" onClick={() => handleCloseAndOpen('delete-account')} danger /></div>
                        <div className="text-center text-muted-foreground text-xs py-4">v3.0.0 Live</div>
                    </div>
                </SafeErrorBoundary>
                {showToast && (<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-20">{showToast}</div>)}
            </div>
        </div>
    );
};
