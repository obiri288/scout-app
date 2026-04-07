/**
 * Centralized API Service Layer
 * All Supabase queries in one place for maintainability and testability.
 */
import { supabase } from './supabase';

const cleanPayload = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v != null)
    );
};

// ============================================================
// PLAYERS
// ============================================================

export const fetchPlayerByUserId = async (userId) => {
    const { data, error } = await supabase.from('players_master')
        .select('*, clubs(*, leagues(name))')
        .eq('user_id', userId)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const fetchPlayersByIds = async (ids) => {
    const { data } = await supabase.from('players_master')
        .select('*, clubs(*, leagues(name))')
        .in('id', ids);
    return data || [];
};

export const updatePlayer = async (playerId, updates) => {
    const { data, error } = await supabase.from('players_master')
        .update(updates)
        .eq('id', playerId)
        .select('*, clubs(*, leagues(name))')
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const searchPlayers = async ({ query, pos, status, cityQuery, clubIds, offset = 0, limit = 15 }) => {
    let q = supabase.from('players_master').select('*, clubs(*, leagues(name))');
    if (query) q = q.ilike('full_name', `%${query}%`);
    if (pos && pos !== 'Alle') q = q.eq('position_primary', pos);
    if (status && status !== 'Alle') q = q.eq('transfer_status', status);
    if (cityQuery) q = q.or(`city.ilike.%${cityQuery}%,zip_code.ilike.%${cityQuery}%`);
    if (clubIds && clubIds.length > 0) q = q.in('club_id', clubIds);
    const { data } = await q.range(offset, offset + limit - 1);
    return data || [];
};

export const fetchSimilarPlayers = async (excludeId, limit = 100) => {
    const { data } = await supabase.from('players_master')
        .select('*, clubs(*, leagues(name))')
        .neq('id', excludeId)
        .limit(limit);
    return data || [];
};

export const fetchPlayersWithCity = async ({ posFilter, statusFilter, limit = 200 }) => {
    let q = supabase.from('players_master').select('*, clubs(*, leagues(name))').not('city', 'is', null);
    if (posFilter && posFilter !== 'Alle') q = q.eq('position_primary', posFilter);
    if (statusFilter && statusFilter !== 'Alle') q = q.eq('transfer_status', statusFilter);
    const { data } = await q.limit(limit);
    return data || [];
};

export const fetchPlayersWithCoords = async ({ posFilter, statusFilter, limit = 200 }) => {
    let q = supabase.from('players_master').select('*, clubs(*, leagues(name))')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
    if (posFilter && posFilter !== 'Alle') q = q.eq('position_primary', posFilter);
    if (statusFilter && statusFilter !== 'Alle') q = q.eq('transfer_status', statusFilter);
    const { data } = await q.limit(limit);
    return data || [];
};

// ============================================================
// GEOCODING
// ============================================================

const geoCache = {};

export const geocodeCity = async (city) => {
    if (!city) return null;
    const key = city.toLowerCase().trim();
    if (geoCache[key]) return geoCache[key];

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Deutschland')}&format=json&limit=1`
        );
        const data = await res.json();
        if (data && data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            geoCache[key] = result;
            return result;
        }
    } catch (e) {
        console.warn("Geocoding failed for:", city, e);
    }
    return null;
};

// ============================================================
// HIGHLIGHTS / VIDEOS
// ============================================================

export const fetchPlayerHighlights = async (playerId) => {
    const { data } = await supabase.from('media_highlights')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
    return data || [];
};

export const fetchFeed = async (offset = 0, limit = 10) => {
    const { data } = await supabase.from('media_highlights')
        .select('*, players_master(*, clubs(*, leagues(name)))')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    return data || [];
};

export const fetchHighlightCount = async (playerId) => {
    const { count } = await supabase.from('media_highlights')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId);
    return count || 0;
};

export const deleteHighlight = async (videoId) => {
    const { error } = await supabase.from('media_highlights').delete().eq('id', videoId);
    if (error) throw error;
};

export const insertHighlight = async (highlight) => {
    const { data, error } = await supabase.from('media_highlights').insert(highlight).select().single();
    if (error) throw error;
    return data;
};

