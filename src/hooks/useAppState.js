import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

/**
 * useAppState — Extracts all App-level state and handlers into a single hook.
 * Keeps App.jsx focused on rendering only.
 */
export const useAppState = () => {
    const {
        authLoading, profileLoading,
        session, setSession, currentUserProfile, updateProfile,
        refreshProfile, unreadCount, resetUnreadCount, logout, unreadMessageUsersCount,
        setUnreadMessageUsersCount, checkUnreadMessages,
        isRecoveryMode, setIsRecoveryMode, isAuthCallback,
        pendingReactivationProfile, confirmReactivation
    } = useUser();
    const { addToast } = useToast();
    const { t } = useLanguage();

    // --- Navigation State ---
    const [activeTab, setActiveTab] = useState('home');
    const [viewedProfile, setViewedProfile] = useState(null);
    const [viewedClub, setViewedClub] = useState(null);
    const [profileHighlights, setProfileHighlights] = useState([]);
    const [profileArchivedHighlights, setProfileArchivedHighlights] = useState([]);

    // --- Media State ---
    const [activeVideo, setActiveVideo] = useState(null);
    const [activeCommentsVideo, setActiveCommentsVideo] = useState(null);

    // --- Modal State ---
    const [showUpload, setShowUpload] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [showWatchlist, setShowWatchlist] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- Interaction State ---
    const [activeChatPartner, setActiveChatPartner] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);
    const [isOnWatchlist, setIsOnWatchlist] = useState(false);
    const [comparePlayer, setComparePlayer] = useState(undefined);

    // --- PWA ---
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    // === Deep Linking ===
    const navigateToHash = useCallback((hash) => {
        window.location.hash = hash;
    }, []);

    // Use a ref for loadProfile to avoid stale closures in hashchange listener
    const loadProfileRef = useRef(null);

    const handleHashRoute = useCallback(async () => {
        const hash = window.location.hash;
        if (!hash) return;

        const parts = hash.replace('#', '').split('/');
        const route = parts[0];
        const param = parts[1];

        switch (route) {
            case 'profile':
                if (param && loadProfileRef.current) {
                    try {
                        const player = await api.fetchPlayerBySlug(param);
                        if (player) {
                            await loadProfileRef.current(player);
                        } else {
                            // Fallback for old UUID links (backwards compatibility)
                            const playerById = await api.fetchPlayerByUserId(param);
                            if (playerById) {
                                await loadProfileRef.current(playerById);
                            } else {
                                addToast("Profil nicht gefunden oder deaktiviert.", "info");
                            }
                        }
                    } catch (e) {
                        console.error("Deep link profile load failed:", e);
                    }
                }
                break;
            case 'video':
                if (param) {
                    try {
                        const videoData = await api.fetchVideoById(param);
                        if (videoData) {
                            setActiveVideo(videoData);
                        } else {
                            addToast("Video nicht gefunden oder gelöscht.", "info");
                        }
                    } catch (e) {
                        console.error("Deep link video load failed:", e);
                        addToast("Video konnte nicht geladen werden.", "error");
                    }
                }
                break;
            case 'search':
                setActiveTab('search');
                break;
            case 'directory':
                setActiveTab('directory');
                break;
            case 'teams':
                setActiveTab('teams');
                break;
            case 'admin':
                const sub = param || 'overview';
                setActiveTab(`admin_${sub}`);
                break;
            case 'inbox':
                setActiveTab('inbox');
                break;
            case 'settings':
                setActiveTab('settings');
                // The SettingsScreen will handle the sub-path via its own effect
                break;
            case 'privacy':
                setActiveTab('privacy');
                break;
            case 'impressum':
                setActiveTab('impressum');
                break;
            case 'chat':
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

    // === PWA Install ===
    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // === Listeners for Video Management ===
    useEffect(() => {
        const handleVideoDeleted = (e) => {
            const { videoId } = e.detail;
            setProfileHighlights(prev => prev.filter(v => v.id !== videoId));
            setProfileArchivedHighlights(prev => prev.filter(v => v.id !== videoId));
        };
        const handleVideoArchived = async (e) => {
            const { videoId } = e.detail;
            const archivedVideo = profileHighlights.find(v => v.id === videoId);
            if (archivedVideo) {
                setProfileHighlights(prev => prev.filter(v => v.id !== videoId));
                setProfileArchivedHighlights(prev => [{ ...archivedVideo, is_archived: true }, ...prev]);
            }
        };
        const handleVideoUnarchived = async (e) => {
            const { videoId } = e.detail;
            const unarchivedVideo = profileArchivedHighlights.find(v => v.id === videoId);
            if (unarchivedVideo) {
                setProfileArchivedHighlights(prev => prev.filter(v => v.id !== videoId));
                setProfileHighlights(prev => [{ ...unarchivedVideo, is_archived: false }, ...prev]);
            }
        };

        window.addEventListener('videoDeleted', handleVideoDeleted);
        window.addEventListener('videoArchived', handleVideoArchived);
        window.addEventListener('videoUnarchived', handleVideoUnarchived);
        return () => {
            window.removeEventListener('videoDeleted', handleVideoDeleted);
            window.removeEventListener('videoArchived', handleVideoArchived);
            window.removeEventListener('videoUnarchived', handleVideoUnarchived);
        };
    }, [profileHighlights, profileArchivedHighlights]);

    // === Handlers ===
    const handleLoginSuccess = async (sessionData) => {
        setSession(sessionData);
        setShowLogin(false);
        const profile = await refreshProfile(sessionData);
        if (profile && profile.full_name) {
            addToast(`Willkommen zurück, ${profile.first_name || profile.full_name}!`, 'success');
            setViewedProfile(null);
            setActiveTab('profile');
            navigateToHash(`profile/${sessionData.user.id}`);
        } else {
            addToast('Willkommen bei Cavio! 👋', 'success');
        }
    };

    // Bridge: after login, UserContext sets currentUserProfile asynchronously.
    // This effect auto-loads the profile into viewedProfile once it's ready.
    useEffect(() => {
        if (activeTab === 'profile' && session?.user?.id && currentUserProfile && !viewedProfile) {
            loadProfile(currentUserProfile);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, currentUserProfile?.id, session?.user?.id]);

    const handleInstallApp = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            setDeferredPrompt(null);
        } else {
            addToast(t('toast_app_installed'), 'info');
        }
    };

    const handlePushRequest = () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") addToast(t('toast_push_enabled'), 'success');
            });
        } else {
            addToast(t('toast_push_unsupported'), 'error');
        }
    };

    const loadProfile = async (targetPlayer) => {
        let p = { ...targetPlayer };
        // Always initialize follow state to safe defaults
        p.isFollowing = false;
        p.followsMe = false;
        p.mutualFriends = [];
        try {
            if (session) {
                // Resolve the current user's players_master.id for follows queries
                const myPlayerId = currentUserProfile?.id || await api.getPlayerIdFromUserId(session.user.id);

                // Both IDs must be players_master.id (matching FK constraints)
                if (myPlayerId && p.id) {
                    const [following, followsMe, mutuals] = await Promise.all([
                        api.checkIsFollowing(myPlayerId, p.id),
                        api.checkIsFollowing(p.id, myPlayerId),
                        api.getMutualFollowers(myPlayerId, p.id)
                    ]);
                    p.isFollowing = following;
                    p.followsMe = followsMe;
                    p.mutualFriends = mutuals;
                }
                setIsOnWatchlist(await api.checkIsOnWatchlist(session.user.id, p.id));
                // Record profile view (not own profile)
                if (p.user_id !== session.user.id) {
                    api.recordProfileView(p.id, session.user.id);
                }
            }
            // Count followers and following using players_master.id (matching FK constraints)
            p.followers_count = await api.getFollowersCount(p.id);
            p.following_count = await api.getFollowingCount(p.id);

            // SSOT Cleanup: Verify club_id is backed by an approved career station
            if (p.club_id) {
                try {
                    const { data: approvedStation } = await supabase
                        .from('career_history')
                        .select('id')
                        .eq('user_id', p.user_id)
                        .is('end_date', null)
                        .eq('verification_status', 'approved')
                        .maybeSingle();
                    
                    if (!approvedStation) {
                        console.log(`[SSOT Cleanup] Ghost club detected for ${p.full_name} - Wiping club_id`);
                        await supabase.from('players_master').update({ club_id: null }).eq('id', p.id);
                        p.club_id = null;
                        p.clubs = null;
                    }
                } catch (err) {
                    console.error("[SSOT Cleanup] Error for viewed profile:", err);
                }
            }

            setViewedProfile(p);

            // Dispatch event for search history tracking (only for other users' profiles)
            if (session?.user?.id !== p.user_id) {
                window.dispatchEvent(new CustomEvent('profileVisited', { detail: p }));
            }
            
            // Highlights & Archive
            const isOwn = session?.user?.id === p.user_id;
            const highlights = await api.fetchPlayerHighlights(p.id, false); // Normal highlights (archived=false)
            setProfileHighlights(highlights);
            
            if (isOwn) {
                const archived = await api.fetchPlayerHighlights(p.id, true); // Get ALL including archived
                setProfileArchivedHighlights(archived.filter(v => v.is_archived));
            } else {
                setProfileArchivedHighlights([]);
            }

            setActiveTab('profile');
            navigateToHash(`profile/${p.user_id}`);
        } catch (e) {
            console.error("Load profile failed:", e);
            addToast(t('toast_profile_error'), 'error');
        }
    };
    loadProfileRef.current = loadProfile;

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

    const handleFollow = async () => {
        if (!session || !viewedProfile) return;

        // Verify authenticated user identity fresh from Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) {
            addToast("Bitte erneut einloggen.", 'error');
            return;
        }

        // Resolve current user's players_master.id (FK-consistent)
        const myPlayerId = currentUserProfile?.id || await api.getPlayerIdFromUserId(authUser.id);
        if (!myPlayerId) {
            addToast("Profil nicht gefunden.", 'error');
            return;
        }
        const targetPlayerId = viewedProfile.id;

        // 1. Optimistic UI Update (Sofortiges Feedback)
        const previousIsFollowing = viewedProfile.isFollowing;
        const previousFollowerCount = viewedProfile.followers_count;

        setViewedProfile(prev => ({
            ...prev,
            isFollowing: !previousIsFollowing
        }));

        try {
            if (!previousIsFollowing) {
                await api.follow(myPlayerId, targetPlayerId);
                
                // Side effect: XP for target
                if (viewedProfile.id) {
                    api.awardXP(viewedProfile.id, 10, 'follow', `${myPlayerId}_${targetPlayerId}`);
                }
            } else {
                await api.unfollow(myPlayerId, targetPlayerId);
            }
        } catch (error) {
            // 2. Rollback bei Fehler
            console.error("EXAKTER FOLLOW ERROR:", error);
            addToast(error?.message || "Aktion fehlgeschlagen", 'error');
            setViewedProfile(prev => ({
                ...prev,
                isFollowing: previousIsFollowing,
                followers_count: previousFollowerCount
            }));
        }
    };

    const handleWatchlistToggle = async () => {
        if (!session || !viewedProfile) return;

        try {
            if (isOnWatchlist) {
                await api.removeFromWatchlist(session.user.id, viewedProfile.id);
                setIsOnWatchlist(false);
                addToast(t('toast_watchlist_removed'), 'info');
            } else {
                await api.addToWatchlist(session.user.id, viewedProfile.id);
                setIsOnWatchlist(true);
                addToast(`${viewedProfile.full_name} ${t('toast_watchlist_added')}`, 'success');
                try {
                    const myProfileId = await api.getPlayerIdFromUserId(session.user.id);
                    await api.createNotification({
                        userId: viewedProfile.id,
                        actorId: myProfileId,
                        type: 'watchlist_add'
                    });
                } catch (_) { /* non-critical */ }
                // Award XP to the player
                api.awardXP(viewedProfile.id, 50, 'watchlist_add', session.user.id);
                setShowCelebration(true);
            }
        } catch (e) {
            addToast(t('toast_watchlist_error'), 'error');
        }
    };

    const handleDeleteVideo = async (video) => {
        try {
            await api.deleteHighlight(video.id);
            await api.deleteVideoFiles(video.video_url, video.thumbnail_url);
            setProfileHighlights(prev => prev.filter(v => v.id !== video.id));
            setProfileArchivedHighlights(prev => prev.filter(v => v.id !== video.id));
            addToast(t('toast_video_deleted'), 'success');
        } catch (e) {
            console.error('Video delete failed:', e);
            addToast(t('toast_video_delete_error'), 'error');
        }
    };

    const handleUnarchiveVideo = async (videoId) => {
        try {
            await api.unarchiveHighlight(videoId);
            addToast('Video wiederhergestellt.', 'success');
            window.dispatchEvent(new CustomEvent('videoUnarchived', { detail: { videoId } }));
        } catch (e) {
            addToast('Fehler beim Wiederherstellen.', 'error');
        }
    };

    const handlePinVideo = async (video) => {
        if (!session || !viewedProfile) return;
        const isPinned = video.is_pinned;

        if (!isPinned) {
            // Check max 3 limit
            const pinnedCount = profileHighlights.filter(v => v.is_pinned).length;
            if (pinnedCount >= 3) {
                addToast('Maximal 3 Highlights anpinnbar. Bitte entpinne zuerst ein anderes Video.', 'error');
                return;
            }
        }

        // Optimistic UI update
        const updatedHighlights = profileHighlights.map(v =>
            v.id === video.id
                ? { ...v, is_pinned: !isPinned, pinned_at: !isPinned ? new Date().toISOString() : null }
                : v
        ).sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            if (a.is_pinned && b.is_pinned) return new Date(b.pinned_at || 0) - new Date(a.pinned_at || 0);
            return new Date(b.created_at) - new Date(a.created_at);
        });
        setProfileHighlights(updatedHighlights);

        try {
            if (isPinned) {
                await api.unpinHighlight(video.id);
            } else {
                await api.pinHighlight(video.id);
            }
        } catch (e) {
            console.error('Pin/Unpin failed:', e);
            addToast('Fehler beim Anpinnen/Entpinnen.', 'error');
            // Rollback
            const rolled = profileHighlights.map(v =>
                v.id === video.id ? { ...v, is_pinned: isPinned, pinned_at: video.pinned_at } : v
            );
            setProfileHighlights(rolled);
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'inbox') checkUnreadMessages();
        if (tab === 'home') navigateToHash('');
        else if (tab === 'search') navigateToHash('search');
        else if (tab === 'inbox') navigateToHash('inbox');
        else if (tab === 'directory') navigateToHash('directory');
        else if (tab === 'teams') navigateToHash('teams');
        else if (tab === 'settings') navigateToHash('settings');
        else if (tab === 'privacy') navigateToHash('privacy');
        else if (tab === 'impressum') navigateToHash('impressum');
        else if (tab.startsWith('admin_')) navigateToHash(`admin/${tab.replace('admin_', '')}`);
    };

    return {
        // Auth
        authLoading, profileLoading,

        // User context
        session, currentUserProfile, updateProfile, refreshProfile,
        unreadCount, resetUnreadCount, logout, unreadMessageUsersCount,
        setUnreadMessageUsersCount, checkUnreadMessages,
        isRecoveryMode, setIsRecoveryMode,
        isAuthCallback,
        pendingReactivationProfile, confirmReactivation,

        // Navigation
        activeTab, switchTab, navigateToHash,

        // Profile
        viewedProfile, setViewedProfile, profileHighlights, setProfileHighlights,
        profileArchivedHighlights, setProfileArchivedHighlights,
        loadProfile, handleProfileTabClick, isOnWatchlist,

        // Club
        viewedClub, setViewedClub,

        // Media
        activeVideo, setActiveVideo,
        activeCommentsVideo, setActiveCommentsVideo,

        // Modals
        showUpload, setShowUpload,
        showLogin, setShowLogin,
        showCelebration, setShowCelebration,
        showEditProfile, setShowEditProfile,
        showSettings, setShowSettings,
        showFollowersModal, setShowFollowersModal,
        showFollowingModal, setShowFollowingModal,
        showVerificationModal, setShowVerificationModal,
        showWatchlist, setShowWatchlist,
        showMap, setShowMap,
        showDeactivate, setShowDeactivate,

        // Interaction
        activeChatPartner, setActiveChatPartner,
        reportTarget, setReportTarget,
        comparePlayer, setComparePlayer,

        // Handlers
        handleLoginSuccess, handleFollow, handleWatchlistToggle,
        handleDeleteVideo, handleUnarchiveVideo, handlePinVideo, handleInstallApp, handlePushRequest,

        // PWA
        deferredPrompt,

        // Sidebar
        isSidebarOpen, setIsSidebarOpen,
    };
};
