import { useState, useCallback, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as api from '../lib/api';

/**
 * useAppState — Extracts all App-level state and handlers into a single hook.
 * Keeps App.jsx focused on rendering only.
 */
export const useAppState = () => {
    const {
        session, setSession, currentUserProfile, updateProfile,
        refreshProfile, unreadCount, resetUnreadCount, logout
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
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
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
                p.isFollowing = await api.checkIsFollowing(session.user.id, p.user_id);
                setIsOnWatchlist(await api.checkIsOnWatchlist(session.user.id, p.id));
            }
            p.followers_count = await api.getFollowersCount(p.user_id);

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
        if (!session) { setShowLogin(true); return; }
        if (!viewedProfile) return;

        const wasFollowing = viewedProfile.isFollowing;

        setViewedProfile(prev => ({
            ...prev,
            isFollowing: !wasFollowing,
            followers_count: wasFollowing ? (prev.followers_count - 1) : (prev.followers_count + 1)
        }));

        try {
            if (wasFollowing) {
                await api.unfollow(session.user.id, viewedProfile.user_id);
            } else {
                await api.follow(session.user.id, viewedProfile.user_id);
                try {
                    await api.createNotification({
                        userId: viewedProfile.user_id,
                        actorId: session.user.id,
                        type: 'follow'
                    });
                } catch (notifErr) {
                    console.warn("Notification insert failed:", notifErr);
                }
                addToast(`${t('toast_follow')} ${viewedProfile.full_name}!`, 'success');
            }
        } catch (e) {
            setViewedProfile(prev => ({
                ...prev,
                isFollowing: wasFollowing,
                followers_count: wasFollowing ? (prev.followers_count + 1) : (prev.followers_count - 1)
            }));
            addToast(t('toast_follow_error'), 'error');
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
            }
        } catch (e) {
            addToast(t('toast_watchlist_error'), 'error');
        }
    };

    const handleDeleteVideo = async (video) => {
        setProfileHighlights(prev => prev.filter(v => v.id !== video.id));

        try {
            await api.deleteHighlight(video.id);
            await api.deleteVideoFiles(video.video_url, video.thumbnail_url);
            addToast(t('toast_video_deleted'), 'success');
        } catch (e) {
            setProfileHighlights(prev => [...prev, video].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
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
        // User context
        session, currentUserProfile, updateProfile, refreshProfile,
        unreadCount, resetUnreadCount, logout,

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
        showEditProfile, setShowEditProfile,
        showSettings, setShowSettings,
        showFollowersModal, setShowFollowersModal,
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
