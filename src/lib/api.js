/**
 * Centralized API Service Layer
 * All Supabase queries in one place for maintainability and testability.
 */
import { supabase } from './supabase';
export { supabase };

const cleanPayload = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v != null)
    );
};

// ============================================================
// SLUG UTILITIES
// ============================================================

export const generateSlug = (name) => {
    if (!name) return '';
    return name
        .toString()
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Spaces to dashes
        .replace(/-+/g, '-') // Remove consecutive dashes
        .trim();
};

export const ensureUniqueSlug = async (baseSlug, currentId = null) => {
    let slug = baseSlug;
    let isUnique = false;
    let attempt = 0;

    while (!isUnique) {
        let q = supabase.from('players_master').select('id').eq('slug', slug);
        if (currentId) {
            q = q.neq('id', currentId);
        }
        
        const { data, error } = await q.maybeSingle();
        
        if (error || !data) {
            isUnique = true;
        } else {
            attempt++;
            // Append a 4-character random string for uniqueness
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            slug = `${baseSlug}-${randomSuffix}`;
            
            if (attempt > 5) {
                // Failsafe
                slug = `${baseSlug}-${Date.now()}`;
                isUnique = true;
            }
        }
    }
    return slug;
};

// ============================================================
// PLAYERS
// ============================================================

