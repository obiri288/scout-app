import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';
import * as api from '../lib/api';

const UserContext = createContext(null);

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};

export const UserProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [pendingReactivationProfile, setPendingReactivationProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageUsersCount, setUnreadMessageUsersCount] = useState(0);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [liveNotifications, setLiveNotifications] = useState([]);

    const [hiddenUserIds, setHiddenUserIds] = useState([]);
    const { addToast } = useToast();

    // Detect if we're in an auth callback flow (email confirmation redirect)
    const [isAuthCallback, setIsAuthCallback] = useState(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        const pathname = window.location.pathname;
        return hash.includes('access_token') || hash.includes('type=signup') || 
               hash.includes('type=recovery') || hash.includes('type=email') ||
               search.includes('code=') || search.includes('token=') ||
               pathname.includes('/update-password') ||
               pathname.includes('/auth-callback') ||
               pathname.includes('/welcome');
    });

    // Stable ref so the callback never goes stale
    const sessionRef = useRef(session);
    sessionRef.current = session;

    // Guard against concurrent fetches
    const fetchingRef = useRef(false);
    const prevEmailRef = useRef(null);

    // Fetch or auto-create profile
    const fetchOrCreateProfile = useCallback(async (userSession) => {
        const s = userSession || sessionRef.current;
        if (!s?.user?.id) {
            setCurrentUserProfile(null);
            return null;
        }
        // Prevent concurrent fetches
        if (fetchingRef.current) return null;
        fetchingRef.current = true;
        setProfileLoading(true);
        try {
            let { data, error: fetchError } = await supabase.from('players_master')
                .select('*, clubs(*), club_teams(*, clubs(*)), career_history(*)')
                .eq('user_id', s.user.id)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (data?.is_deactivated) {
                setPendingReactivationProfile(data);
                return null;
            }

            setCurrentUserProfile(data);
            if (data) enforceSSOTCleanup(data);
            return data;
        } catch (e) {
            console.error("Profile fetch error:", e.message);
            return null;
        } finally {
            setProfileLoading(false);
            fetchingRef.current = false;
        }
    }, []);
    
    // Enforce Single Source of Truth: Cleanup ghost club data
    // If user has a club_id but no approved current career station, reset it
    const enforceSSOTCleanup = useCallback(async (profile) => {
        if (!profile || (!profile.club_id && !profile.current_team_id)) return;
        
        try {
            // Check if there is an approved station without an end_date (current station)
            const { data, error } = await supabase
                .from('career_history')
                .select('id')
                .eq('user_id', profile.user_id)
                .is('end_date', null)
                .eq('verification_status', 'approved')
                .maybeSingle();
                
            if (error) throw error;
            
            // If no approved current station exists -> Ghost Data detected
            if (!data) {
                console.log("[SSOT Cleanup] Ghost club detected for user", profile.id, "- Wiping club_id and current_team_id");
                const { error: updateError } = await supabase
                    .from('players_master')
                    .update({ club_id: null, current_team_id: null })
                    .eq('id', profile.id);
                
                if (updateError) throw updateError;
                
                // Update local state to reflect the cleanup
                setCurrentUserProfile(prev => prev ? { ...prev, club_id: null, clubs: null, current_team_id: null, club_teams: null } : null);
            }
        } catch (err) {
            console.error("[SSOT Cleanup] Failed:", err.message);
        }
    }, []);

    // Update profile (called after edit) — syncs everywhere
    const updateProfile = useCallback((updatedProfile) => {
        setCurrentUserProfile(updatedProfile);
    }, []);

    // Auth initialization
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveryMode(true);
            }
            
            // Detect Email Change for Toast
            if (s?.user?.email && prevEmailRef.current && s.user.email !== prevEmailRef.current) {
                addToast('E-Mail-Adresse erfolgreich geändert!', 'success');
            }
            if (s?.user?.email) {
                prevEmailRef.current = s.user.email;
            }

            setSession(s);
            if (!s) {
                setCurrentUserProfile(null);
                setUnreadCount(0);

                prevEmailRef.current = null;
            }

            // Auth callback: clean up URL tokens after session is established
            // Note: If on /auth-callback or /welcome, we let the UI handle the cleanup and state reset
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && isAuthCallback) {
                const isDedicatedCallbackPage = window.location.pathname.includes('/auth-callback') || window.location.pathname.includes('/welcome');
                
                if (!isDedicatedCallbackPage) {
                    setIsAuthCallback(false);
                    // Clean URL: remove hash tokens & query params left by Supabase
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState(null, '', cleanUrl);
                }
            }
        });

        // Focus listener to refresh session when coming back to tab
        // This ensures changes on other devices (e.g. phone) are picked up
        const handleFocus = async () => {
            if (fetchingRef.current) return;
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) setSession(currentSession);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (session?.user?.id) {
            fetchOrCreateProfile(session);
            api.fetchHiddenUserIds(session.user.id).then(setHiddenUserIds).catch(console.error);
        } else {
            setHiddenUserIds([]);
        }
    }, [session?.user?.id]);

    const checkUnreadMessages = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase.from('direct_messages')
                .select('sender_id')
                .eq('receiver_id', session.user.id)
                .eq('is_read', false);
            
            if (error) throw error;
            
            const uniqueSenders = new Set((data || []).map(msg => msg.sender_id)).size;
            setUnreadMessageUsersCount(uniqueSenders);
        } catch (e) {
            console.error("Error checking unread messages:", e);
        }
    }, [session?.user?.id]);



    // Realtime notifications & messages listener
    useEffect(() => {
        if (!session?.user?.id || !currentUserProfile?.id) return;

        const channel = supabase
            .channel('notifications-global')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUserProfile.id}`
            }, async (payload) => {
                const newNote = payload.new;
                
                // Fetch actor details for the new notification to show names/avatars immediately
                if (newNote.actor_id) {
                    const { data: actorData } = await supabase
                        .from('players_master')
                        .select('full_name, username, avatar_url')
                        .eq('id', newNote.actor_id)
                        .single();
                    if (actorData) {
                        newNote.actor = actorData;
                    }
                }

                setUnreadCount(prev => (prev || 0) + 1);
                setLiveNotifications(prev => [newNote, ...prev]);
                
                // Construct toast message
                const name = newNote.actor?.full_name || newNote.actor?.username || 'Jemand';
                let toastMsg = newNote.message;
                if (!toastMsg) {
                    if (newNote.type === 'follow') toastMsg = `${name} folgt dir jetzt`;
                    else if (newNote.type === 'like') toastMsg = `${name} gefällt dein Video`;
                    else toastMsg = 'Neue Benachrichtigung';
                }

                addToast(toastMsg, 'info', 4000);
            })
            .subscribe();

        // Admin Reports Realtime
        let adminChannel = null;
        if (currentUserProfile?.role === 'admin') {
            // Admin global sync disabled
        }

        // Fetch initial unread count
        supabase.from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserProfile.id)
            .eq('is_read', false)
            .then(({ count }) => {
                setUnreadCount(count || 0);
            });

        // Realtime listener for direct_messages
        // We listen for any event on direct_messages where we might be the receiver
        const msgChannel = supabase
            .channel('messages-global')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'direct_messages',
                filter: `receiver_id=eq.${session.user.id}`
            }, (payload) => {
                checkUnreadMessages();
            })
            .subscribe();
        
        checkUnreadMessages();

        const handleSync = () => checkUnreadMessages();
        window.addEventListener('chat-read-sync', handleSync);

        return () => {
            supabase.removeChannel(channel);
            if (adminChannel) supabase.removeChannel(adminChannel);
            supabase.removeChannel(msgChannel);
            window.removeEventListener('chat-read-sync', handleSync);
        };
    }, [session?.user?.id, currentUserProfile?.id, currentUserProfile?.role, checkUnreadMessages]);

    const resetUnreadCount = useCallback(() => {
        setUnreadCount(0);
        // Mark all as read in background
        if (currentUserProfile?.id) {
            supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', currentUserProfile.id)
                .eq('is_read', false)
                .then(() => { });
        }
    }, [currentUserProfile?.id]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setCurrentUserProfile(null);
        setPendingReactivationProfile(null);
        setUnreadCount(0);
        setUnreadMessageUsersCount(0);
    }, []);

    const confirmReactivation = useCallback(async () => {
        if (!pendingReactivationProfile) return;
        
        try {
            const { error } = await supabase.from('players_master')
                .update({ is_deactivated: false })
                .eq('id', pendingReactivationProfile.id);
                
            if (error) throw error;
            
            const reactivated = { ...pendingReactivationProfile, is_deactivated: false };
            setCurrentUserProfile(reactivated);
            setPendingReactivationProfile(null);
            addToast('Account erfolgreich reaktiviert! Willkommen zurück.', 'success');
        } catch (e) {
            console.error("Reactivation failed:", e);
            addToast('Reaktivierung fehlgeschlagen. Bitte versuche es erneut.', 'error');
        }
    }, [pendingReactivationProfile, addToast]);

    const handleBlockUser = useCallback(async (targetId) => {
        if (!session?.user?.id) return;
        try {
            await api.blockUser(session.user.id, targetId);
            setHiddenUserIds(prev => [...prev, targetId]);
        } catch (e) {
            console.error("Error blocking user:", e);
            throw e;
        }
    }, [session?.user?.id]);

    const handleUnblockUser = useCallback(async (targetId) => {
        if (!session?.user?.id) return;
        try {
            await api.unblockUser(session.user.id, targetId);
            setHiddenUserIds(prev => prev.filter(id => id !== targetId));
        } catch (e) {
            console.error("Error unblocking user:", e);
            throw e;
        }
    }, [session?.user?.id]);

    const value = {
        authLoading,
        session,
        setSession,
        currentUserProfile,
        pendingReactivationProfile,
        profileLoading,
        updateProfile,
        confirmReactivation,
        refreshProfile: fetchOrCreateProfile,
        unreadCount,
        resetUnreadCount,

        unreadMessageUsersCount,
        setUnreadMessageUsersCount,
        checkUnreadMessages,
        liveNotifications,
        setLiveNotifications,
        logout,
        isRecoveryMode,
        setIsRecoveryMode,
        isAuthCallback,
        setIsAuthCallback,
        hiddenUserIds,
        handleBlockUser,
        handleUnblockUser,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
