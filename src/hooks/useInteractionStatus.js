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
                else if (type === 'post_like') {
                    // 1. Status
                    if (userId) {
                        freshStatus = await api.checkIsPostLiked(userId, targetId);
                    }
                    // 2. Count (from posts table)
                    const { data } = await supabase.from('posts').select('likes_count').eq('id', targetId).maybeSingle();
                    if (data) freshCount = data.likes_count || 0;
                }
                else if (type === 'video_save') {
                    // 1. Status
                    if (userId) {
                        freshStatus = await api.checkIsVideoSaved(userId, targetId);
                    }
                    // 2. No public count for saves
                    freshCount = 0;
                }
                else if (type === 'post_save') {
                    // 1. Status
                    if (userId) {
                        freshStatus = await api.checkIsPostSaved(userId, targetId);
                    }
                    // 2. No public count for saves
                    freshCount = 0;
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

        // Optimistic update
        setStatus(!wasStatus);
        if (type === 'video_like' || type === 'user_follow') {
            setCount(prev => wasStatus ? Math.max(0, prev - 1) : prev + 1);
        }

        setLoading(true);

        try {
            if (type === 'video_like') {
                if (!wasStatus) await api.likeVideo(userId, targetId);
                else await api.unlikeVideo(userId, targetId);
                
                // Fetch fresh status and count from DB directly (Single Source of Truth)
                const [isLiked, { data }] = await Promise.all([
                    api.checkIsLiked(userId, targetId),
                    supabase.from('media_highlights').select('likes_count').eq('id', targetId).maybeSingle()
                ]);

                if (isMounted.current) {
                    setStatus(isLiked);
                    if (data) setCount(data.likes_count || 0);
                }
            } 
            else if (type === 'post_like') {
                if (!wasStatus) await api.likePost(userId, targetId);
                else await api.unlikePost(userId, targetId);
                
                // Fetch fresh status and count from DB directly (Single Source of Truth)
                const [isLiked, { data }] = await Promise.all([
                    api.checkIsPostLiked(userId, targetId),
                    supabase.from('posts').select('likes_count').eq('id', targetId).maybeSingle()
                ]);

                if (isMounted.current) {
                    setStatus(isLiked);
                    if (data) setCount(data.likes_count || 0);
                }
            }
            else if (type === 'video_save') {
                if (!wasStatus) await api.saveVideo(userId, targetId);
                else await api.unsaveVideo(userId, targetId);
                
                const isSaved = await api.checkIsVideoSaved(userId, targetId);

                if (isMounted.current) {
                    setStatus(isSaved);
                }
            }
            else if (type === 'post_save') {
                if (!wasStatus) await api.savePost(userId, targetId);
                else await api.unsavePost(userId, targetId);
                
                const isSaved = await api.checkIsPostSaved(userId, targetId);

                if (isMounted.current) {
                    setStatus(isSaved);
                }
            }
            else if (type === 'user_follow') {
                const myPlayerId = await api.getPlayerIdFromUserId(userId);
                if (!myPlayerId) throw new Error("Eigenes Profil nicht gefunden. Bitte neu einloggen.");
                
                if (!wasStatus) await api.follow(myPlayerId, targetId);
                else await api.unfollow(myPlayerId, targetId);
                
                // Fetch fresh status and count directly from DB to guarantee absolute consistency
                const [isFollowing, { data }] = await Promise.all([
                    api.checkIsFollowing(myPlayerId, targetId),
                    supabase.from('players_master').select('followers_count').eq('id', targetId).maybeSingle()
                ]);

                if (isMounted.current) {
                    setStatus(isFollowing);
                    if (data) setCount(data.followers_count || 0);
                }
            }
        } catch (err) {
            console.error(`[useInteractionStatus] Error in toggle (${type}):`, err);
            // Rollback optimistic state
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

    const forceState = useCallback((newStatus, newCount) => {
        if (isMounted.current) {
            if (newStatus !== undefined) setStatus(newStatus);
            if (newCount !== undefined) setCount(newCount);
        }
    }, []);

    return { status, count, toggle, loading, forceState };
};
