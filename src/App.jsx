import React, { useState, useEffect, useCallback } from 'react';
import { Home, Search, Plus, Mail, User, LogIn, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useUser } from './contexts/UserContext';
import { useToast } from './contexts/ToastContext';

// Components
import { CookieBanner } from './components/CookieBanner';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { InboxScreen } from './components/InboxScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ClubScreen } from './components/ClubScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { UploadModal } from './components/UploadModal';
import { EditProfileModal } from './components/EditProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { CommentsModal } from './components/CommentsModal';
import { ChatWindow } from './components/ChatWindow';
import { FollowerListModal } from './components/FollowerListModal';
import { ReportModal } from './components/ReportModal';
import { VerificationModal } from './components/VerificationModal';
import { WatchlistModal } from './components/WatchlistModal';
import { CompareModal } from './components/CompareModal';

const App = () => {
    const {
        session, setSession, currentUserProfile, updateProfile,
        refreshProfile, unreadCount, resetUnreadCount, logout
    } = useUser();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('home');
    const [viewedProfile, setViewedProfile] = useState(null);
    const [viewedClub, setViewedClub] = useState(null);
    const [profileHighlights, setProfileHighlights] = useState([]);
    const [activeVideo, setActiveVideo] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [activeCommentsVideo, setActiveCommentsVideo] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [activeChatPartner, setActiveChatPartner] = useState(null);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [showWatchlist, setShowWatchlist] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isOnWatchlist, setIsOnWatchlist] = useState(false);
    const [comparePlayer, setComparePlayer] = useState(undefined); // undefined=closed, null=open empty, player=open with player

    // --- Deep Linking via Hash ---
    const navigateToHash = useCallback((hash) => {
        window.location.hash = hash;
    }, []);

    const handleHashRoute = useCallback(async () => {
        const hash = window.location.hash;
        if (!hash) return;

        const parts = hash.replace('#', '').split('/');
        const route = parts[0];
        const param = parts[1];

        switch (route) {
            case 'profile':
                if (param) {
                    try {
                        const { data } = await supabase.from('players_master')
                            .select('*, clubs(*)')
                            .eq('user_id', param)
                            .maybeSingle();
                        if (data) {
                            await loadProfile(data);
                        }
                    } catch (e) {
                        console.error("Deep link profile load failed:", e);
                    }
                }
                break;
            case 'search':
                setActiveTab('search');
                break;
            case 'inbox':
                setActiveTab('inbox');
                break;
            default:
                break;
        }
    }, []);

    useEffect(() => {
        handleHashRoute();
        window.addEventListener('hashchange', handleHashRoute);
        return () => window.removeEventListener('hashchange', handleHashRoute);
    }, [handleHashRoute]);

    // PWA install prompt
    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // --- Handlers ---
    const handleLoginSuccess = async (sessionData) => {
        setSession(sessionData);
        setShowLogin(false);
        refreshProfile();
        setViewedProfile(null);
        setActiveTab('profile');
        navigateToHash('profile');
    };

    const handleInstallApp = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            setDeferredPrompt(null);
        } else {
            addToast("App ist bereits installiert oder wird nicht unterstützt.", 'info');
        }
    };

    const handlePushRequest = () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") addToast("Push-Benachrichtigungen aktiviert!", 'success');
            });
        } else {
            addToast("Push wird nicht unterstützt.", 'error');
        }
    };

    const loadProfile = async (targetPlayer) => {
        let p = { ...targetPlayer };
        try {
            if (session) {
                const { data } = await supabase.from('follows').select('*')
                    .match({ follower_id: session.user.id, following_id: p.user_id })
                    .maybeSingle();
                p.isFollowing = !!data;

                // Check watchlist status
                const { data: wlData } = await supabase.from('scout_watchlist')
                    .select('id')
                    .match({ scout_id: session.user.id, player_id: p.id })
                    .maybeSingle();
                setIsOnWatchlist(!!wlData);
            }
            const { count } = await supabase.from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', p.user_id);
            p.followers_count = count || 0;

            setViewedProfile(p);
            const { data } = await supabase.from('media_highlights')
                .select('*')
                .eq('player_id', p.id)
                .order('created_at', { ascending: false });
            setProfileHighlights(data || []);
            setActiveTab('profile');
            navigateToHash(`profile/${p.user_id}`);
        } catch (e) {
            console.error("Load profile failed:", e);
            addToast("Profil konnte nicht geladen werden.", 'error');
        }
    };

    const handleProfileTabClick = () => {
        if (!session) {
            setShowLogin(true);
            return;
        }
        if (currentUserProfile) {
            loadProfile(currentUserProfile);
        } else {
            refreshProfile();
            setViewedProfile(null);
            setActiveTab('profile');
        }
    };

    // --- Follow System ---
    const handleFollow = async () => {
        if (!session) { setShowLogin(true); return; }
        if (!viewedProfile) return;

        const wasFollowing = viewedProfile.isFollowing;

        // Optimistic update
        setViewedProfile(prev => ({
            ...prev,
            isFollowing: !wasFollowing,
            followers_count: wasFollowing ? (prev.followers_count - 1) : (prev.followers_count + 1)
        }));

        try {
            if (wasFollowing) {
                // Unfollow
                const { error } = await supabase.from('follows')
                    .delete()
                    .match({ follower_id: session.user.id, following_id: viewedProfile.user_id });
                if (error) throw error;
            } else {
                // Follow
                const { error } = await supabase.from('follows')
                    .insert({ follower_id: session.user.id, following_id: viewedProfile.user_id });
                if (error) throw error;

                // Create notification for target user
                try {
                    await supabase.from('notifications').insert({
                        user_id: viewedProfile.user_id,
                        actor_id: session.user.id,
                        type: 'follow',
                        is_read: false,
                    });
                } catch (notifErr) {
                    console.warn("Notification insert failed:", notifErr);
                }

                addToast(`Du folgst jetzt ${viewedProfile.full_name}!`, 'success');
            }
        } catch (e) {
            // Revert optimistic update
            setViewedProfile(prev => ({
                ...prev,
                isFollowing: wasFollowing,
                followers_count: wasFollowing ? (prev.followers_count + 1) : (prev.followers_count - 1)
            }));
            addToast("Follow-Aktion fehlgeschlagen.", 'error');
        }
    };

    // --- Watchlist Toggle ---
    const handleWatchlistToggle = async () => {
        if (!session || !viewedProfile) return;

        try {
            if (isOnWatchlist) {
                const { error } = await supabase.from('scout_watchlist')
                    .delete()
                    .match({ scout_id: session.user.id, player_id: viewedProfile.id });
                if (error) throw error;
                setIsOnWatchlist(false);
                addToast("Von Merkliste entfernt.", 'info');
            } else {
                const { error } = await supabase.from('scout_watchlist')
                    .insert({ scout_id: session.user.id, player_id: viewedProfile.id });
                if (error) throw error;
                setIsOnWatchlist(true);
                addToast(`${viewedProfile.full_name} zur Merkliste hinzugefügt! 📋`, 'success');
            }
        } catch (e) {
            addToast("Merkliste-Aktion fehlgeschlagen.", 'error');
        }
    };

    // --- Delete Video ---
    const handleDeleteVideo = async (video) => {
        // Optimistic UI update
        setProfileHighlights(prev => prev.filter(v => v.id !== video.id));

        try {
            // Delete DB row
            const { error } = await supabase.from('media_highlights').delete().eq('id', video.id);
            if (error) throw error;

            // Delete storage file
            if (video.video_url) {
                const path = video.video_url.split('/player-videos/').pop();
                if (path) {
                    await supabase.storage.from('player-videos').remove([decodeURIComponent(path)]);
                }
            }
            if (video.thumbnail_url && !video.thumbnail_url.includes('placehold.co')) {
                const thumbPath = video.thumbnail_url.split('/player-videos/').pop();
                if (thumbPath) {
                    await supabase.storage.from('player-videos').remove([decodeURIComponent(thumbPath)]);
                }
            }

            addToast('Video gelöscht.', 'success');
        } catch (e) {
            // Revert optimistic update
            setProfileHighlights(prev => [...prev, video].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            addToast('Video konnte nicht gelöscht werden.', 'error');
        }
    };

    // --- Tab Navigation ---
    const switchTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'home') navigateToHash('');
        else if (tab === 'search') navigateToHash('search');
        else if (tab === 'inbox') navigateToHash('inbox');
    };

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
                    onBack={() => { setActiveTab('home'); navigateToHash(''); }}
                    onLogout={() => { logout(); setActiveTab('home'); }}
                    onEditReq={() => setShowEditProfile(true)}
                    onSettingsReq={() => setShowSettings(true)}
                    onChatReq={() => { if (!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }}
                    onClubClick={(c) => { setViewedClub(c); setActiveTab('club'); }}
                    onAdminReq={() => setActiveTab('admin')}
                    onFollow={handleFollow}
                    onShowFollowers={() => setShowFollowersModal(true)}
                    onLoginReq={() => setShowLogin(true)}
                    onCreateProfile={() => { }}
                    onWatchlistToggle={handleWatchlistToggle}
                    isOnWatchlist={isOnWatchlist}
                    session={session}
                    onCompare={() => setComparePlayer(viewedProfile)}
                />
            )}

            {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => setActiveTab('home')} onUserClick={loadProfile} />}
            {activeTab === 'admin' && <AdminDashboard session={session} />}

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-[9999] rounded-3xl shadow-2xl shadow-black/50 pointer-events-auto">
                <button onClick={() => switchTab('home')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'home' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Home size={24} /></button>
                <button onClick={() => switchTab('search')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'search' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Search size={24} /></button>
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

            {/* Modals */}
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
                    onLogout={() => { logout(); setShowSettings(false); setActiveTab('home'); }}
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
        </div>
    );
};

export default App;