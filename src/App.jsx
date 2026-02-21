import React, { lazy, Suspense, useState } from 'react';
import { Home, Search, Plus, Mail, User, LogIn, X, MapPin, Loader2, Bell, Lock, Key, FileText, Trash2 } from 'lucide-react';
import { useAppState } from './hooks/useAppState';

// Eagerly loaded — visible on first render
import { CookieBanner } from './components/CookieBanner';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { InboxScreen } from './components/InboxScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ClubScreen } from './components/ClubScreen';

// Lazy loaded — only fetched when needed
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const UploadModal = lazy(() => import('./components/UploadModal').then(m => ({ default: m.UploadModal })));
const EditProfileModal = lazy(() => import('./components/EditProfileModal').then(m => ({ default: m.EditProfileModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const CommentsModal = lazy(() => import('./components/CommentsModal').then(m => ({ default: m.CommentsModal })));
const ChatWindow = lazy(() => import('./components/ChatWindow').then(m => ({ default: m.ChatWindow })));
const FollowerListModal = lazy(() => import('./components/FollowerListModal').then(m => ({ default: m.FollowerListModal })));
const ReportModal = lazy(() => import('./components/ReportModal').then(m => ({ default: m.ReportModal })));
const VerificationModal = lazy(() => import('./components/VerificationModal').then(m => ({ default: m.VerificationModal })));
const WatchlistModal = lazy(() => import('./components/WatchlistModal').then(m => ({ default: m.WatchlistModal })));
const CompareModal = lazy(() => import('./components/CompareModal').then(m => ({ default: m.CompareModal })));
const MapScreen = lazy(() => import('./components/MapScreen').then(m => ({ default: m.MapScreen })));

const LazyFallback = () => (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const PushSettingsModal = ({ onClose }) => {
    const [toggles, setToggles] = useState({ follower: true, likes: true, messages: true });
    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Bell size={18} /> Push-Benachrichtigungen</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {['Neue Follower', 'Neue Likes', 'Neue Nachrichten'].map((label, i) => {
                        const key = ['follower', 'likes', 'messages'][i];
                        return (
                            <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <span className="font-medium text-zinc-200">{label}</span>
                                <button onClick={() => setToggles(p => ({ ...p, [key]: !p[key] }))} className={`w-12 h-6 rounded-full transition-colors relative ${toggles[key] ? 'bg-blue-600' : 'bg-zinc-700'}`}>
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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Key size={18} /> Passwort ändern</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="p-6">
                    {success ? (
                        <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto"><Lock size={32} /></div>
                            <h3 className="text-xl font-bold text-white">Passwort aktualisiert</h3>
                            <p className="text-zinc-400 text-sm">Dein Passwort wurde erfolgreich geändert.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 text-sm animate-in fade-in">{error}</div>}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Neues Passwort</label>
                                <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Passwort bestätigen</label>
                                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" required />
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

const LegalModal = ({ title, onClose }) => (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
        <div className="relative w-full max-w-2xl bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-[80vh] h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} /> {title}</h2>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto text-zinc-300 space-y-6 text-sm leading-relaxed">
                <h3 className="text-xl font-bold text-white">{title} der Scout App</h3>
                <p>Zuletzt aktualisiert: Heute</p>
                <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
                <h4 className="font-bold text-white text-base">1. Allgemeine Informationen</h4>
                <p>Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.</p>
                <h4 className="font-bold text-white text-base">2. Datennutzung</h4>
                <p>Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.</p>
                <p>Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.</p>
            </div>
        </div>
    </div>
);

const DeleteAccountModal = ({ onClose, onConfirm }) => {
    const [input, setInput] = useState('');
    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-auto h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-red-500/30">
                <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-red-500 flex items-center gap-2"><Trash2 size={18} /> Danger Zone</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <h3 className="font-bold text-red-500 mb-2">Account unwiderruflich löschen</h3>
                        <p className="text-sm text-zinc-300">Wenn du deinen Account löschst, werden alle deine Daten, Videos und Nachrichten dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Tippe <span className="text-white font-bold select-all tracking-wider px-2 py-0.5 bg-black/50 rounded">LÖSCHEN</span> um zu bestätigen:</label>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="LÖSCHEN" />
                    </div>
                    <button disabled={input !== 'LÖSCHEN'} onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-red-300/50 text-white font-bold py-3 rounded-xl transition">
                        Account endgültig löschen
                    </button>
                    <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition">
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const {
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
        showVerificationModal, setShowVerificationModal,
        showMap, setShowMap,
        activeChatPartner, setActiveChatPartner,
        reportTarget, setReportTarget,
        comparePlayer, setComparePlayer,
        handleLoginSuccess, handleFollow, handleWatchlistToggle,
        handleDeleteVideo, handleInstallApp, handlePushRequest,
        deferredPrompt,
    } = useAppState();

    const [activeSettingsModal, setActiveSettingsModal] = useState(null);

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 pb-20">
            {!session && (
                <button onClick={() => setShowLogin(true)} className="fixed top-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white/20 transition hover:scale-105 active:scale-95">
                    <LogIn size={14} /> Login
                </button>
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
                    onLoginReq={() => setShowLogin(true)}
                    onCreateProfile={() => { }}
                    onWatchlistToggle={handleWatchlistToggle}
                    isOnWatchlist={isOnWatchlist}
                    session={session}
                    onCompare={() => setComparePlayer(viewedProfile)}
                    onPlayerClick={loadProfile}
                />
            )}

            {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => switchTab('home')} onUserClick={loadProfile} />}
            {activeTab === 'admin' && <Suspense fallback={<LazyFallback />}><AdminDashboard session={session} /></Suspense>}

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-[9999] rounded-3xl shadow-2xl shadow-black/50 pointer-events-auto">
                <button onClick={() => switchTab('home')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'home' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Home size={24} /></button>
                <button onClick={() => switchTab('search')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'search' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Search size={24} /></button>
                <button onClick={() => setShowMap(true)} className="flex flex-col items-center gap-1 transition duration-300 text-zinc-500 hover:text-zinc-300"><MapPin size={22} /></button>
                <div className="relative -top-8">
                    <button onClick={() => session ? setShowUpload(true) : setShowLogin(true)} className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-black transition-transform hover:scale-105 active:scale-95">
                        <Plus size={28} className="text-white" strokeWidth={3} />
                    </button>
                </div>
                <button onClick={() => { switchTab('inbox'); resetUnreadCount(); }} className={`flex flex-col items-center gap-1 transition duration-300 relative ${activeTab === 'inbox' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <div className="relative">
                        <Mail size={24} />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-sm border border-black">{unreadCount}</span>}
                    </div>
                </button>
                <button onClick={handleProfileTabClick} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'profile' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><User size={24} /></button>
            </div>

            <CookieBanner />

            {/* Video Fullscreen */}
            {activeVideo && (
                <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition"><X size={24} className="text-white" /></button>
                    <video src={activeVideo.video_url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />
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
                        userId={viewedProfile.user_id}
                        onClose={() => setShowFollowersModal(false)}
                        onUserClick={(p) => { setShowFollowersModal(false); loadProfile(p); }}
                    />
                )}

                {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
                {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} onClose={() => setActiveChatPartner(null)} onUserClick={loadProfile} />}
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
                {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if (currentUserProfile) loadProfile(currentUserProfile); }} />}
                {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
                {comparePlayer !== undefined && <CompareModal initialPlayer={comparePlayer} onClose={() => setComparePlayer(undefined)} />}
                {showMap && <MapScreen onClose={() => setShowMap(false)} onUserClick={loadProfile} />}

                {/* Custom Sub-Modals */}
                {activeSettingsModal === 'push' && <PushSettingsModal onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'password' && <ChangePasswordModal onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'privacy' && <LegalModal title="Datenschutz" onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'imprint' && <LegalModal title="Impressum" onClose={() => setActiveSettingsModal(null)} />}
                {activeSettingsModal === 'delete-account' && (
                    <DeleteAccountModal
                        onClose={() => setActiveSettingsModal(null)}
                        onConfirm={() => {
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