/**
 * Centralized API Service Layer
 * All Supabase queries in one place for maintainability and testability.
 */
import { supabase } from './supabase';

// ============================================================
// PLAYERS
// ============================================================

export const fetchPlayerByUserId = async (userId) => {
    const { data, error } = await supabase.from('players_master')
        .select('*, clubs(*)')
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    return data;
};

export const fetchPlayersByIds = async (ids) => {
    const { data } = await supabase.from('players_master')
        .select('*, clubs(*)')
        .in('id', ids);
    return data || [];
};

export const updatePlayer = async (playerId, updates) => {
    const { data, error } = await supabase.from('players_master')
        .update(updates)
        .eq('id', playerId)
        .select('*, clubs(*)')
        .single();
    if (error) throw error;
    return data;
};

export const searchPlayers = async ({ query, pos, status, cityQuery, clubIds, offset = 0, limit = 15 }) => {
    let q = supabase.from('players_master').select('*, clubs(*)');
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
        .select('*, clubs(*)')
        .neq('id', excludeId)
        .limit(limit);
    return data || [];
};

export const fetchPlayersWithCity = async ({ posFilter, statusFilter, limit = 200 }) => {
    let q = supabase.from('players_master').select('*, clubs(*)').not('city', 'is', null);
    if (posFilter && posFilter !== 'Alle') q = q.eq('position_primary', posFilter);
    if (statusFilter && statusFilter !== 'Alle') q = q.eq('transfer_status', statusFilter);
    const { data } = await q.limit(limit);
    return data || [];
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
        .select('*, players_master(*, clubs(*))')
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

export const createNotification = async ({ userId, actorId, type }) => {
    await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: actorId,
        type,
        is_read: false,
    });
};

export const fetchNotifications = async (userId) => {
    const { data } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    return data || [];
};

export const markNotificationsRead = async (userId) => {
    await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
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
        .select('player_id, players_master(*, clubs(*))')
        .eq('scout_id', scoutId);
    return data || [];
};

// ============================================================
// LIKES
// ============================================================

export const likeVideo = async (userId, videoId) => {
    const { error } = await supabase.from('media_likes')
        .insert({ user_id: userId, video_id: videoId });
    if (error) throw error;
};

export const unlikeVideo = async (userId, videoId) => {
    await supabase.from('media_likes')
        .delete()
        .match({ user_id: userId, video_id: videoId });
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
    const { data } = await supabase.from('video_comments')
        .select('*, players_master(full_name, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });
    return data || [];
};

export const addComment = async (videoId, userId, content) => {
    const { data, error } = await supabase.from('video_comments')
        .insert({ video_id: videoId, user_id: userId, content })
        .select('*, players_master(full_name, avatar_url)')
        .single();
    if (error) throw error;
    return data;
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
        .insert({ name, league: 'Kreisliga', is_verified: false })
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
