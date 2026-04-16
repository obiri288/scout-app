import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Plus, Mail, User, LogIn, X, MapPin, Loader2, Bell, Lock, Key, FileText, Trash2 } from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { useToast } from './contexts/ToastContext';
import * as api from './lib/api';

// Eagerly loaded — visible on first render
import { CookieBanner } from './components/CookieBanner';
import { LandingPage } from './components/LandingPage';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { InboxScreen } from './components/InboxScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ClubScreen } from './components/ClubScreen';
import { CelebrationAnimation } from './components/CelebrationAnimation';
import { NotificationBell } from './components/NotificationBell';

// Lazy loaded — only fetched when needed
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const UploadModal = lazy(() => import('./components/UploadModal').then(m => ({ default: m.UploadModal })));
const EditProfileModal = lazy(() => import('./components/EditProfileModal').then(m => ({ default: m.EditProfileModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const CommentsModal = lazy(() => import('./components/CommentsModal').then(m => ({ default: m.CommentsModal })));
const ChatWindow = lazy(() => import('./components/ChatWindow').then(m => ({ default: m.ChatWindow })));
const FollowerListModal = lazy(() => import('./components/FollowerListModal').then(m => ({ default: m.FollowerListModal })));
const FollowingListModal = lazy(() => import('./components/FollowingListModal').then(m => ({ default: m.FollowingListModal })));
const ReportModal = lazy(() => import('./components/ReportModal').then(m => ({ default: m.ReportModal })));
const VerificationModal = lazy(() => import('./components/VerificationModal').then(m => ({ default: m.VerificationModal })));
const WatchlistModal = lazy(() => import('./components/WatchlistModal').then(m => ({ default: m.WatchlistModal })));
const CompareModal = lazy(() => import('./components/CompareModal').then(m => ({ default: m.CompareModal })));
const BlockUserModal = lazy(() => import('./components/BlockUserModal').then(m => ({ default: m.BlockUserModal })));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const NamePromptModal = lazy(() => import('./components/NamePromptModal').then(m => ({ default: m.NamePromptModal })));
const UpdatePasswordModal = lazy(() => import('./components/UpdatePasswordModal').then(m => ({ default: m.UpdatePasswordModal })));
const UpdateEmailModal = lazy(() => import('./components/UpdateEmailModal').then(m => ({ default: m.UpdateEmailModal })));
const DeactivateAccountModal = lazy(() => import('./components/DeactivateAccountModal').then(m => ({ default: m.DeactivateAccountModal })));
const ReactivateAccountModal = lazy(() => import('./components/ReactivateAccountModal').then(m => ({ default: m.ReactivateAccountModal })));
import { EmailConfirmedPage } from './components/EmailConfirmedPage';

const LazyFallback = () => (
    <div className="fixed inset-0 z-[10000] bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const PushSettingsModal = ({ onClose }) => {
    const [toggles, setToggles] = useState({ follower: true, likes: true, messages: true });
    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-border">
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Bell size={18} /> Push-Benachrichtigungen</h2>
                    <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {['Neue Follower', 'Neue Likes', 'Neue Nachrichten'].map((label, i) => {
                        const key = ['follower', 'likes', 'messages'][i];
                        return (
                            <div key={key} className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-xl border border-border">
                                <span className="font-medium text-foreground">{label}</span>
                                <button onClick={() => setToggles(p => ({ ...p, [key]: !p[key] }))} className={`w-12 h-6 rounded-full transition-colors relative ${toggles[key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${toggles[key] ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ onClose }) => {
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        if (pwd !== confirm) return setError('Passwörter stimmen nicht überein.');
        if (pwd.length < 6) return setError('Passwort muss mindestens 6 Zeichen lang sein.');
        setLoading(true);
        // Mock backend call
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            setTimeout(onClose, 2000);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-border">
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Key size={18} /> Passwort ändern</h2>
                    <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>
                <div className="p-6">
                    {success ? (
                        <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto"><Lock size={32} /></div>
                            <h3 className="text-xl font-bold text-foreground">Passwort aktualisiert</h3>
                            <p className="text-muted-foreground text-sm">Dein Passwort wurde erfolgreich geändert.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 text-sm animate-in fade-in">{error}</div>}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Neues Passwort</label>
                                <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full bg-slate-100 dark:bg-black/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Passwort bestätigen</label>
                                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-slate-100 dark:bg-black/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center mt-6">
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Passwort speichern'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const legalContent = {
    'Datenschutz': {
        updated: '01.03.2026',
        sections: [
            { title: '1. Verantwortlicher', text: 'Verantwortlich für die Datenverarbeitung ist ProBase UG (haftungsbeschränkt). Bei Fragen zum Datenschutz wende dich an: datenschutz@probase.app' },
            { title: '2. Welche Daten wir erheben', text: 'Bei der Registrierung erheben wir deine E-Mail-Adresse und dein Passwort (verschlüsselt). Im Profil kannst du freiwillig Name, Position, Geburtsdatum, Vereinszugehörigkeit, Standort und ein Profilbild angeben. Beim Hochladen von Videos speichern wir die Videodateien und zugehörige Metadaten (Skill-Tags, Titel).' },
            { title: '3. Zweck der Verarbeitung', text: 'Deine Daten werden zur Bereitstellung der App-Funktionen verwendet: Profilerstellung, Video-Feed, Suchfunktion, Messaging, Watchlist und Benachrichtigungen. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).' },
            { title: '4. Datenweitergabe', text: 'Wir nutzen Supabase (EU-Region) als Datenbank- und Authentifizierungsanbieter. Videos werden auf Supabase Storage gespeichert. Deine Daten werden nicht an Dritte zu Werbezwecken weitergegeben.' },
            { title: '5. Deine Rechte', text: 'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Die vollständige Account-Löschung ist direkt in den App-Einstellungen möglich und löscht unwiderruflich alle deine Daten, Videos und Nachrichten.' },
            { title: '6. Speicherdauer', text: 'Deine Daten werden gespeichert, solange dein Account besteht. Bei Löschung des Accounts werden alle personenbezogenen Daten innerhalb von 30 Tagen vollständig entfernt.' },
            { title: '7. Cookies', text: 'Wir verwenden nur technisch notwendige Cookies für die Authentifizierung und Session-Verwaltung. Es werden keine Tracking-Cookies verwendet.' },
        ]
    },
    'Impressum': {
        updated: '01.03.2026',
        sections: [
            { title: 'Angaben gemäß § 5 TMG', text: 'ProBase UG (haftungsbeschränkt)\nMusterstraße 1\n10115 Berlin\nDeutschland' },
            { title: 'Kontakt', text: 'E-Mail: info@probase.app\nTelefon: +49 (0) 30 12345678' },
            { title: 'Vertretungsberechtigter Geschäftsführer', text: '[Name des Geschäftsführers]' },
            { title: 'Registereintrag', text: 'Handelsregister: Amtsgericht Berlin-Charlottenburg\nRegisternummer: HRB [Nummer]' },
            { title: 'Umsatzsteuer-ID', text: 'Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:\nDE [Nummer]' },
            { title: 'Haftung für Inhalte', text: 'Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nutzer-generierte Inhalte (Videos, Kommentare, Nachrichten) liegen in der Verantwortung der jeweiligen Nutzer. Wir prüfen gemeldete Inhalte schnellstmöglich.' },
        ]
    },
    'AGB': {
        updated: '01.03.2026',
        sections: [
            { title: '1. Geltungsbereich', text: 'Diese Nutzungsbedingungen gelten für die Nutzung der ProBase-App. Mit der Registrierung akzeptierst du diese Bedingungen.' },
            { title: '2. Kostenlose Nutzung', text: 'Die Nutzung der App ist für Spieler dauerhaft und vollständig kostenlos. Es entstehen keine versteckten Kosten oder Abo-Gebühren.' },
            { title: '3. Nutzer-Inhalte', text: 'Du bist für alle von dir hochgeladenen Inhalte (Videos, Texte, Bilder) verantwortlich. Es ist verboten, Inhalte hochzuladen, die gegen geltendes Recht verstoßen, beleidigend, diskriminierend oder pornografisch sind, oder die Rechte Dritter verletzen.' },
            { title: '4. Melden & Blockieren', text: 'Du kannst unangemessene Inhalte und Nutzer melden. Wir prüfen jede Meldung und behalten uns vor, Inhalte zu entfernen und Accounts zu sperren. Die Block-Funktion ermöglicht dir, Nachrichten und Inhalte bestimmter Nutzer auszublenden.' },
            { title: '5. Account-Löschung', text: 'Du kannst deinen Account jederzeit vollständig und unwiderruflich in den App-Einstellungen löschen. Dabei werden alle deine Daten, Videos und Nachrichten dauerhaft entfernt.' },
            { title: '6. Haftungsausschluss', text: 'ProBase übernimmt keine Garantie für die Richtigkeit von Nutzerangaben. Die Plattform dient der Sichtbarkeit von Spielern und stellt keine Vermittlungsgarantie dar.' },
        ]
    }
};

const LegalModal = ({ title, onClose }) => {
    const content = legalContent[title] || legalContent['Datenschutz'];
    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-[80vh] h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-border">
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><FileText size={18} /> {title}</h2>
                    <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto text-foreground/80 space-y-6 text-sm leading-relaxed">
                    <p className="text-muted-foreground text-xs">Zuletzt aktualisiert: {content.updated}</p>
                    {content.sections.map((s, i) => (
                        <div key={i}>
                            <h4 className="font-bold text-foreground text-base mb-2">{s.title}</h4>
                            <p className="whitespace-pre-line">{s.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DeleteAccountModal = ({ onClose, session, onDeleted }) => {
    const [input, setInput] = useState('');
    const [deleting, setDeleting] = useState(false);
    const { addToast } = useToast();

    const handleDelete = async () => {
        if (input !== 'LÖSCHEN' || !session) return;
        setDeleting(true);
        try {
            await api.deleteUserAccount();
            // Local state reset happens via onDeleted() calling logout()
            addToast('Dein Account wurde vollständig gelöscht.', 'info');
            onDeleted();
        } catch (e) {
            console.error('Account deletion failed:', e);
            addToast('Fehler beim Löschen des Accounts. Bitte kontaktiere den Support.', 'error');
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={!deleting ? onClose : undefined}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-red-500/30">
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-red-500 flex items-center gap-2"><Trash2 size={18} /> Danger Zone</h2>
                    <button onClick={onClose} disabled={deleting} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <h3 className="font-bold text-red-500 mb-2">Account unwiderruflich löschen</h3>
                        <p className="text-sm text-foreground/70">Wenn du deinen Account löschst, werden alle deine Daten, Videos und Nachrichten dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/70">Tippe <span className="text-foreground font-bold select-all tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-black/50 rounded">LÖSCHEN</span> um zu bestätigen:</label>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={deleting} className="w-full bg-slate-100 dark:bg-black/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50" placeholder="LÖSCHEN" />
                    </div>
                    <button disabled={input !== 'LÖSCHEN' || deleting} onClick={handleDelete} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-red-300/50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                        {deleting ? <><Loader2 size={18} className="animate-spin" /> Wird gelöscht...</> : 'Account endgültig löschen'}
                    </button>
                    <button onClick={onClose} disabled={deleting} className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-bold py-3 rounded-xl transition disabled:opacity-50">
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const {
        authLoading, profileLoading,
        session, currentUserProfile, updateProfile, refreshProfile,
        unreadCount, resetUnreadCount, logout,
        activeTab, switchTab, navigateToHash,
        viewedProfile, setViewedProfile, profileHighlights,
        loadProfile, handleProfileTabClick, isOnWatchlist,
        viewedClub, setViewedClub,
        activeVideo, setActiveVideo,
        activeCommentsVideo, setActiveCommentsVideo,
        showUpload, setShowUpload,
        showLogin, setShowLogin,
        showEditProfile, setShowEditProfile,
        showSettings, setShowSettings,
        showFollowersModal, setShowFollowersModal,
        showFollowingModal, setShowFollowingModal,
        showVerificationModal, setShowVerificationModal,
        activeChatPartner, setActiveChatPartner,
        reportTarget, setReportTarget,
        comparePlayer, setComparePlayer,
        handleLoginSuccess, handleFollow, handleWatchlistToggle,
        handleDeleteVideo, handleInstallApp, handlePushRequest,
        showCelebration, setShowCelebration,
        deferredPrompt,
        isRecoveryMode, setIsRecoveryMode,
        isAuthCallback,
        pendingReactivationProfile, confirmReactivation,
        showDeactivate, setShowDeactivate
    } = useAppState();

    const { addToast } = useToast();
    const [activeSettingsModal, setActiveSettingsModal] = useState(null);
    const [blockTarget, setBlockTarget] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showLanding, setShowLanding] = useState(true);

    // Watch for successful email changes based on localStorage pending state
    useEffect(() => {
        if (session?.user?.email) {
            const pendingEmail = localStorage.getItem('pending_email_update');
            if (pendingEmail && session.user.email === pendingEmail) {
                localStorage.removeItem('pending_email_update');
                addToast('E-Mail-Adresse erfolgreich aktualisiert!', 'success');
            }
        }
    }, [session?.user?.email, addToast]);

    // If we're strictly on the email-confirmed standalone page
    if (window.location.pathname === '/auth/email-confirmed') {
        return <EmailConfirmedPage />;
    }

    // If we are on the password recovery redirect page
    if (window.location.pathname === '/update-password') {
        // Render the rest of the app or a blank screen behind the modal
        return (
            <div className="min-h-screen bg-background">
                <UpdatePasswordModal 
                    onClose={() => { window.location.pathname = '/'; }} 
                    onSuccess={() => { window.location.pathname = '/'; }} 
                />
            </div>
        );
    }

    // Block ALL rendering until auth state AND initial profile fetch are resolved
    // Also block if a reactivation is pending (force modal decision)
    if (authLoading || isAuthCallback || pendingReactivationProfile || (session && !currentUserProfile && profileLoading)) {
        if (pendingReactivationProfile) {
            return (
                <Suspense fallback={<SplashScreen />}>
                    <ReactivateAccountModal 
                        profile={pendingReactivationProfile} 
                        onConfirm={confirmReactivation}
                        onLogout={logout}
                    />
                </Suspense>
            );
        }
        return <SplashScreen />;
    }

    // Check for onboarding: session exists but no profile yet
    const needsOnboarding = session && !currentUserProfile;
    const needsNamePrompt = session && currentUserProfile && (!currentUserProfile.full_name || currentUserProfile.full_name === 'Neuer Spieler');

    // Show landing page for unauthenticated users
    const isLanding = showLanding && !session;

    // Render the landing page if the user is unauthenticated
    if (isLanding) {
        return (
            <>
                <LandingPage
                    onLogin={() => setShowLogin(true)}
                    onRegister={() => setShowLogin(true)}
                />
                <Suspense fallback={<LazyFallback />}>
                    {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={(s) => { handleLoginSuccess(s); setShowLanding(false); }} onLegalOpen={(key) => { setShowLogin(false); setActiveSettingsModal(key); }} />}
                </Suspense>
            </>
        );
    }


    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-cyan-500/30 pb-32">
            {/* Celebration Animation */}
            <CelebrationAnimation active={showCelebration} onComplete={() => setShowCelebration(false)} />
            {/* Onboarding Wizard */}
            {(showOnboarding || needsOnboarding) && session && (
                <Suspense fallback={<LazyFallback />}>
                    <OnboardingWizard
                        session={session}
                        onComplete={(player) => {
                            updateProfile(player);
                            refreshProfile();
                            setShowOnboarding(false);
                            loadProfile(player);
                        }}
                    />
                </Suspense>
            )}
            {/* Name Enforcement Prompt */}
            {needsNamePrompt && !needsOnboarding && !showOnboarding && (
                <Suspense fallback={<LazyFallback />}>
                    <NamePromptModal />
                </Suspense>
            )}

            {activeTab === 'home' && <HomeScreen onVideoClick={setActiveVideo} session={session} onLikeReq={() => setShowLogin(true)} onCommentClick={setActiveCommentsVideo} onUserClick={loadProfile} onReportReq={(id, type) => setReportTarget({ id, type })} />}
            {activeTab === 'search' && <SearchScreen onUserClick={loadProfile} />}
            {activeTab === 'inbox' && <InboxScreen session={session} onSelectChat={setActiveChatPartner} onUserClick={loadProfile} onLoginReq={() => setShowLogin(true)} />}

            {activeTab === 'profile' && (
                <ProfileScreen
                    player={viewedProfile}
                    highlights={profileHighlights}
                    onVideoClick={setActiveVideo}
                    onDeleteVideo={handleDeleteVideo}
                    isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)}
                    onBack={() => { switchTab('home'); }}
                    onLogout={() => { logout(); switchTab('home'); }}
                    onEditReq={() => setShowEditProfile(true)}
                    onSettingsReq={() => setShowSettings(true)}
                    onChatReq={() => { if (!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }}
                    onClubClick={(c) => { setViewedClub(c); switchTab('club'); }}
                    onAdminReq={() => switchTab('admin')}
                    onFollow={handleFollow}
                    onShowFollowers={() => setShowFollowersModal(true)}
                    onShowFollowing={() => setShowFollowingModal(true)}
                    onLoginReq={() => setShowLogin(true)}
                    onWatchlistToggle={handleWatchlistToggle}
                    isOnWatchlist={isOnWatchlist}
                    session={session}
                    currentUserProfile={currentUserProfile}
                    onCompare={() => setComparePlayer(viewedProfile)}
                    onPlayerClick={loadProfile}
                    onReport={(target) => setReportTarget(target)}
                    onBlock={(target) => setBlockTarget(target)}
                    onUpload={() => setShowUpload(true)}
                />
            )}

            {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => switchTab('home')} onUserClick={loadProfile} />}
            {activeTab === 'admin' && <Suspense fallback={<LazyFallback />}><AdminDashboard session={session} onClose={() => switchTab('home')} onUserClick={loadProfile} /></Suspense>}

            {/* Notification Bell — fixed top-right */}
            {session && currentUserProfile && (
                <div className="fixed top-12 right-4 z-[8500]">
                    <NotificationBell />
                </div>
            )}

            {/* Decoupled Upload FAB */}
            <div className="fixed bottom-24 right-4 sm:right-6 sm:bottom-28 z-[9000]">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => session ? setShowUpload(true) : setShowLogin(true)}
                    className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.3)] border border-white/20 group"
                >
                    <Plus size={28} className="text-white group-hover:rotate-90 transition-transform duration-500" strokeWidth={2.5} />
                </motion.button>
            </div>

            {/* Smart Minimal Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-card/80 backdrop-blur-2xl border border-border py-3 px-6 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_60px_rgba(16,185,129,0.05)] flex justify-between items-center z-[9999] pointer-events-auto">
                {/* Home */}
                <button onClick={() => switchTab('home')} className={`relative flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out ${activeTab === 'home' ? 'bg-cyan-500/15 text-cyan-400 px-4' : 'text-muted-foreground hover:text-foreground/70 hover:bg-white/5'}`}>
                    <Home size={22} className={`transition-transform duration-500 ${activeTab === 'home' ? 'scale-110' : ''}`} />
                    <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ${activeTab === 'home' ? 'w-10 opacity-100 ml-1' : 'w-0 opacity-0'}`}>Home</span>
                </button>

                {/* Search */}
                <button onClick={() => switchTab('search')} className={`relative flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out ${activeTab === 'search' ? 'bg-cyan-500/15 text-cyan-400 px-4' : 'text-muted-foreground hover:text-foreground/70 hover:bg-white/5'}`}>
                    <Search size={22} className={`transition-transform duration-500 ${activeTab === 'search' ? 'scale-110' : ''}`} />
                    <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ${activeTab === 'search' ? 'w-14 opacity-100 ml-1' : 'w-0 opacity-0'}`}>Suchen</span>
                </button>

                {/* Inbox */}
                <button onClick={() => { switchTab('inbox'); resetUnreadCount(); }} className={`relative flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out ${activeTab === 'inbox' ? 'bg-cyan-500/15 text-cyan-400 px-4' : 'text-muted-foreground hover:text-foreground/70 hover:bg-white/5'}`}>
                    <div className="relative">
                        <Mail size={22} className={`transition-transform duration-500 ${activeTab === 'inbox' ? 'scale-110' : ''}`} />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-sm border border-card">{unreadCount}</span>}
                    </div>
                    <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ${activeTab === 'inbox' ? 'w-10 opacity-100 ml-1' : 'w-0 opacity-0'}`}>Inbox</span>
                </button>

                {/* Profile */}
                <button onClick={handleProfileTabClick} className={`relative flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out ${activeTab === 'profile' ? 'bg-cyan-500/15 text-cyan-400 px-4' : 'text-muted-foreground hover:text-foreground/70 hover:bg-white/5'}`}>
                    <User size={22} className={`transition-transform duration-500 ${activeTab === 'profile' ? 'scale-110' : ''}`} />
                    <span className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-500 ${activeTab === 'profile' ? 'w-10 opacity-100 ml-1' : 'w-0 opacity-0'}`}>Profil</span>
                </button>
            </div>

            <CookieBanner />

            {/* Video Fullscreen */}
            {activeVideo && (
                <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 z-10 p-3 bg-white/5 border border-border rounded-full hover:bg-white/10 backdrop-blur-md transition-all duration-300 active:scale-95 text-muted-foreground hover:text-white"><X size={24} /></button>
                    <video src={activeVideo.video_url} controls autoPlay className="max-w-full max-h-[85vh] rounded-[2rem] shadow-2xl shadow-cyan-500/5 border border-border" />
                </div>
            )}

            {/* Lazy-loaded Modals */}
            <Suspense fallback={<LazyFallback />}>
                {showEditProfile && currentUserProfile && (
                    <EditProfileModal
                        player={currentUserProfile}
                        onClose={() => setShowEditProfile(false)}
                        onUpdate={(updated) => { updateProfile(updated); setViewedProfile(updated); }}
                    />
                )}

                {showSettings && (
                    <SettingsModal
                        onClose={() => setShowSettings(false)}
                        onLogout={() => { logout(); setShowSettings(false); switchTab('home'); }}
                        installPrompt={deferredPrompt}
                        onInstallApp={handleInstallApp}
                        onRequestPush={handlePushRequest}
                        user={currentUserProfile}
                        onEditReq={() => { setShowSettings(false); setShowEditProfile(true); }}
                        onVerifyReq={() => { setShowSettings(false); setShowVerificationModal(true); }}
                        onCloseAndOpen={(target) => {
                            setShowSettings(false);
                            if (target === 'verification') {
                                setShowVerificationModal(true);
                            } else if (target === 'deactivate-account') {
                                setShowDeactivate(true);
                            } else {
                                setActiveSettingsModal(target);
                            }
                        }}
                    />
                )}

                {showVerificationModal && (
                    <VerificationModal
                        onClose={() => setShowVerificationModal(false)}
                        onUploadComplete={() => refreshProfile()}
                    />
                )}

                {showFollowersModal && viewedProfile && (
                    <FollowerListModal
                        userId={viewedProfile.id}
                        onClose={() => setShowFollowersModal(false)}
                        onUserClick={(p) => { setShowFollowersModal(false); loadProfile(p); }}
                    />
                )}

                {showFollowingModal && viewedProfile && (
                    <FollowingListModal
                        userId={viewedProfile.id}
                        onClose={() => setShowFollowingModal(false)}
                        onUserClick={(p) => { setShowFollowingModal(false); loadProfile(p); }}
                    />
                )}

                {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
                {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} currentUserProfile={currentUserProfile} onClose={() => setActiveChatPartner(null)} onUserClick={loadProfile} onReport={(target) => { setActiveChatPartner(null); setReportTarget(target); }} onBlock={(target) => { setActiveChatPartner(null); setBlockTarget(target); }} />}
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} onLegalOpen={(key) => { setShowLogin(false); setActiveSettingsModal(key); }} />}
                {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if (currentUserProfile) loadProfile(currentUserProfile); }} />}
                {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
                {comparePlayer !== undefined && <CompareModal initialPlayer={comparePlayer} onClose={() => setComparePlayer(undefined)} />}
                {blockTarget && session && <BlockUserModal targetUser={blockTarget} session={session} onClose={() => setBlockTarget(null)} onBlocked={() => setBlockTarget(null)} />}
                {isRecoveryMode && (
                    <UpdatePasswordModal
                        onClose={() => setIsRecoveryMode(false)}
                        onSuccess={() => {
                            setIsRecoveryMode(false);
                            // Redirect to profile/dashboard after successful password update
                            if (currentUserProfile) {
                                loadProfile(currentUserProfile);
                            } else {
                                switchTab('home');
                            }
                        }}
                    />
                )}

                {/* Custom Sub-Modals */}
                {activeSettingsModal === 'push' && <PushSettingsModal onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'password' && <ChangePasswordModal onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'email' && <UpdateEmailModal onClose={() => setActiveSettingsModal(null)} session={session} />}
                {activeSettingsModal === 'privacy' && <LegalModal title="Datenschutz" onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'imprint' && <LegalModal title="Impressum" onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'tos' && <LegalModal title="AGB" onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'delete-account' && (
                    <DeleteAccountModal
                        onClose={() => setActiveSettingsModal(null)}
                        session={session}
                        onDeleted={() => {
                            logout();
                            setActiveSettingsModal(null);
                            switchTab('home');
                        }}
                    />
                )}
                {activeSettingsModal === 'deactivate-account' && (
                    <DeactivateAccountModal
                        onClose={() => setActiveSettingsModal(null)}
                        user={currentUserProfile}
                        onDeactivated={() => {
                            logout();
                            setActiveSettingsModal(null);
                            switchTab('home');
                        }}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default App;