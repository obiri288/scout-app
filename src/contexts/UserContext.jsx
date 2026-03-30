import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
    const [profileLoading, setProfileLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);

    // Detect if we're in an auth callback flow (email confirmation redirect)
    const [isAuthCallback, setIsAuthCallback] = useState(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        return hash.includes('access_token') || hash.includes('type=signup') || 
               hash.includes('type=recovery') || hash.includes('type=email') ||
               search.includes('code=') || search.includes('token=');
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
            let { data } = await supabase.from('players_master')
                .select('*, clubs(*)')
                .eq('user_id', s.user.id)
                .maybeSingle();

            if (!data) {
                // Username aus user_metadata lesen (wird bei Registrierung gesetzt)
                const metaUsername = s.user.user_metadata?.username || null;
                const newProfile = {
                    user_id: s.user.id,
                    full_name: '',
                    position_primary: 'ZM',
                    transfer_status: 'Gebunden',
                    followers_count: 0,
                    is_verified: false,
                    is_admin: false,
                    ...(metaUsername ? { username: metaUsername } : {})
                };
                const { data: created, error } = await supabase
                    .from('players_master')
                    .upsert(newProfile)
                    .select('*, clubs(*)')
                    .single();
                if (error) throw error;
                data = created;
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

    // Realtime notifications listener
    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel('notifications-global')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${session.user.id}`
            }, (payload) => {
                setUnreadCount(prev => prev + 1);
            })
            .subscribe();

        // Fetch initial unread count
        supabase.from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false)
            .then(({ count }) => {
                setUnreadCount(count || 0);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    const resetUnreadCount = useCallback(() => {
        setUnreadCount(0);
        // Mark all as read in background
        const userId = sessionRef.current?.user?.id;
        if (userId) {
            supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false)
                .then(() => { });
        }
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setCurrentUserProfile(null);
        setUnreadCount(0);
    }, []);

    const value = {
        authLoading,
        session,
        setSession,
        currentUserProfile,
        profileLoading,
        updateProfile,
        refreshProfile: fetchOrCreateProfile,
        unreadCount,
        resetUnreadCount,
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
