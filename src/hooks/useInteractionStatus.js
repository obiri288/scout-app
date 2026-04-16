import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

/**
 * useInteractionStatus - A robust hook for managing interaction state (Like/Follow)
 * with Single Source of Truth from DB and optimistic UI updates.
 * 
 * @param {Object} options 
 * @param {string} options.type - 'video_like' | 'user_follow'
 * @param {string} options.targetId - video.id OR target player.id (players_master.id)
 * @param {Object} options.session - current user session
 * @param {number} options.initialCount - initial count from parent
 * @param {boolean} options.initialStatus - initial status from parent
 */
export const useInteractionStatus = ({ type, targetId, session, initialCount = 0, initialStatus = false }) => {
    const [status, setStatus] = useState(initialStatus);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const userId = session?.user?.id;
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Fetch fresh status and count on mount if we have a session
    useEffect(() => {
        if (!targetId) return;
        
        const fetchData = async () => {
            try {
                let freshStatus = false;
                let freshCount = 0;

                if (type === 'video_like') {
                    // 1. Status
                    if (userId) {
                        freshStatus = await api.checkIsLiked(userId, targetId);
                    }
                    // 2. Count (from master table)
                    const { data } = await supabase.from('media_highlights').select('likes_count').eq('id', targetId).maybeSingle();
                    if (data) freshCount = data.likes_count || 0;
                } 
                else if (type === 'user_follow') {
                    // 1. Status
                    if (userId) {
                        const myPlayerId = await api.getPlayerIdFromUserId(userId);
                        if (myPlayerId) {
                            freshStatus = await api.checkIsFollowing(myPlayerId, targetId);
                        }
                    }
                    // 2. Count (from master table)
                    const { data } = await supabase.from('players_master').select('followers_count').eq('id', targetId).maybeSingle();
                    if (data) freshCount = data.followers_count || 0;
                }

                if (isMounted.current) {
                    setStatus(freshStatus);
                    setCount(freshCount);
                }
            } catch (err) {
                console.error(`Error fetching interaction status (${type}):`, err);
            }
        };

        fetchData();
    }, [userId, targetId, type]);

    const toggle = useCallback(async () => {
        if (!userId || !targetId || loading) return;

        const wasStatus = status;
        const prevCount = count;

        // 1. Optimistic Update
        setStatus(!wasStatus);
        setCount(c => wasStatus ? Math.max(0, c - 1) : c + 1);
        setLoading(true);

        try {
            if (type === 'video_like') {
                if (!wasStatus) await api.likeVideo(userId, targetId);
                else await api.unlikeVideo(userId, targetId);
            } 
            else if (type === 'user_follow') {
                const myPlayerId = await api.getPlayerIdFromUserId(userId);
                if (!myPlayerId) throw new Error("Profil nicht gefunden");
                
                if (!wasStatus) await api.follow(myPlayerId, targetId);
                else await api.unfollow(myPlayerId, targetId);
            }
            // Success! We keep the optimistic update. 
            // The triggers in Postgres ensure the counts are synchronized.
        } catch (err) {
            // 2. Rollback on Error
            if (isMounted.current) {
                setStatus(wasStatus);
                setCount(prevCount);
            }
            throw err; // Caller handles toast
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [userId, targetId, status, count, type, loading]);

    return { status, count, toggle, loading };
};
