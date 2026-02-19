import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext(null);

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};

export const UserProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch or auto-create profile
    const fetchOrCreateProfile = useCallback(async (userSession) => {
        const s = userSession || session;
        if (!s?.user?.id) {
            setCurrentUserProfile(null);
            return null;
        }
        setProfileLoading(true);
        try {
            let { data } = await supabase.from('players_master')
                .select('*, clubs(*)')
                .eq('user_id', s.user.id)
                .maybeSingle();

            if (!data) {
                const newProfile = {
                    user_id: s.user.id,
                    full_name: 'Neuer Spieler',
                    position_primary: 'ZM',
                    transfer_status: 'Gebunden',
                    followers_count: 0,
                    is_verified: false,
                    is_admin: false
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
        }
    }, [session]);

    // Update profile (called after edit) — syncs everywhere
    const updateProfile = useCallback((updatedProfile) => {
        setCurrentUserProfile(updatedProfile);
    }, []);

    // Auth initialization
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (!s) {
                setCurrentUserProfile(null);
                setUnreadCount(0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Auto-fetch profile when session changes
    useEffect(() => {
        if (session?.user?.id) {
            fetchOrCreateProfile(session);
        }
    }, [session, fetchOrCreateProfile]);

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
        if (session?.user?.id) {
            supabase.from('notifications')
                .update({ is_read: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false)
                .then(() => { });
        }
    }, [session]);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setCurrentUserProfile(null);
        setUnreadCount(0);
    }, []);

    const value = {
        session,
        setSession,
        currentUserProfile,
        profileLoading,
        updateProfile,
        refreshProfile: fetchOrCreateProfile,
        unreadCount,
        resetUnreadCount,
        logout,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