export const fetchPlayerByUserId = async (userId) => {
    const { data, error } = await supabase.from('players_master')
        .select('*, following_count, clubs(*, leagues(name)), club_teams(*, clubs(*))')
        .eq('user_id', userId)
        .eq('is_deactivated', false)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const fetchPlayerBySlug = async (slug) => {
    const { data, error } = await supabase.from('players_master')
        .select('*, following_count, clubs(*, leagues(name)), club_teams(*, clubs(*))')
        .eq('slug', slug)
        .eq('is_deactivated', false)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const fetchLatestCareerEntry = async (userId) => {
    const { data } = await supabase.from('career_history')
        .select('*, clubs(*, leagues(name))')
        .eq('user_id', userId)
        .is('end_date', null)
        .eq('verification_status', 'approved')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
};

export const fetchPlayerByUsername = async (username) => {
    const { data, error } = await supabase.from('players_master')
        .select('*, following_count, clubs(*, leagues(name)), club_teams(*, clubs(*))')
        .eq('username', username)
        .eq('is_deactivated', false)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const fetchPlayersByIds = async (ids) => {
    const { data } = await supabase.from('players_master')
        .select('*, clubs(*, leagues(name)), club_teams(*, clubs(*))')
        .eq('is_deactivated', false)
        .in('id', ids);
    return data || [];
};

export const updatePlayer = async (playerId, updates) => {
    const { data, error } = await supabase.from('players_master')
        .update(updates)
        .eq('id', playerId)
        .select('*, clubs(*, leagues(name)), club_teams(*, clubs(*))')
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const searchPlayers = async ({ query, pos, status, cityQuery, clubIds, offset = 0, limit = 15, ecosystem = 'mens' }) => {
    let q = supabase.from('players_master')
        .select('*, clubs(*, leagues(name))')
        .eq('is_deactivated', false)
        .eq('is_under_review', false);
    if (ecosystem !== 'all' && !query) {
        q = q.eq('ecosystem', ecosystem);
    }
    if (query) q = q.ilike('full_name', `%${query}%`);
    if (pos && pos !== 'Alle') q = q.eq('position_primary', pos);
    if (status && status !== 'Alle') q = q.eq('transfer_status', status);
    if (cityQuery) q = q.or(`city.ilike.%${cityQuery}%,zip_code.ilike.%${cityQuery}%`);
    if (clubIds && clubIds.length > 0) q = q.in('club_id', clubIds);
    const { data } = await q.range(offset, offset + limit - 1);
    return data || [];
};

export const fetchSimilarPlayers = async (excludeId, limit = 100, ecosystem = 'mens') => {
    let q = supabase.from('players_master')
        .select('*, clubs(*, leagues(name))')
        .eq('is_deactivated', false)
        .neq('id', excludeId);
    if (ecosystem !== 'all') {
        q = q.eq('ecosystem', ecosystem);
    }
    const { data } = await q.limit(limit);
    return data || [];
};

export const fetchPlayersWithCity = async ({ posFilter, statusFilter, limit = 200, ecosystem = 'mens' }) => {
    let q = supabase.from('players_master').select('*, clubs(*, leagues(name))')
        .eq('is_deactivated', false)
        .not('city', 'is', null);
    if (ecosystem !== 'all') {
        q = q.eq('ecosystem', ecosystem);
    }
    if (posFilter && posFilter !== 'Alle') q = q.eq('position_primary', posFilter);
    if (statusFilter && statusFilter !== 'Alle') q = q.eq('transfer_status', statusFilter);
    const { data } = await q.limit(limit);
    return data || [];
};

export const fetchPlayersWithCoords = async ({ posFilter, statusFilter, limit = 200, ecosystem = 'mens' }) => {
    let q = supabase.from('players_master').select('*, clubs(*, leagues(name))')
        .eq('is_deactivated', false)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
    if (ecosystem !== 'all') {
        q = q.eq('ecosystem', ecosystem);
    }
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

export const fetchPlayerHighlights = async (playerId, includeArchived = false) => {
    // 1. Fetch from media_highlights
    let qHighlights = supabase.from('media_highlights')
        .select('*, media_comments(count), players_master(*, clubs(*, leagues(name)))')
        .eq('player_id', playerId)
        .eq('is_under_review', false);
    
    if (!includeArchived) {
        qHighlights = qHighlights.eq('is_archived', false);
    }

    // 2. Fetch from posts
    let qPosts = supabase.from('posts')
        .select('*, players_master(*, clubs(*, leagues(name)))')
        .eq('user_id', playerId)
        .eq('is_deleted', false);

    const [highlightsRes, postsRes] = await Promise.all([
        qHighlights.order('created_at', { ascending: false }),
        qPosts.order('created_at', { ascending: false })
    ]);
        
    const allItems = [
        ...(highlightsRes.data || []).map(h => ({ ...h, post_type: h.post_type || 'video' })),
        ...(postsRes.data || []).map(p => ({ ...p, post_type: p.type, transfer_data: p.metadata }))
    ];

    return allItems
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(post => ({
            ...post,
            comments_count: post.media_comments?.[0]?.count || 0
        }));
};

/**
 * Fetches a single video by ID, including the creator's profile data.
 * Used for direct video links (e.g. #video/{id}).
 */
export const fetchVideoById = async (videoId) => {
    const { data, error } = await supabase.from('media_highlights')
        .select('*, media_comments(count), players_master(*, clubs(*, leagues(name)))')
        .eq('id', videoId)
        .eq('is_under_review', false)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return {
        ...data,
        comments_count: data.media_comments?.[0]?.count || 0
    };
};

export const fetchFeed = async (offset = 0, limit = 10, ecosystem = 'mens') => {
    // Increase pool size to run a rich algorithmic ranking pool of recent content
    const fetchPoolSize = 100;

    // 1. Fetch from media_highlights
    let highlightsPromise = supabase.from('media_highlights')
        .select('*, media_comments(count), players_master!inner(*, clubs(*, leagues(name)))')
        .eq('players_master.is_deactivated', false)
        .eq('is_archived', false)
        .eq('is_under_review', false);
        
    if (ecosystem !== 'all') {
        highlightsPromise = highlightsPromise.in('players_master.ecosystem', [ecosystem, 'all']);
    }
    highlightsPromise = highlightsPromise.order('created_at', { ascending: false }).range(0, fetchPoolSize);

    // 2. Fetch from posts
    let postsPromise = supabase.from('posts')
        .select('*, players_master!inner(*, clubs(*, leagues(name)))')
        .eq('players_master.is_deactivated', false)
        .eq('is_deleted', false);
        
    if (ecosystem !== 'all') {
        postsPromise = postsPromise.in('players_master.ecosystem', [ecosystem, 'all']);
    }
    postsPromise = postsPromise.order('created_at', { ascending: false }).range(0, fetchPoolSize);

    const [highlightsRes, postsRes] = await Promise.all([highlightsPromise, postsPromise]);
        
    const allItems = [
        ...(highlightsRes.data || []).map(h => ({ 
            ...h, 
            post_type: h.post_type || 'video',
            comments_count: h.media_comments?.[0]?.count || 0
        })),
        ...(postsRes.data || []).map(p => ({ 
            ...p, 
            post_type: p.type, 
            transfer_data: p.metadata,
            comments_count: p.comments_count || 0
        }))
    ];

    const now = new Date();

    const scoredItems = allItems
        .filter(item => item.players_master !== null)
        .map(item => {
            const likes = item.likes_count || 0;
            const comments = item.comments_count || 0;
            const trendScore = (likes * 1) + (comments * 3);
            
            // Boost only stays active for content that is less than 48 hours old
            const createdTime = new Date(item.created_at);
            const hoursOld = Math.abs(now - createdTime) / 36e5;
            const isBoostActive = item.is_admin_boosted && hoursOld <= 48;

            return {
                ...item,
                trending_score: trendScore,
                is_boost_active: isBoostActive,
                hours_old: hoursOld
            };
        });

    // Sort priority logic:
    // 1. is_boost_active === true (boosted and < 48 hours old)
    // 2. trending_score DESC
    // 3. created_at DESC (chronological fallback)
    const sortedItems = scoredItems.sort((a, b) => {
        if (a.is_boost_active && !b.is_boost_active) return -1;
        if (!a.is_boost_active && b.is_boost_active) return 1;

        if (b.trending_score !== a.trending_score) {
            return b.trending_score - a.trending_score;
        }

        return new Date(b.created_at) - new Date(a.created_at);
    });

    // Return the slice based on offset and limit
    return sortedItems.slice(offset, offset + limit);
};

export const updateContentBoost = async (id, type, isBoosted) => {
    const table = type === 'video' ? 'media_highlights' : 'posts';
    const { error } = await supabase.from(table)
        .update({ is_admin_boosted: isBoosted })
        .eq('id', id);
    if (error) throw error;
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

export const archiveHighlight = async (videoId) => {
    const { error } = await supabase.from('media_highlights').update({ is_archived: true }).eq('id', videoId);
    if (error) throw error;
};

export const unarchiveHighlight = async (videoId) => {
    const { error } = await supabase.from('media_highlights').update({ is_archived: false }).eq('id', videoId);
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

/**
 * Resolves an auth user_id to the corresponding players_master.id.
 * The follows table FKs reference players_master.id, NOT auth user_id.
 */
export const getPlayerIdFromUserId = async (userId) => {
    const { data } = await supabase.from('players_master')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    return data?.id || null;
};

/**
 * Checks if followerPlayerId follows followingPlayerId.
 * Both args must be players_master.id (NOT auth user_id).
 */
export const checkIsFollowing = async (followerPlayerId, followingPlayerId) => {
    if (!followerPlayerId || !followingPlayerId) return false;
    const { data } = await supabase.from('follows').select('follower_id')
        .eq('follower_id', followerPlayerId)
        .eq('following_id', followingPlayerId)
        .maybeSingle();
    return !!data;
};

/**
 * Returns follower count for a given players_master.id.
 */
export const getFollowersCount = async (playerId) => {
    if (!playerId) return 0;
    const { count } = await supabase.from('follows')
        .select('follower:players_master!inner(is_deactivated)', { count: 'exact', head: true })
        .eq('following_id', playerId)
        .eq('follower.is_deactivated', false);
    return count || 0;
};

/**
 * Returns up to 3 mutual friends (people the viewing user follows, who also follow the target profile).
 */
export const getMutualFollowers = async (myPlayerId, profilePlayerId) => {
    if (!myPlayerId || !profilePlayerId) return [];
    try {
        const { data: myFollowingData } = await supabase.from('follows')
            .select('following_id')
            .eq('follower_id', myPlayerId);
            
        if (!myFollowingData || myFollowingData.length === 0) return [];
        const myFollowingIds = myFollowingData.map(f => f.following_id);
        
        const { data: mutualFollows } = await supabase.from('follows')
            .select('follower_id')
            .eq('following_id', profilePlayerId)
            .in('follower_id', myFollowingIds);
            
        if (!mutualFollows || mutualFollows.length === 0) return [];
        const mutualIds = mutualFollows.map(m => m.follower_id);
        
        const { data: mutualPlayers } = await supabase.from('players_master')
            .select('id, full_name, avatar_url')
            .in('id', mutualIds)
            .limit(3);
            
        return mutualPlayers || [];
    } catch(e) {
        console.warn("Error fetching mutuals", e);
        return [];
    }
};

/**
 * Returns the count of users that a given players_master.id follows.
 */
export const getFollowingCount = async (playerId) => {
    if (!playerId) return 0;
    const { count } = await supabase.from('follows')
        .select('following:players_master!inner(is_deactivated)', { count: 'exact', head: true })
        .eq('follower_id', playerId)
        .eq('following.is_deactivated', false);
    return count || 0;
};

export const follow = async (followerPlayerId, followingPlayerId) => {
    const payload = { follower_id: followerPlayerId, following_id: followingPlayerId };
    if (!followerPlayerId || !followingPlayerId) throw new Error("Missing IDs for follow");
    
    const { error } = await supabase.from('follows').upsert(payload, { onConflict: 'follower_id,following_id' });
    if (error) throw error;

    try {
        await createNotification({ userId: followingPlayerId, actorId: followerPlayerId, type: 'follow' });
    } catch (e) { console.warn("Notification failed", e); }
};

export const unfollow = async (followerPlayerId, followingPlayerId) => {
    const { error } = await supabase.from('follows').delete().match({ follower_id: followerPlayerId, following_id: followingPlayerId });
    if (error) throw error;
};

// ============================================================
// LIKES
// ============================================================

export const checkIsLiked = async (userId, videoId) => {
    if (!userId || !videoId) return false;
    const { data } = await supabase.from('media_likes').select('id').eq('user_id', userId).eq('video_id', videoId);
    return data && data.length > 0;
};

export const checkIsPostLiked = async (userId, postId) => {
    if (!userId || !postId) return false;
    const { data } = await supabase.from('post_likes').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle();
    return !!data;
};

export const likeVideo = async (userId, videoId) => {
    const payload = cleanPayload({ user_id: userId, video_id: videoId });
    const { error } = await supabase.from('media_likes').upsert(payload, { onConflict: 'user_id,video_id' });
    if (error) throw error;

    const { data: video } = await supabase.from('media_highlights').select('player_id').eq('id', videoId).single();
    if (video?.player_id) {
        const myPlayerId = await getPlayerIdFromUserId(userId);
        if (myPlayerId && myPlayerId !== video.player_id) {
            await createNotification({ userId: video.player_id, actorId: myPlayerId, type: 'like', videoId });
        }
    }
};

export const unlikeVideo = async (userId, videoId) => {
    const { error } = await supabase.from('media_likes').delete().match({ user_id: userId, video_id: videoId });
    if (error) throw error;
};

export const likePost = async (userId, postId) => {
    const payload = cleanPayload({ user_id: userId, post_id: postId });
    const { error } = await supabase.from('post_likes').upsert(payload, { onConflict: 'user_id,post_id' });
    if (error) throw error;

    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post?.user_id) {
        const myPlayerId = await getPlayerIdFromUserId(userId);
        if (myPlayerId && myPlayerId !== post.user_id) {
            await createNotification({ userId: post.user_id, actorId: myPlayerId, type: 'like', entityId: postId });
        }
    }
};

export const unlikePost = async (userId, postId) => {
    const { error } = await supabase.from('post_likes').delete().match({ user_id: userId, post_id: postId });
    if (error) throw error;
};

// Reorganized above. Removing old unfollow.

export const fetchFollowers = async (playerId) => {
    const { data } = await supabase.from('follows')
        .select('follower_id, follower:players_master!inner(is_deactivated)')
        .eq('following_id', playerId)
        .eq('follower.is_deactivated', false);
    return data || [];
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const createNotification = async ({ userId, actorId, type, message, entityId, videoId }) => {
    // Helper to verify UUID format (prevents DB mismatch errors if BigInts are passed)
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const payload = cleanPayload({
        user_id: userId,
        actor_id: actorId, // Auslöser
        type,
        message,
        is_read: false,
        entity_id: isUUID(entityId) ? entityId : null,
        video_id: isUUID(videoId) ? videoId : null
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
        .select('*, actor:players_master!actor_id(full_name, username, avatar_url)')
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

export const markNotificationRead = async (notificationId) => {
    await supabase.from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
};

export const deleteNotification = async (notificationId) => {
    const { error } = await supabase.from('notifications')
        .delete()
        .eq('id', notificationId);
    if (error) throw error;
};

const LIKE_MILESTONES = [10, 25, 50, 100, 250, 500];

export const checkAndCreateLikeMilestone = async (videoId, videoOwnerProfileId, likerProfileId) => {
    try {
        const { count } = await supabase.from('media_likes')
            .select('id', { count: 'exact', head: true })
            .eq('video_id', videoId);

        if (LIKE_MILESTONES.includes(count)) {
            await createNotification({
                userId: videoOwnerProfileId,
                actorId: likerProfileId,
                type: 'likes_milestone',
                message: `Dein Video hat ${count} Likes erreicht! 🎉`,
                videoId
            });
        }
    } catch (e) {
        console.warn("Milestone check failed:", e);
    }
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

export const checkIsVideoSaved = async (userId, videoId) => {
    if (!userId || !videoId) return false;
    const { data } = await supabase.from('saved_videos')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();
    return !!data;
};

export const saveVideo = async (userId, videoId) => {
    const { error } = await supabase.from('saved_videos')
        .upsert({ user_id: userId, video_id: videoId }, { onConflict: 'user_id,video_id' });
    if (error) throw error;
};

export const unsaveVideo = async (userId, videoId) => {
    const { error } = await supabase.from('saved_videos')
        .delete()
        .match({ user_id: userId, video_id: videoId });
    if (error) throw error;
};

export const fetchSavedVideos = async (userId) => {
    const { data, error } = await supabase.from('saved_videos')
        .select('*, video:media_highlights(*, media_comments(count), players_master(*, clubs(*)))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    
    return (data || []).map(item => ({
        ...(item.video || {}),
        comments_count: item.video?.media_comments?.[0]?.count || 0
    }));
};

// ============================================================
// POST INTERACTIONS
// ============================================================

// Replaced by functions above

export const checkIsPostSaved = async (userId, postId) => {
    if (!userId || !postId) return false;
    const { data } = await supabase.from('post_saves').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle();
    return !!data;
};

export const savePost = async (userId, postId) => {
    const payload = cleanPayload({ user_id: userId, post_id: postId });
    const { error } = await supabase.from('post_saves').upsert(payload, { onConflict: 'user_id,post_id' });
    if (error) throw error;
};

export const unsavePost = async (userId, postId) => {
    const { error } = await supabase.from('post_saves').delete().match({ user_id: userId, post_id: postId });
    if (error) throw error;
};

export const fetchPostComments = async (postId) => {
    const { data: comments, error } = await supabase.from('post_comments')
        .select('*, post_comment_likes:id') // Simplified for now, or use actual join if exists
        .eq('post_id', postId)
        .eq('is_under_review', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase.from('players_master')
        .select('id, user_id, full_name, avatar_url')
        .in('user_id', userIds);
        
    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.user_id] = p);

    return comments.map(comment => ({
        ...comment,
        players_master: profileMap[comment.user_id] || null
    }));
};

export const addPostComment = async (postId, userId, content) => {
    const { data, error } = await supabase.from('post_comments')
        .insert({ post_id: postId, user_id: userId, content })
        .select()
        .single();
    if (error) throw error;
    return data;
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

export const getCommentCount = async (videoId) => {
    const { count, error } = await supabase.from('media_comments')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);
    if (error) throw error;
    return count || 0;
};

export const fetchComments = async (videoId) => {
    // Step 1: Fetch all comments WITHOUT an inner join so no comments are silently
    // filtered out due to missing or indirect FK relationships between
    // media_comments.user_id (→ auth.users) and players_master.user_id.
    const { data: comments, error } = await supabase.from('media_comments')
        .select('*, comment_likes(user_id)')
        .eq('video_id', videoId)
        .eq('is_under_review', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    const userIds = [...new Set(comments.map(c => c.user_id))];
    if (userIds.length === 0) return comments;
    
    // Step 2: Fetch profiles for the unique user_ids
    const { data: profiles, error: profileError } = await supabase.from('players_master')
        .select('id, user_id, full_name, avatar_url')
        .eq('is_deactivated', false)
        .in('user_id', userIds);
        
    if (profileError) {
        console.error("Failed to fetch comment profiles:", profileError);
        return comments;
    }

    const profileMap = {};
    if (profiles) {
        profiles.forEach(p => {
            profileMap[p.user_id] = p;
        });
    }

    return comments.map(comment => ({
        ...comment,
        players_master: profileMap[comment.user_id] || null
    }));
};

export const addComment = async (videoId, userId, content) => {
    const payload = { video_id: videoId, user_id: userId, content };
    try {
        const { data, error } = await supabase.from('media_comments')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("DB Error in addComment. Payload:", payload, "Error:", error);
        throw error;
    }
};

export const deleteComment = async (commentId, type = 'video') => {
    const table = type === 'post' ? 'post_comments' : 'media_comments';
    const { error } = await supabase.from(table).delete().eq('id', commentId);
    if (error) throw error;
};

export const toggleCommentPin = async (targetId, commentId, pinState, type = 'video') => {
    const table = type === 'post' ? 'post_comments' : 'media_comments';
    const idField = type === 'video' ? 'video_id' : 'post_id';
    
    if (pinState) {
        // Unpin all other comments for this target first
        await supabase.from(table)
            .update({ is_pinned: false })
            .eq(idField, targetId);
    }

    const { error } = await supabase.from(table)
        .update({ is_pinned: pinState })
        .eq('id', commentId);
    if (error) throw error;
};

export const toggleCommentLike = async (userId, commentId, isLiked) => {
    if (!isLiked) {
        const { error } = await supabase.from('comment_likes')
            .upsert({ user_id: userId, comment_id: commentId }, { onConflict: 'user_id,comment_id' });
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
        .select('players_master!inner(is_deactivated)', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('players_master.is_deactivated', false);
        
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
    } catch (error) { /* non-critical */ }
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

export const getPlayerStats = async (playerId) => {
    const { data } = await supabase.from('player_attributes')
        .select('*')
        .eq('player_id', playerId);
    
    if (!data || data.length === 0) {
        return { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 };
    }

    const attrs = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
    const avgs = {};
    attrs.forEach(attr => {
        const sum = data.reduce((s, r) => s + (r[attr] || 50), 0);
        avgs[attr] = Math.round(sum / data.length);
    });
    return avgs;
};

// ============================================================
// ENDORSEMENTS
// ============================================================

export const getSkillEndorsements = async (playerId) => {
    const { data } = await supabase.from('endorsements')
        .select('*')
        .eq('receiver_id', playerId);
    return data || [];
};

export const endorseSkill = async (playerId, skillName) => {
    // Get sender_id from session or call must ensure it's handled.
    // Here we assume the caller handles the session.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nicht eingeloggt");

    const senderPlayerId = await getPlayerIdFromUserId(user.id);
    if (!senderPlayerId) throw new Error("Profil nicht gefunden");

    const { error } = await supabase.from('endorsements').insert({
        sender_id: senderPlayerId,
        receiver_id: playerId,
        skill_name: skillName
    });
    if (error) throw error;
};

// ============================================================
// PROFILE VIEWS
// ============================================================

export const incrementProfileViews = async (profileId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await recordProfileView(profileId, user.id);
    }
    return getProfileViewCount(profileId);
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
    } catch (error) { /* non-critical */ }
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
// CLUB TEAMS ECOSYSTEM
// ============================================================

/**
 * Autonomous team join/create: Finds or creates club, finds or creates team,
 * links player, and notifies teammates. All in a single secure RPC call.
 */
export const joinOrCreateTeam = async (clubName, ageCategory, gender) => {
    const { data, error } = await supabase.rpc('join_or_create_team', {
        p_club_name: clubName,
        p_age_category: ageCategory,
        p_gender: gender
    });
    if (error) throw error;
    return data;
};

/**
 * Fetch all teams for a given club, with the parent club data.
 */
export const fetchClubTeams = async (clubId) => {
    const { data, error } = await supabase
        .from('club_teams')
        .select('*, clubs(*)')
        .eq('club_id', clubId)
        .order('age_category');
    if (error) throw error;
    return data || [];
};

/**
 * Fetch all active players on a specific team.
 */
export const fetchTeamMembers = async (teamId) => {
    const { data, error } = await supabase
        .from('players_master')
        .select('*, club_teams(*, clubs(*))')
        .eq('current_team_id', teamId)
        .eq('is_deactivated', false);
    if (error) throw error;
    return data || [];
};

/**
 * Leave current team (sets current_team_id to null).
 */
export const leaveTeam = async (playerId) => {
    const { error } = await supabase
        .from('players_master')
        .update({ current_team_id: null })
        .eq('id', playerId);
    if (error) throw error;
};

/**
 * Fetch a club with all its teams and member counts.
 */
export const fetchClubWithTeams = async (clubId) => {
    const { data: teams, error } = await supabase
        .from('club_teams')
        .select('*')
        .eq('club_id', clubId)
        .order('age_category');
    if (error) throw error;

    // Fetch player counts per team
    const teamsWithCounts = await Promise.all(
        (teams || []).map(async (team) => {
            const { count } = await supabase
                .from('players_master')
                .select('id', { count: 'exact', head: true })
                .eq('current_team_id', team.id)
                .eq('is_deactivated', false);
            return { ...team, member_count: count || 0 };
        })
    );

    return teamsWithCounts;
};

// ============================================================
// REPORTS
// ============================================================

export const submitReport = async (reporterId, targetId, targetType, reason) => {
    const { error } = await supabase.rpc('submit_report_v2', {
        p_reporter_id: reporterId,
        p_target_id_text: targetId.toString(),
        p_target_type: targetType,
        p_reason: reason
    });
    if (error) throw error;
};

export const hideContent = async (userId, targetId, targetType) => {
    const columnMap = {
        'video': 'hidden_videos',
        'profile': 'hidden_profiles',
        'comment': 'hidden_comments'
    };
    const column = columnMap[targetType];
    if (!column) return;
    
    // Fetch current list
    const { data: profile } = await supabase.from('players_master')
        .select(column)
        .eq('user_id', userId)
        .single();
        
    if (!profile) return;
    
    const currentList = profile[column] || [];
    if (currentList.includes(targetId)) return;
    
    // Update with new ID
    const { error } = await supabase.from('players_master')
        .update({ [column]: [...currentList, targetId] })
        .eq('user_id', userId);
        
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
    const { error } = await supabase.from('blocks')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw error;
};

export const unblockUser = async (blockerId, blockedId) => {
    const { error } = await supabase.from('blocks')
        .delete()
        .match({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw error;
};

export const fetchHiddenUserIds = async (userId) => {
    const { data } = await supabase.from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    
    const ids = new Set();
    (data || []).forEach(b => {
        if (b.blocker_id === userId) ids.add(b.blocked_id);
        else ids.add(b.blocker_id);
    });
    return Array.from(ids);
};

export const checkIsBlocked = async (blockerId, blockedId) => {
    const { data } = await supabase.from('blocks')
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

// ============================================================
// NOTIFICATIONS — Test Helper
// ============================================================

/**
 * Insert a test notification for the current user.
 * Used by the Admin Dashboard "Test-Benachrichtigung feuern" button.
 */
export const sendTestNotification = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            type: 'system',
            title: 'Test-Benachrichtigung',
            message: '🔔 Echtzeit-Benachrichtigungen funktionieren! Dieser Eintrag wurde live via Supabase Realtime zugestellt.',
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

// ============================================================
// MESSAGING — Share Modal Helpers
// ============================================================

export const getRecentChatPartners = async (userId) => {
    const { data } = await supabase.from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

    const map = new Map();
    (data || []).forEach(m => {
        const pid = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (!map.has(pid)) map.set(pid, m);
    });

    if (map.size > 0) {
        const { data: users } = await supabase.from('players_master')
            .select('*')
            .in('user_id', [...map.keys()])
            .eq('is_deactivated', false);
            
        return (users || []).map(u => ({
            ...u,
            lastMsg: map.get(u.user_id)?.content,
            time: map.get(u.user_id)?.created_at,
        })).sort((a, b) => new Date(b.time) - new Date(a.time));
    }
    return [];
};

// ============================================================
// NATIONALITY VERIFICATION
// ============================================================

export const fetchNationalityVerifications = async () => {
    const { data, error } = await supabase
        .from('nationality_verifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const approveNationalityVerification = async (requestId, adminId) => {
    const { data: request, error: fetchErr } = await supabase
        .from('nationality_verifications')
        .select('*')
        .eq('id', requestId)
        .single();
    if (fetchErr) throw fetchErr;

    const { error: updateErr } = await supabase
        .from('nationality_verifications')
        .update({
            status: 'approved',
            verified_by: adminId
        })
        .eq('id', requestId);
    if (updateErr) throw updateErr;

    const { error: profileErr } = await supabase
        .from('players_master')
        .update({
            is_nat_2_verified: true
        })
        .eq('user_id', request.user_id);
    if (profileErr) throw profileErr;
};

export const rejectNationalityVerification = async (requestId, adminId) => {
    const { error: updateErr } = await supabase
        .from('nationality_verifications')
        .update({
            status: 'rejected',
            verified_by: adminId
        })
        .eq('id', requestId);
    if (updateErr) throw updateErr;
};

// ============================================================
// POST TAGS (ASSIST-TAGS)
// ============================================================

export const insertPostTags = async (tags) => {
    if (!tags || tags.length === 0) return;
    const { error } = await supabase.from('post_tags').insert(tags);
    if (error) throw error;
};

export const fetchPostTags = async (videoId = null, postId = null) => {
    let q = supabase.from('post_tags').select('*, tagged_user:players_master(*)');
    if (videoId) q = q.eq('video_id', videoId);
    if (postId) q = q.eq('post_id', postId);
    
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
};

