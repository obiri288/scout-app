import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

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
    // Live notifications list — updated by Realtime, shared across components
    const [liveNotifications, setLiveNotifications] = useState([]);
    const { addToast } = useToast();

    // Detect if we're in an auth callback flow (email confirmation redirect)
    const [isAuthCallback, setIsAuthCallback] = useState(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        const pathname = window.location.pathname;
        return hash.includes('access_token') || hash.includes('type=signup') || 
               hash.includes('type=recovery') || hash.includes('type=email') ||
               search.includes('code=') || search.includes('token=') ||
               pathname.includes('/update-password');
    });

    // Stable ref so the callback never goes stale
    const sessionRef = useRef(session);
    sessionRef.current = session;

    // Guard against concurrent fetches
    const fetchingRef = useRef(false);

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
                .select('*, clubs(*)')
                .eq('user_id', s.user.id)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (data?.is_deactivated) {
                setPendingReactivationProfile(data);
                return null;
            }

            setCurrentUserProfile(data);
            return data;
        } catch (e) {
            console.error("Profile fetch error:", e.message);
            return null;
        } finally {
            setProfileLoading(false);
            fetchingRef.current = false;
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
            setSession(s);
            if (!s) {
                setCurrentUserProfile(null);
                setUnreadCount(0);
            }

            // Auth callback: clean up URL tokens after session is established
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && isAuthCallback) {
                setIsAuthCallback(false);
                // Clean URL: remove hash tokens & query params left by Supabase
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Auto-fetch profile when session user changes (primitive dep only)
    useEffect(() => {
        if (session?.user?.id) {
            fetchOrCreateProfile(session);
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
            }, (payload) => {
                const newNote = payload.new;
                setUnreadCount(prev => prev + 1);
                // Push to live list so NotificationBell updates without refetch
                setLiveNotifications(prev => [newNote, ...prev]);
                // Show a subtle in-app toast
                addToast(
                    newNote.title || newNote.message || 'Neue Benachrichtigung',
                    'info',
                    4000
                );
            })
            .subscribe();

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
            supabase.removeChannel(msgChannel);
            window.removeEventListener('chat-read-sync', handleSync);
        };
    }, [session?.user?.id, checkUnreadMessages]);

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
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
