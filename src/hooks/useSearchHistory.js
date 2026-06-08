import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'cavio_recent_searches_v2';
const MAX_ENTRIES = 5;

/**
 * useSearchHistory — Custom Hook for managing recently visited profiles in localStorage.
 * Each entry: { id, full_name, avatar_url, role, club_name, visited_at }
 * 
 * Listens for 'profileVisited' custom events dispatched by useAppState
 * to automatically track profile visits.
 */
export const useSearchHistory = () => {
    const [recentProfiles, setRecentProfiles] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    });

    // Persist to localStorage whenever state changes
    const persist = useCallback((profiles) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
        } catch (e) {
            // Silently fail on QuotaExceeded, Privacy Mode, etc.
            console.warn('[useSearchHistory] localStorage write failed:', e.message);
        }
    }, []);

    const addProfile = useCallback((profile) => {
        if (!profile || !profile.id) return;

        const entry = {
            id: profile.id,
            full_name: profile.full_name || profile.username || 'Unbekannt',
            avatar_url: profile.avatar_url || null,
            role: profile.role || 'player',
            club_name: profile.clubs?.name || profile.club_name || null,
            visited_at: new Date().toISOString(),
        };

        setRecentProfiles(prev => {
            // Remove duplicate, push to front, cap at MAX_ENTRIES
            const updated = [entry, ...prev.filter(p => p.id !== profile.id)].slice(0, MAX_ENTRIES);
            persist(updated);
            return updated;
        });
    }, [persist]);

    const removeProfile = useCallback((profileId) => {
        setRecentProfiles(prev => {
            const updated = prev.filter(p => p.id !== profileId);
            persist(updated);
            return updated;
        });
    }, [persist]);

    const clearAll = useCallback(() => {
        setRecentProfiles([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Silently fail
        }
    }, []);

    // Listen for profileVisited events from useAppState
    useEffect(() => {
        const handleProfileVisited = (e) => {
            const profile = e.detail;
            if (profile) addProfile(profile);
        };

        window.addEventListener('profileVisited', handleProfileVisited);
        return () => window.removeEventListener('profileVisited', handleProfileVisited);
    }, [addProfile]);

    return { recentProfiles, addProfile, removeProfile, clearAll };
};
