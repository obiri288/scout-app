import { useState, useCallback, useEffect } from 'react';
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
        refreshProfile, unreadCount, resetUnreadCount, logout,
        isRecoveryMode, setIsRecoveryMode, isAuthCallback
    } = useUser();
    const { addToast } = useToast();
    const { t } = useLanguage();

    // --- Navigation State ---
    const [activeTab, setActiveTab] = useState('home');
    const [viewedProfile, setViewedProfile] = useState(null);
    const [viewedClub, setViewedClub] = useState(null);
    const [profileHighlights, setProfileHighlights] = useState([]);

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
                        const player = await api.fetchPlayerByUserId(param);
                        if (player) await loadProfile(player);
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

    // === PWA Install ===
    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // === Handlers ===
    const handleLoginSuccess = async (sessionData) => {
        setSession(sessionData);
        setShowLogin(false);
        // Don't call refreshProfile() — UserContext auto-fetch handles it via session?.user?.id dep
        setViewedProfile(null);
        setActiveTab('profile');
        navigateToHash(`profile/${sessionData.user.id}`);
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
        try {
            if (session) {
                // Resolve the current user's players_master.id for follows queries
                const myPlayerId = currentUserProfile?.id || await api.getPlayerIdFromUserId(session.user.id);

                // Both IDs must be players_master.id (matching FK constraints)
                p.isFollowing = await api.checkIsFollowing(myPlayerId, p.id);
                setIsOnWatchlist(await api.checkIsOnWatchlist(session.user.id, p.id));
                // Record profile view (not own profile)
                if (p.user_id !== session.user.id) {
                    api.recordProfileView(p.id, session.user.id);
                }
            }
            // Count followers and following using players_master.id (matching FK constraints)
            p.followers_count = await api.getFollowersCount(p.id);
            p.following_count = await api.getFollowingCount(p.id);

            setViewedProfile(p);
            setProfileHighlights(await api.fetchPlayerHighlights(p.id));
            setActiveTab('profile');
            navigateToHash(`profile/${p.user_id}`);
        } catch (e) {
            console.error("Load profile failed:", e);
            addToast(t('toast_profile_error'), 'error');
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
            isFollowing: !previousIsFollowing,
            followers_count: previousIsFollowing ? (prev.followers_count - 1) : (prev.followers_count + 1)
        }));

        try {
            if (!previousIsFollowing) {
                // User möchte folgen -> REINER INSERT
                const { error } = await supabase
                    .from('follows')
                    .insert({ follower_id: myPlayerId, following_id: targetPlayerId });

                if (error) throw error;
            } else {
                // User möchte entfolgen
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .match({ follower_id: myPlayerId, following_id: targetPlayerId });

                if (error) throw error;
            }
        } catch (error) {
            // 2. Rollback bei Fehler
            console.error("EXAKTER FOLLOW ERROR:", error);
            addToast(error?.message || error?.details || error?.hint || JSON.stringify(error) || "Unbekannter Fehler", 'error');
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
                    await api.createNotification({
                        userId: viewedProfile.user_id,
                        actorId: session.user.id,
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
            addToast(t('toast_video_deleted'), 'success');
        } catch (e) {
            console.error('Video delete failed:', e);
            addToast(t('toast_video_delete_error'), 'error');
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'home') navigateToHash('');
        else if (tab === 'search') navigateToHash('search');
        else if (tab === 'inbox') navigateToHash('inbox');
    };

    return {
        // Auth
        authLoading, profileLoading,

        // User context
        session, currentUserProfile, updateProfile, refreshProfile,
        unreadCount, resetUnreadCount, logout,
        isRecoveryMode, setIsRecoveryMode,
        isAuthCallback,

        // Navigation
        activeTab, switchTab, navigateToHash,

        // Profile
        viewedProfile, setViewedProfile, profileHighlights, setProfileHighlights,
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

        // Interaction
        activeChatPartner, setActiveChatPartner,
        reportTarget, setReportTarget,
        comparePlayer, setComparePlayer,

        // Handlers
        handleLoginSuccess, handleFollow, handleWatchlistToggle,
        handleDeleteVideo, handleInstallApp, handlePushRequest,

        // PWA
        deferredPrompt,
    };
};
