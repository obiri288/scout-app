import React, { useState } from 'react';
import { X, Settings, ChevronRight, Download, Bell, RefreshCw, Edit, BadgeCheck, Share2, Key, Lock, FileText, LogOut, Trash2, Globe } from 'lucide-react';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';

export const SettingsModal = ({ onClose, onLogout, installPrompt, onInstallApp, onRequestPush, user, onEditReq, onVerifyReq }) => {
    const [showToast, setShowToast] = useState(null);
    const { addToast } = useToast();
    const { lang, toggleLanguage, t } = useLanguage();

    if (!user) return null;

    const showFeedback = (msg) => { setShowToast(msg); setTimeout(() => setShowToast(null), 2000); };

    const handleClearCache = () => {
        try { localStorage.clear(); addToast('Cache geleert!', 'success'); }
        catch (e) { addToast('Fehler beim Leeren', 'error'); }
    };

    const handleShare = () => {
        if (user?.id) {
            navigator.clipboard.writeText(`https://scoutvision.app/u/${user.id}`);
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
        <button onClick={onClick} className={`w-full p-3 flex items-center justify-between group transition-all rounded-xl ${danger ? 'hover:bg-red-500/10' : highlight ? 'bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20' : 'hover:bg-white/5'}`}>
            <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${danger ? 'bg-red-500/20 text-red-500' : highlight ? 'bg-blue-500 text-white' : 'bg-white/5 text-zinc-400 group-hover:text-white'}`}><Icon size={18} /></div><span className={`font-medium text-sm ${danger ? 'text-red-500' : highlight ? 'text-blue-100' : 'text-zinc-200 group-hover:text-white'}`}>{label}</span></div>
            <ChevronRight size={16} className={danger ? 'text-red-500' : highlight ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
        </button>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-80 max-w-[85vw] h-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18} /> {t('settings_title')}</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button>
                </div>
                <SafeErrorBoundary>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">{t('settings_language')}</h3>
                            <button onClick={toggleLanguage} className="w-full p-3 flex items-center justify-between group transition-all rounded-xl hover:bg-white/5">
                                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-white/5 text-zinc-400 group-hover:text-white"><Globe size={18} /></div><span className="font-medium text-sm text-zinc-200 group-hover:text-white">{lang === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}</span></div>
                                <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-full">{lang === 'de' ? 'EN →' : 'DE →'}</span>
                            </button>
                        </div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">App</h3><SettingsItem icon={Download} label={t('settings_install')} onClick={onInstallApp} /><SettingsItem icon={Bell} label={t('settings_push')} onClick={onRequestPush} /><SettingsItem icon={RefreshCw} label="Cache leeren" onClick={handleClearCache} /></div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Account</h3><SettingsItem icon={Edit} label="Profil bearbeiten" onClick={onEditReq} />{!user.is_verified && <SettingsItem icon={BadgeCheck} label="Verifizierung beantragen" onClick={onVerifyReq} highlight />}<SettingsItem icon={Share2} label="Profil teilen" onClick={handleShare} /><SettingsItem icon={Key} label="Passwort ändern" onClick={() => showFeedback("Email gesendet")} /></div>
                        <div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Rechtliches</h3><SettingsItem icon={Lock} label="Datenschutz" onClick={() => showFeedback("Geöffnet")} /><SettingsItem icon={FileText} label="Impressum" onClick={() => showFeedback("Geöffnet")} /></div>
                        <div className="pt-4 border-t border-white/10 space-y-2"><SettingsItem icon={LogOut} label="Abmelden" onClick={onLogout} danger /><SettingsItem icon={Trash2} label="Account löschen" onClick={handleDeleteAccount} danger /></div>
                        <div className="text-center text-zinc-700 text-xs py-4">v3.0.0 Live</div>
                    </div>
                </SafeErrorBoundary>
                {showToast && (<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-20">{showToast}</div>)}
            </div>
        </div>
    );
};
