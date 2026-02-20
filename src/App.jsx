import React, { lazy, Suspense } from 'react';
import { Home, Search, Plus, Mail, User, LogIn, X, MapPin } from 'lucide-react';
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
            </Suspense>
        </div>
    );
};

export default App;