// ============================================================
// FOLLOWS
// ============================================================

export const checkIsFollowing = async (followerId, followingId) => {
    const { data } = await supabase.from('follows').select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    return data && data.length > 0;
};

export const getFollowersCount = async (userId) => {
    const { count } = await supabase.from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
    return count || 0;
};

export const follow = async (followerId, followingId) => {
    const { error } = await supabase.from('follows')
        .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
};

export const unfollow = async (followerId, followingId) => {
    const { error } = await supabase.from('follows')
        .delete()
        .match({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
};

export const fetchFollowers = async (userId) => {
    const { data } = await supabase.from('follows')
        .select('follower_id')
        .eq('following_id', userId);
    return data || [];
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const createNotification = async ({ userId, actorId, type, message, entityId, videoId }) => {
    const payload = cleanPayload({
        user_id: userId,
        actor_id: actorId, // Auslöser
        type,
        message,
        is_read: false,
        entity_id: entityId,
        video_id: videoId
    });

    try {
        const { error } = await supabase.from('notifications').insert(payload);
        if (error) throw error;
    } catch (error) {
        console.error("DB Error in createNotification. Payload:", payload, "Error:", error);
        throw error;
    }
};

export const fetchNotifications = async (userId) => {
    const { data } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (!data || data.length === 0) return [];

    // Batch-fetch actor profiles for display
    const actorIds = [...new Set(data.filter(n => n.actor_id).map(n => n.actor_id))];
    let actorMap = {};
    if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from('players_master')
            .select('user_id, full_name, avatar_url')
            .in('user_id', actorIds);
        if (profiles) {
            for (const p of profiles) actorMap[p.user_id] = p;
        }
    }

    return data.map(n => ({
        ...n,
        actor: n.actor_id ? (actorMap[n.actor_id] || null) : null,
    }));
};

export const markNotificationsRead = async (userId) => {
    await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
};

export const markNotificationRead = async (notificationId) => {
    await supabase.from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
};

const LIKE_MILESTONES = [10, 25, 50, 100, 250, 500];

export const checkAndCreateLikeMilestone = async (videoId, videoOwnerUserId, likerId) => {
    try {
        const { count } = await supabase.from('media_likes')
            .select('id', { count: 'exact', head: true })
            .eq('video_id', videoId);
        if (count && LIKE_MILESTONES.includes(count)) {
            await createNotification({
                userId: videoOwnerUserId,
                actorId: likerId,
                type: 'likes_milestone',
                message: `Dein Video hat ${count} Likes erreicht! 🎉`,
            });
        }
    } catch (_) { /* non-critical */ }
};

// ============================================================
// WATCHLIST
// ============================================================

export const checkIsOnWatchlist = async (scoutId, playerId) => {
    const { data } = await supabase.from('scout_watchlist')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('player_id', playerId);
    return data && data.length > 0;
};

export const addToWatchlist = async (scoutId, playerId) => {
    const { error } = await supabase.from('scout_watchlist')
        .insert({ scout_id: scoutId, player_id: playerId });
    if (error) throw error;
};

export const removeFromWatchlist = async (scoutId, playerId) => {
    const { error } = await supabase.from('scout_watchlist')
        .delete()
        .match({ scout_id: scoutId, player_id: playerId });
    if (error) throw error;
};

export const fetchWatchlist = async (scoutId) => {
    const { data } = await supabase.from('scout_watchlist')
        .select('player_id, players_master(*, clubs(*, leagues(name)))')
        .eq('scout_id', scoutId);
    return data || [];
};

// ============================================================
// LIKES
// ============================================================

export const checkIsLiked = async (userId, videoId) => {
    if (!userId || !videoId) return false;
    const { data } = await supabase.from('media_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId);
    return data && data.length > 0;
};

export const likeVideo = async (userId, videoId) => {
    const payload = cleanPayload({ 
        user_id: userId, 
        video_id: videoId // strict: video_id, not media_id
    });
    
    try {
        const { error } = await supabase.from('media_likes').insert(payload);
        if (error) throw error;
    } catch (error) {
        console.error("DB Error in likeVideo. Payload:", payload, "Error:", error);
        throw error;
    }
};

export const unlikeVideo = async (userId, videoId) => {
    const matchCriteria = { user_id: userId, video_id: videoId };
    try {
        const { error } = await supabase.from('media_likes')
            .delete()
            .match(matchCriteria);
        if (error) throw error;
    } catch (error) {
        console.error("DB Error in unlikeVideo. Criteria:", matchCriteria, "Error:", error);
        throw error;
    }
};

// ============================================================
// MESSAGES
// ============================================================

export const fetchConversation = async (userA, userB) => {
    const { data } = await supabase.from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userA},receiver_id.eq.${userA}`)
        .or(`sender_id.eq.${userB},receiver_id.eq.${userB}`)
        .order('created_at', { ascending: true });

    return (data || []).filter(m =>
        (m.sender_id === userA && m.receiver_id === userB) ||
        (m.sender_id === userB && m.receiver_id === userA)
    );
};

export const sendMessage = async (senderId, receiverId, content) => {
    const { error } = await supabase.from('direct_messages')
        .insert({ sender_id: senderId, receiver_id: receiverId, content });
    if (error) throw error;
};

export const markMessagesRead = async (ids) => {
    await supabase.from('direct_messages')
        .update({ is_read: true })
        .in('id', ids);
};

export const fetchConversationList = async (userId) => {
    const { data } = await supabase.from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
    return data || [];
};

// ============================================================
// COMMENTS
// ============================================================

export const fetchComments = async (videoId) => {
    const { data } = await supabase.from('media_comments')
        .select('*, players_master!inner(full_name, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });
    return data || [];
};

export const addComment = async (videoId, userId, content) => {
    const payload = { video_id: videoId, user_id: userId, content };
    try {
        const { data, error } = await supabase.from('media_comments')
            .insert(payload)
            .select('*, players_master!inner(full_name, avatar_url)')
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("DB Error in addComment. Payload:", payload, "Error:", error);
        throw error;
    }
};

export const deleteComment = async (commentId) => {
    const { error } = await supabase.from('media_comments').delete().eq('id', commentId);
    if (error) throw error;
};

export const toggleCommentLike = async (userId, commentId, isLiked) => {
    if (!isLiked) {
        const { error } = await supabase.from('comment_likes')
            .insert({ user_id: userId, comment_id: commentId });
        if (error) throw error;
    } else {
        const { error } = await supabase.from('comment_likes')
            .delete()
            .match({ user_id: userId, comment_id: commentId });
        if (error) throw error;
    }
};

export const getCommentLikes = async (commentId, userId) => {
    const countRes = await supabase.from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId);
        
    let isLiked = false;
    if (userId) {
        const { data } = await supabase.from('comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .maybeSingle();
        if (data) isLiked = true;
    }
    
    return { count: countRes.count || 0, isLiked };
};

// ============================================================
// RATINGS
// ============================================================

export const fetchPlayerRatings = async (playerId) => {
    const { data, error } = await supabase.from('player_ratings')
        .select('rating, rater_id')
        .eq('player_id', playerId);
    if (error) throw error;
    return data || [];
};

export const upsertRating = async (playerId, raterId, rating) => {
    const { error } = await supabase.from('player_ratings')
        .upsert({ player_id: playerId, rater_id: raterId, rating },
            { onConflict: 'player_id,rater_id' });
    if (error) throw error;
};

// ============================================================
// PROFILE VIEWS
// ============================================================

export const recordProfileView = async (profileId, viewerId) => {
    if (!viewerId) return;
    try {
        // Dedup: only once per viewer per day
        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await supabase.from('profile_views')
            .select('id')
            .eq('profile_id', profileId)
            .eq('viewer_id', viewerId)
            .gte('created_at', `${today}T00:00:00`)
            .limit(1);
        if (existing && existing.length > 0) return;
        await supabase.from('profile_views').insert({ profile_id: profileId, viewer_id: viewerId });
    } catch (_) { /* non-critical */ }
};

export const getProfileViewCount = async (profileId) => {
    const { count } = await supabase.from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId);
    return count || 0;
};

// ============================================================
// PLAYER ATTRIBUTES
// ============================================================

export const fetchPlayerAttributes = async (playerId) => {
    const { data } = await supabase.from('player_attributes')
        .select('*')
        .eq('player_id', playerId);
    return data || [];
};

export const upsertPlayerAttributes = async (playerId, raterId, attributes) => {
    const { error } = await supabase.from('player_attributes')
        .upsert({
            player_id: playerId,
            rater_id: raterId,
            ...attributes,
        }, { onConflict: 'player_id,rater_id' });
    if (error) throw error;
};

// ============================================================
// XP SYSTEM
// ============================================================

export const awardXP = async (playerId, amount, reason, refId = null) => {
    try {
        // Dedup: don't award same reason+ref twice
        if (refId) {
            const { data: existing } = await supabase.from('player_xp_ledger')
                .select('id')
                .eq('player_id', playerId)
                .eq('reason', reason)
                .eq('ref_id', refId)
                .limit(1);
            if (existing && existing.length > 0) return;
        }
        await supabase.from('player_xp_ledger').insert({
            player_id: playerId,
            xp_amount: amount,
            reason,
            ref_id: refId,
        });
    } catch (_) { /* non-critical */ }
};

export const getPlayerXP = async (playerId) => {
    const { data } = await supabase.from('player_xp_ledger')
        .select('xp_amount')
        .eq('player_id', playerId);
    return (data || []).reduce((s, r) => s + r.xp_amount, 0);
};

// ============================================================
// CLUBS
// ============================================================

export const searchClubs = async (query, limit = 5) => {
    const { data } = await supabase.from('clubs')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);
    return data || [];
};

export const searchClubIds = async (query) => {
    const { data } = await supabase.from('clubs')
        .select('id')
        .ilike('name', `%${query}%`);
    return (data || []).map(c => c.id);
};

export const createClub = async (name) => {
    const { data, error } = await supabase.from('clubs')
        .insert({ name, league_id: null, is_verified: false })
        .select()
        .single();
    if (error) throw error;
    return data;
};

// ============================================================
// REPORTS
// ============================================================

export const submitReport = async (report) => {
    const { error } = await supabase.from('reports').insert(report);
    if (error) throw error;
};

// ============================================================
// STORAGE
// ============================================================

export const uploadAvatar = async (path, file) => {
    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
};

export const uploadVideo = async (path, file) => {
    const { error } = await supabase.storage.from('player-videos').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('player-videos').getPublicUrl(path);
    return data.publicUrl;
};

export const deleteVideoFiles = async (videoUrl, thumbnailUrl) => {
    if (videoUrl) {
        const path = videoUrl.split('/player-videos/').pop();
        if (path) await supabase.storage.from('player-videos').remove([decodeURIComponent(path)]);
    }
    if (thumbnailUrl && !thumbnailUrl.includes('placehold.co')) {
        const thumbPath = thumbnailUrl.split('/player-videos/').pop();
        if (thumbPath) await supabase.storage.from('player-videos').remove([decodeURIComponent(thumbPath)]);
    }
};

// ============================================================
// AUTH
// ============================================================

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
};

export const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`
    });
    if (error) throw error;
};

export const signOut = async () => {
    await supabase.auth.signOut();
};

// ============================================================
// USER BLOCKING
// ============================================================

export const blockUser = async (blockerId, blockedId) => {
    const { error } = await supabase.from('user_blocks')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw error;
};

export const unblockUser = async (blockerId, blockedId) => {
    const { error } = await supabase.from('user_blocks')
        .delete()
        .match({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw error;
};

export const fetchBlockedUserIds = async (userId) => {
    const { data } = await supabase.from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);
    return (data || []).map(b => b.blocked_id);
};

export const checkIsBlocked = async (blockerId, blockedId) => {
    const { data } = await supabase.from('user_blocks')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
    return data && data.length > 0;
};

// ============================================================
// ACCOUNT DELETION
// ============================================================

export const deleteUserAccount = async () => {
    // Edge Function handles everything:
    // 1. Storage cleanup (videos, thumbnails, avatars)
    // 2. auth.admin.deleteUser() which cascades to all DB records
    const { data, error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    return data;
};
