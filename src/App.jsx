import React, { useEffect, useState, useRef, useCallback, createContext, useContext, useMemo } from 'react';

// --- ICONS ---
import { 
  Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, 
  Activity, MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, 
  Camera, Save, UploadCloud, Mail, Users, ChevronRight, Shield, ShieldAlert, 
  Briefcase, ArrowRight, Instagram, Youtube, Video, Filter, Check, Trash2, 
  Database, Share2, Crown, FileText, Lock, Cookie, Download, 
  Flag, Bell, AlertCircle, Wifi, WifiOff, UserPlus, MapPin, Grid, List, UserCheck,
  Eye, EyeOff, Edit, Pencil, Smartphone, Key, RefreshCw, AlertTriangle, FileVideo, Film,
  Calendar, Weight, Hash, Globe, Maximize2, CheckCheck, FileBadge, BadgeCheck, SlidersHorizontal, 
  Bookmark, BookMarked, NotebookPen, CalendarDays, Megaphone, Clock, ThumbsUp, ThumbsDown, 
  HelpCircle, ChevronDown, ChevronUp, UserMinus
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const supabaseUrl = "https://wwdfagjgnliwraqrwusc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZhZ2pnbmxpd3JhcXJ3dXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjIwOTksImV4cCI6MjA4MTI5ODA5OX0.CqYfeZG_qrqeHE5PvqVviA-XYMcO0DhG51sKdIKAmJM";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MOCK_USER_ID = "user-123";
const STORAGE_KEY_SESSION = 'scoutvision_mock_session';
const STORAGE_KEY_DB = 'scoutvision_mock_db';

const POSITIONS = ['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'];
const STRONG_FOOT_OPTIONS = ['Alle', 'Links', 'Rechts', 'Beidfüßig'];
const TRANSFER_STATUS_OPTIONS = ['Alle', 'Gebunden', 'Vertrag läuft aus', 'Transferfrei'];

// ============================================================================
// 2. DESIGN SYSTEM
// ============================================================================

const styles = {
  btn: {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95",
    danger: "bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95",
    ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-bold py-2 px-4 rounded-xl transition-all"
  },
  input: "w-full bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-zinc-600",
  card: "bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden",
  header: "bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-4 py-4 pt-12 flex items-center justify-between transition-all"
};

// ============================================================================
// 3. UTILITY FUNCTIONS
// ============================================================================

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Gerade eben';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(date).toLocaleDateString('de-DE');
};

const generateVideoThumbnail = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    const timeout = setTimeout(() => resolve(null), 3000);
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration / 2); };
    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, "image/jpeg", 0.7);
      } catch (e) {
        resolve(null);
      }
    };
    video.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
  });
};

// ============================================================================
// 4. MOCK DATABASE
// ============================================================================

const INITIAL_DB = {
  players_master: [
    {
      id: 99,
      user_id: "user-demo",
      full_name: "Nico Schlotterbeck",
      first_name: "Nico",
      last_name: "Schlotterbeck",
      position_primary: "IV",
      transfer_status: "Gebunden",
      avatar_url: "https://images.unsplash.com/photo-1522778119026-d647f0565c6a?w=400&h=400&fit=crop",
      clubs: {
        id: 103,
        name: "BVB 09",
        short_name: "BVB",
        league: "Bundesliga",
        is_icon_league: true,
        color_primary: "#fbbf24",
        color_secondary: "#000000",
        logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB"
      },
      club_id: 103,
      club_role: 'coach',
      followers_count: 850,
      is_verified: true,
      height_user: 191,
      weight: 86,
      strong_foot: "Links",
      birth_date: "1999-12-01",
      jersey_number: 4,
      nationality: "Deutschland"
    },
    {
      id: 100,
      user_id: "user-test2",
      full_name: "Jamal Musiala",
      first_name: "Jamal",
      last_name: "Musiala",
      position_primary: "ZOM",
      transfer_status: "Vertrag läuft aus",
      avatar_url: "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=400&h=400&fit=crop",
      clubs: {
        id: 101,
        name: "FC Bayern München",
        short_name: "FCB",
        league: "Bundesliga",
        color_primary: "#dc2626"
      },
      club_id: 101,
      followers_count: 1200,
      is_verified: true,
      height_user: 184,
      weight: 72,
      strong_foot: "Rechts",
      birth_date: "2003-02-26",
      jersey_number: 42,
      nationality: "Deutschland"
    }
  ],
  clubs: [
    { id: 101, name: "FC Bayern München", short_name: "FCB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/dc2626/ffffff?text=FCB", is_verified: true, color_primary: "#dc2626", color_secondary: "#ffffff" },
    { id: 102, name: "FC Schalke 04", short_name: "S04", league: "2. Bundesliga", logo_url: "https://placehold.co/100x100/1d4ed8/ffffff?text=S04", is_verified: true, color_primary: "#1d4ed8", color_secondary: "#ffffff" },
    { id: 103, name: "Borussia Dortmund", short_name: "BVB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB", is_verified: true, color_primary: "#fbbf24", color_secondary: "#000000" }
  ],
  media_highlights: [
    {
      id: 1001,
      player_id: 99,
      video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      thumbnail_url: "",
      category_tag: "Training",
      likes_count: 124,
      comments_count: 12,
      created_at: new Date().toISOString()
    }
  ],
  club_events: [
    { id: 1, club_id: 103, title: "Abschlusstraining", type: "training", start_time: new Date(Date.now() + 86400000).toISOString(), location: "Trainingsplatz 1" },
    { id: 2, club_id: 103, title: "Heimspiel vs. FCB", type: "match", start_time: new Date(Date.now() + 172800000).toISOString(), location: "Stadion" }
  ],
  club_news: [
    { id: 1, club_id: 103, title: "Kaderbekanntgabe", content: "Treffpunkt am Samstag um 13:00 Uhr.", created_at: new Date().toISOString() }
  ],
  club_event_responses: [],
  scout_watchlist: [],
  direct_messages: [],
  media_likes: [],
  media_comments: [],
  follows: [],
  notifications: []
};

const loadDB = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY_DB);
    return s ? JSON.parse(s) : JSON.parse(JSON.stringify(INITIAL_DB));
  } catch {
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
};

const saveDB = (db) => localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));

// ============================================================================
// 5. MOCK SUPABASE CLIENT (ENHANCED)
// ============================================================================

const createMockClient = () => {
  let currentSession = null;
  let authListener = null;
  let db = loadDB();
  const tempStorage = new Map();

  try {
    const s = localStorage.getItem(STORAGE_KEY_SESSION);
    if (s) currentSession = JSON.parse(s);
  } catch (e) {}

  const notify = (event, session) => {
    if (authListener) authListener(event, session);
  };

  const createBuilder = (resultData, error = null) => {
    const builder = {
      data: resultData,
      error: error,
      select: () => builder,
      single: () => ({ data: Array.isArray(resultData) ? resultData[0] : resultData, error }),
      maybeSingle: () => ({ data: Array.isArray(resultData) ? (resultData.length > 0 ? resultData[0] : null) : resultData, error }),
      order: () => builder,
      limit: () => builder,
      eq: () => builder,
      in: () => builder,
      then: (resolve) => resolve({ data: resultData, error })
    };
    return builder;
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: currentSession } }),
      onAuthStateChange: (cb) => {
        authListener = cb;
        if (currentSession) cb('SIGNED_IN', currentSession);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListener = null;
              }
            }
          }
        };
      },
      signInWithPassword: async ({ email }) => {
        await new Promise(r => setTimeout(r, 500));
        currentSession = { user: { id: MOCK_USER_ID, email } };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentSession));
        notify('SIGNED_IN', currentSession);
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },
      signUp: async ({ email }) => {
        await new Promise(r => setTimeout(r, 500));
        currentSession = { user: { id: MOCK_USER_ID, email } };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentSession));
        notify('SIGNED_IN', currentSession);
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },
      signOut: async () => {
        currentSession = null;
        localStorage.removeItem(STORAGE_KEY_SESSION);
        notify('SIGNED_OUT', null);
        return { error: null };
      }
    },
    from: (table) => {
      db = loadDB();
      const tableData = db[table] || [];
      let filtered = [...tableData];

      return {
        select: (query) => {
          // Enhanced joins
          if (table === 'media_highlights' && query?.includes('players_master')) {
            filtered = filtered.map(item => ({
              ...item,
              players_master: db.players_master.find(p => p.id === item.player_id)
            }));
          }
          if (table === 'media_comments' && query?.includes('players_master')) {
            filtered = filtered.map(item => ({
              ...item,
              players_master: db.players_master.find(p => p.user_id === item.user_id)
            }));
          }
          if (table === 'scout_watchlist' && query?.includes('players_master')) {
            filtered = filtered.map(item => {
              const p = db.players_master.find(pm => pm.id === item.player_id);
              return { ...item, players_master: p };
            }).filter(item => item.players_master);
          }
          if (table === 'club_event_responses' && query?.includes('players_master')) {
            filtered = filtered.map(item => {
              const p = db.players_master.find(pm => pm.user_id === item.user_id);
              return { ...item, players_master: p };
            });
          }
          if (table === 'notifications' && query?.includes('actor')) {
            filtered = filtered.map(item => ({
              ...item,
              actor: db.players_master.find(p => p.user_id === item.actor_id)
            }));
          }
          if (table === 'follows' && query?.includes('follower')) {
            filtered = filtered.map(item => ({
              ...item,
              follower: db.players_master.find(p => p.user_id === item.follower_id)
            }));
          }

          const builder = createBuilder(filtered);

          builder.eq = (col, val) => {
            filtered = filtered.filter(r => r[col] == val);
            return updateBuilder(filtered);
          };
          builder.in = (col, val) => {
            filtered = filtered.filter(r => val.includes(r[col]));
            return updateBuilder(filtered);
          };
          builder.ilike = (col, val) => {
            const term = val.replace(/%/g, '').toLowerCase();
            filtered = filtered.filter(r => r[col]?.toLowerCase().includes(term));
            return updateBuilder(filtered);
          };
          builder.gte = (col, val) => {
            filtered = filtered.filter(r => r[col] >= val);
            return updateBuilder(filtered);
          };
          builder.lte = (col, val) => {
            filtered = filtered.filter(r => r[col] <= val);
            return updateBuilder(filtered);
          };
          builder.limit = (n) => {
            filtered = filtered.slice(0, n);
            return updateBuilder(filtered);
          };
          builder.order = (col, opts) => {
            filtered.sort((a, b) => {
              const aVal = a[col];
              const bVal = b[col];
              if (opts?.ascending) return aVal > bVal ? 1 : -1;
              return aVal < bVal ? 1 : -1;
            });
            return updateBuilder(filtered);
          };
          builder.or = (condition) => {
            // Simple OR filter for messages
            const userId = condition.match(/sender_id\.eq\.([^,]+)/)?.[1];
            if (userId) {
              filtered = filtered.filter(r => r.sender_id === userId || r.receiver_id === userId);
            }
            return updateBuilder(filtered);
          };

          function updateBuilder(newData) {
            builder.data = newData;
            builder.single = () => ({ data: newData[0] || null, error: null });
            builder.maybeSingle = () => ({ data: newData[0] || null, error: null });
            builder.then = (resolve) => resolve({ data: newData, error: null });
            return builder;
          }

          return builder;
        },
        insert: (obj) => {
          const newItem = Array.isArray(obj) ? obj.map(o => ({ ...o, id: Date.now() + Math.random(), created_at: new Date().toISOString() })) : { ...obj, id: Date.now(), created_at: new Date().toISOString() };
          if (!db[table]) db[table] = [];
          
          if (Array.isArray(newItem)) {
            db[table].unshift(...newItem);
          } else {
            db[table].unshift(newItem);
          }
          
          saveDB(db);
          return createBuilder(Array.isArray(newItem) ? newItem : [newItem]);
        },
        update: (obj) => ({
          eq: (col, val) => {
            const idx = db[table].findIndex(r => r[col] == val);
            let res = null;
            if (idx >= 0) {
              db[table][idx] = { ...db[table][idx], ...obj };
              saveDB(db);
              res = db[table][idx];
            }
            return createBuilder(res);
          }
        }),
        delete: () => ({
          match: (filter) => {
            if (!db[table]) return { error: null };
            db[table] = db[table].filter(row => !Object.keys(filter).every(key => row[key] === filter[key]));
            saveDB(db);
            return createBuilder(null);
          }
        }),
        upsert: (obj) => {
          if (!db[table]) db[table] = [];
          let existingIdx = -1;

          if (table === 'club_event_responses') {
            existingIdx = db[table].findIndex(r => r.user_id === obj.user_id && r.event_id === obj.event_id);
          } else if (table === 'scout_watchlist') {
            existingIdx = db[table].findIndex(r => r.scout_id === obj.scout_id && r.player_id === obj.player_id);
          } else if (table === 'media_likes') {
            existingIdx = db[table].findIndex(r => r.user_id === obj.user_id && r.media_id === obj.media_id);
          } else if (obj.id) {
            existingIdx = db[table].findIndex(r => r.id === obj.id);
          } else if (obj.user_id) {
            existingIdx = db[table].findIndex(r => r.user_id === obj.user_id);
          }

          let result;
          if (existingIdx >= 0) {
            db[table][existingIdx] = { ...db[table][existingIdx], ...obj };
            result = db[table][existingIdx];
          } else {
            result = { ...obj, id: obj.id || Date.now(), created_at: obj.created_at || new Date().toISOString() };
            db[table].push(result);
          }
          saveDB(db);
          return createBuilder(result);
        }
      };
    },
    storage: {
      from: () => ({
        upload: async (path, file) => {
          const url = URL.createObjectURL(file);
          tempStorage.set(path, url);
          return { error: null };
        },
        getPublicUrl: (path) => {
          const url = tempStorage.get(path) || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
          return { data: { publicUrl: url } };
        }
      })
    },
    channel: () => ({
      on: () => ({
        subscribe: () => {}
      }),
      subscribe: () => {}
    }),
    removeChannel: () => {}
  };
};

const supabase = createMockClient();

// ============================================================================
// 6. CONTEXTS
// ============================================================================

const AuthContext = createContext(null);
const ToastContext = createContext(null);
const ModalContext = createContext(null);

// ============================================================================
// 7. CUSTOM HOOKS
// ============================================================================

// Enhanced Profile Hook
const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      let { data } = await supabase
        .from('players_master')
        .select('*, clubs(*)')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!data) {
        const newProfile = {
          user_id: session.user.id,
          full_name: 'Neuer Spieler',
          position_primary: 'ZM',
          transfer_status: 'Gebunden',
          followers_count: 0,
          is_verified: false,
          is_admin: false,
          club_role: 'player'
        };
        const res = await supabase.from('players_master').upsert(newProfile).select().single();
        data = res.data || newProfile;
      }

      setProfile(data);
    } catch (e) {
      console.error("Profile fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, refresh: fetchProfile, setProfile };
};

// Follow System Hook
const useFollow = (session) => {
  const [following, setFollowing] = useState(new Set());

  const checkFollowing = useCallback(async (targetUserId) => {
    if (!session?.user?.id) return false;
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();
    return !!data;
  }, [session]);

  const toggleFollow = useCallback(async (targetUserId, targetProfile) => {
    if (!session?.user?.id) return false;

    const isFollowing = await checkFollowing(targetUserId);

    if (isFollowing) {
      // Unfollow
      await supabase.from('follows').delete().match({
        follower_id: session.user.id,
        following_id: targetUserId
      });
      
      // Update follower count
      const newCount = Math.max(0, (targetProfile.followers_count || 0) - 1);
      await supabase.from('players_master').update({ followers_count: newCount }).eq('user_id', targetUserId);
      
      setFollowing(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      
      return false;
    } else {
      // Follow
      await supabase.from('follows').insert({
        follower_id: session.user.id,
        following_id: targetUserId
      });
      
      // Update follower count
      const newCount = (targetProfile.followers_count || 0) + 1;
      await supabase.from('players_master').update({ followers_count: newCount }).eq('user_id', targetUserId);
      
      // Create notification
      await supabase.from('notifications').insert({
        recipient_id: targetUserId,
        actor_id: session.user.id,
        type: 'follow',
        created_at: new Date().toISOString()
      });
      
      setFollowing(prev => new Set(prev).add(targetUserId));
      
      return true;
    }
  }, [session, checkFollowing]);

  return { following, checkFollowing, toggleFollow };
};

// Like System Hook
const useLike = (session) => {
  const [likes, setLikes] = useState(new Map());

  const checkLiked = useCallback(async (mediaId) => {
    if (!session?.user?.id) return false;
    const { data } = await supabase
      .from('media_likes')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('media_id', mediaId)
      .maybeSingle();
    return !!data;
  }, [session]);

  const toggleLike = useCallback(async (mediaId, ownerId) => {
    if (!session?.user?.id) return false;

    const isLiked = await checkLiked(mediaId);

    if (isLiked) {
      // Unlike
      await supabase.from('media_likes').delete().match({
        user_id: session.user.id,
        media_id: mediaId
      });
      
      // Update like count
      const { data: media } = await supabase.from('media_highlights').select('likes_count').eq('id', mediaId).single();
      const newCount = Math.max(0, (media?.likes_count || 0) - 1);
      await supabase.from('media_highlights').update({ likes_count: newCount }).eq('id', mediaId);
      
      setLikes(prev => {
        const next = new Map(prev);
        next.delete(mediaId);
        return next;
      });
      
      return false;
    } else {
      // Like
      await supabase.from('media_likes').insert({
        user_id: session.user.id,
        media_id: mediaId
      });
      
      // Update like count
      const { data: media } = await supabase.from('media_highlights').select('likes_count').eq('id', mediaId).single();
      const newCount = (media?.likes_count || 0) + 1;
      await supabase.from('media_highlights').update({ likes_count: newCount }).eq('id', mediaId);
      
      // Create notification (only if not own content)
      if (ownerId && ownerId !== session.user.id) {
        await supabase.from('notifications').insert({
          recipient_id: ownerId,
          actor_id: session.user.id,
          type: 'like',
          target_id: mediaId,
          created_at: new Date().toISOString()
        });
      }
      
      setLikes(prev => new Map(prev).set(mediaId, true));
      
      return true;
    }
  }, [session, checkLiked]);

  return { likes, checkLiked, toggleLike };
};

// Watchlist Hook
const useWatchlist = (session) => {
  const [watchlist, setWatchlist] = useState([]);

  const fetchWatchlist = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('scout_watchlist')
      .select('*, players_master(*)')
      .eq('scout_id', session.user.id);
    setWatchlist(data || []);
  }, [session]);

  const toggleWatchlist = useCallback(async (playerId) => {
    if (!session?.user?.id) return;

    const existing = watchlist.find(w => w.player_id === playerId);

    if (existing) {
      await supabase.from('scout_watchlist').delete().match({
        scout_id: session.user.id,
        player_id: playerId
      });
    } else {
      await supabase.from('scout_watchlist').insert({
        scout_id: session.user.id,
        player_id: playerId
      });
    }

    fetchWatchlist();
  }, [session, watchlist, fetchWatchlist]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return { watchlist, toggleWatchlist, refresh: fetchWatchlist };
};

// ============================================================================
// 8. UI COMPONENTS - SHARED
// ============================================================================

// Dual Range Slider
const DualRangeSlider = ({ min, max, value, onChange, formatLabel }) => {
  const [minVal, maxVal] = value;
  const minRef = useRef(null);
  const maxRef = useRef(null);
  const range = useRef(null);
  const getPercent = useCallback((value) => Math.round(((value - min) / (max - min)) * 100), [min, max]);

  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxVal);
    if (range.current) {
      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent, maxVal]);

  const sliderStyles = `
    .thumb { pointer-events: none; position: absolute; height: 0; width: 100%; outline: none; z-index: 20; }
    .thumb::-webkit-slider-thumb { -webkit-appearance: none; -webkit-tap-highlight-color: transparent; background-color: white; border: 2px solid #2563eb; border-radius: 50%; cursor: pointer; height: 18px; width: 18px; margin-top: 4px; pointer-events: all; position: relative; }
    .thumb::-moz-range-thumb { -webkit-appearance: none; -webkit-tap-highlight-color: transparent; background-color: white; border: 2px solid #2563eb; border-radius: 50%; cursor: pointer; height: 18px; width: 18px; margin-top: 4px; pointer-events: all; position: relative; }
    .slider-track-bg { position: absolute; width: 100%; height: 4px; background-color: #3f3f46; border-radius: 3px; z-index: 1; }
    .slider-track-fill { position: absolute; height: 4px; background-color: #2563eb; border-radius: 3px; z-index: 2; }
  `;

  return (
    <div className="relative w-full h-12 flex items-center justify-center select-none touch-none">
      <style>{sliderStyles}</style>
      <input
        type="range"
        min={min}
        max={max}
        value={minVal}
        ref={minRef}
        onChange={(event) => {
          const value = Math.min(Number(event.target.value), maxVal - 1);
          onChange([value, maxVal]);
        }}
        className="thumb"
        style={{ zIndex: minVal > max - 100 ? "5" : "3" }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={maxVal}
        ref={maxRef}
        onChange={(event) => {
          const value = Math.max(Number(event.target.value), minVal + 1);
          onChange([minVal, value]);
        }}
        className="thumb"
        style={{ zIndex: 4 }}
      />
      <div className="relative w-full">
        <div className="slider-track-bg" />
        <div ref={range} className="slider-track-fill" />
        <div className="absolute top-4 left-0 text-xs text-zinc-400 font-mono font-bold mt-1">
          {formatLabel ? formatLabel(minVal) : minVal}
        </div>
        <div className="absolute top-4 right-0 text-xs text-zinc-400 font-mono font-bold mt-1">
          {formatLabel ? formatLabel(maxVal) : maxVal}
        </div>
      </div>
    </div>
  );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-6 left-0 right-0 z-[120] flex flex-col items-center gap-3 px-4 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        onClick={() => removeToast(t.id)}
        className="pointer-events-auto bg-zinc-900/90 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top"
      >
        {t.content}
      </div>
    ))}
  </div>
);

// Guest Fallback
const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
  <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
    <div className="w-24 h-24 mb-6 bg-zinc-900/50 rounded-full flex items-center justify-center border border-white/10">
      <Icon size={40} className="text-zinc-500" />
    </div>
    <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
    <p className="mb-8 text-sm text-zinc-400">{text}</p>
    <button onClick={onLogin} className={`${styles.btn.primary} w-full max-w-xs`}>
      Anmelden
    </button>
  </div>
);

// Error Boundary
class SafeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("UI Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500 bg-red-500/10 rounded-xl m-4">
          Ein Fehler ist aufgetreten.
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// 9. MODALS
// ============================================================================

const LoginModal = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await supabase.auth.signUp({ email, password });
      } else {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        onSuccess(data.session);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
      <div className={`${styles.card} w-full max-w-sm p-8 relative`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition">
          <X />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className={styles.input}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Passwort"
            required
            className={styles.input}
          />
          <button disabled={loading} className={`${styles.btn.primary} w-full`}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (mode === 'login' ? 'Einloggen' : 'Registrieren')}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-zinc-500 text-xs w-full mt-4 hover:text-zinc-300 transition"
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </div>
    </div>
  );
};

const UploadModal = ({ player, onClose, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Training');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload video
      const videoPath = `${player.user_id}/${Date.now()}.mp4`;
      await supabase.storage.from('player-videos').upload(videoPath, file);
      const { data: { publicUrl: videoUrl } } = supabase.storage.from('player-videos').getPublicUrl(videoPath);

      // Generate thumbnail
      const thumbnailBlob = await generateVideoThumbnail(file);
      let thumbnailUrl = '';
      if (thumbnailBlob) {
        const thumbPath = `${player.user_id}/thumb_${Date.now()}.jpg`;
        await supabase.storage.from('player-videos').upload(thumbPath, thumbnailBlob);
        const { data: { publicUrl } } = supabase.storage.from('player-videos').getPublicUrl(thumbPath);
        thumbnailUrl = publicUrl;
      }

      // ✅ FIX: Insert media highlight
      await supabase.from('media_highlights').insert({
        player_id: player.id,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category_tag: category,
        likes_count: 0,
        comments_count: 0
      });

      onUploadComplete();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`${styles.card} w-full max-w-md p-6`}>
        <h3 className="text-white font-bold mb-4 text-xl">Video hochladen</h3>
        <div className="space-y-4">
          <input
            type="file"
            accept="video/*"
            onChange={e => setFile(e.target.files[0])}
            className="text-white mb-4 w-full"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={styles.input}
          >
            <option>Training</option>
            <option>Match</option>
            <option>Skills</option>
            <option>Tore</option>
          </select>
          <div className="flex gap-3">
            <button onClick={onClose} className={`${styles.btn.secondary} flex-1`}>
              Abbrechen
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`${styles.btn.primary} flex-1`}
            >
              {uploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Hochladen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditProfileModal = ({ player, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: player.full_name || '',
    position_primary: player.position_primary || 'ZM',
    height_user: player.height_user || '',
    weight: player.weight || '',
    strong_foot: player.strong_foot || 'Rechts',
    birth_date: player.birth_date || '',
    jersey_number: player.jersey_number || '',
    nationality: player.nationality || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await supabase
        .from('players_master')
        .update(formData)
        .eq('id', player.id)
        .select()
        .single();
      onUpdate(data);
      onClose();
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`${styles.card} w-full max-w-md p-6 max-h-[80vh] overflow-y-auto`}>
        <h3 className="text-white font-bold mb-4 text-xl">Profil bearbeiten</h3>
        <div className="space-y-4">
          <input
            value={formData.full_name}
            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            className={styles.input}
            placeholder="Voller Name"
          />
          <select
            value={formData.position_primary}
            onChange={e => setFormData({ ...formData, position_primary: e.target.value })}
            className={styles.input}
          >
            {POSITIONS.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              value={formData.height_user}
              onChange={e => setFormData({ ...formData, height_user: e.target.value })}
              className={styles.input}
              placeholder="Größe (cm)"
            />
            <input
              type="number"
              value={formData.weight}
              onChange={e => setFormData({ ...formData, weight: e.target.value })}
              className={styles.input}
              placeholder="Gewicht (kg)"
            />
          </div>
          <select
            value={formData.strong_foot}
            onChange={e => setFormData({ ...formData, strong_foot: e.target.value })}
            className={styles.input}
          >
            <option>Links</option>
            <option>Rechts</option>
            <option>Beidfüßig</option>
          </select>
          <input
            type="date"
            value={formData.birth_date}
            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
            className={styles.input}
          />
          <input
            type="number"
            value={formData.jersey_number}
            onChange={e => setFormData({ ...formData, jersey_number: e.target.value })}
            className={styles.input}
            placeholder="Trikotnummer"
          />
          <input
            value={formData.nationality}
            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
            className={styles.input}
            placeholder="Nationalität"
          />
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className={`${styles.btn.secondary} flex-1`}>
              Abbrechen
            </button>
            <button onClick={handleSave} disabled={saving} className={`${styles.btn.primary} flex-1`}>
              {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentsModal = ({ video, session, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('media_comments')
      .select('*, players_master(*)')
      .eq('media_id', video.id)
      .order('created_at', { ascending: false });
    setComments(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user?.id) return;

    setLoading(true);
    try {
      await supabase.from('media_comments').insert({
        media_id: video.id,
        user_id: session.user.id,
        content: newComment.trim()
      });

      // Update comment count
      const newCount = (video.comments_count || 0) + 1;
      await supabase.from('media_highlights').update({ comments_count: newCount }).eq('id', video.id);

      // Create notification
      if (video.players_master?.user_id && video.players_master.user_id !== session.user.id) {
        await supabase.from('notifications').insert({
          recipient_id: video.players_master.user_id,
          actor_id: session.user.id,
          type: 'comment',
          target_id: video.id
        });
      }

      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end bg-black/80 backdrop-blur-sm animate-in slide-in-from-bottom">
      <div className={`${styles.card} w-full max-h-[80vh] rounded-t-3xl rounded-b-none flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-white font-bold">Kommentare ({comments.length})</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                {c.players_master?.avatar_url && (
                  <img src={c.players_master.avatar_url} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-sm">{c.players_master?.full_name || 'Unbekannt'}</span>
                  <span className="text-zinc-500 text-xs">{formatTimeAgo(c.created_at)}</span>
                </div>
                <p className="text-zinc-300 text-sm">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        {session && (
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-3">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Kommentar schreiben..."
              className={`${styles.input} flex-1`}
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className={`${styles.btn.primary} px-6`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const WatchlistModal = ({ session, onClose, onUserClick }) => {
  const { watchlist, toggleWatchlist } = useWatchlist(session);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${styles.card} w-full max-w-md max-h-[80vh] flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-white font-bold text-xl">Meine Watchlist</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {watchlist.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <Bookmark size={40} className="mx-auto mb-4 opacity-20" />
              <p>Noch keine Spieler auf deiner Watchlist.</p>
            </div>
          ) : (
            watchlist.map(w => (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-white/5 hover:bg-zinc-900 transition"
              >
                <div
                  onClick={() => {
                    onClose();
                    onUserClick(w.players_master);
                  }}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
                    {w.players_master?.avatar_url && (
                      <img src={w.players_master.avatar_url} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-bold">{w.players_master?.full_name}</div>
                    <div className="text-zinc-500 text-xs">{w.players_master?.position_primary}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist(w.player_id)}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 10. MAIN SCREENS
// ============================================================================

const HomeScreen = ({ session, onUserClick, onLoginReq }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggleLike, checkLiked } = useLike(session);
  const [showComments, setShowComments] = useState(null);
  const [likedVideos, setLikedVideos] = useState(new Set());

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media_highlights')
      .select('*, players_master(*)')
      .order('created_at', { ascending: false })
      .limit(20);
    setFeed(data || []);
    
    // Check which videos are liked
    if (session?.user?.id && data) {
      const liked = new Set();
      for (const video of data) {
        if (await checkLiked(video.id)) {
          liked.add(video.id);
        }
      }
      setLikedVideos(liked);
    }
    
    setLoading(false);
  };

  const handleLike = async (video) => {
    if (!session) {
      onLoginReq();
      return;
    }

    const isLiked = await toggleLike(video.id, video.players_master?.user_id);
    
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (isLiked) next.add(video.id);
      else next.delete(video.id);
      return next;
    });

    // Update local count
    setFeed(prev => prev.map(v => 
      v.id === video.id 
        ? { ...v, likes_count: isLiked ? (v.likes_count || 0) + 1 : Math.max(0, (v.likes_count || 0) - 1) }
        : v
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="pb-24 bg-black min-h-screen">
      <div className={styles.header}>
        <h2 className="text-2xl font-black text-white">Feed</h2>
      </div>
      <div className="space-y-0">
        {feed.map(video => (
          <div key={video.id} className="bg-black border-b border-zinc-900">
            {/* Video */}
            <div className="aspect-[4/5] bg-zinc-900 relative">
              <video
                src={video.video_url}
                className="w-full h-full object-cover"
                loop
                playsInline
                controls
              />
              {/* User Info Overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <div
                  onClick={() => onUserClick(video.players_master)}
                  className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border-2 border-white cursor-pointer"
                >
                  {video.players_master?.avatar_url && (
                    <img src={video.players_master.avatar_url} className="w-full h-full object-cover" />
                  )}
                </div>
                <div onClick={() => onUserClick(video.players_master)} className="cursor-pointer">
                  <div className="text-white font-bold text-sm drop-shadow-lg">
                    {video.players_master?.full_name}
                  </div>
                  <div className="text-zinc-300 text-xs drop-shadow-lg">
                    {video.category_tag}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 px-4 py-3">
              <button
                onClick={() => handleLike(video)}
                className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition"
              >
                <Heart
                  size={24}
                  className={likedVideos.has(video.id) ? 'fill-red-500 text-red-500' : ''}
                />
                <span className="text-sm font-bold">{video.likes_count || 0}</span>
              </button>
              <button
                onClick={() => setShowComments(video)}
                className="flex items-center gap-2 text-zinc-400 hover:text-blue-500 transition"
              >
                <MessageCircle size={24} />
                <span className="text-sm font-bold">{video.comments_count || 0}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showComments && (
        <CommentsModal
          video={showComments}
          session={session}
          onClose={() => setShowComments(null)}
        />
      )}
    </div>
  );
};

const SearchScreen = ({ session, onUserClick, onLoginReq }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const { watchlist, toggleWatchlist } = useWatchlist(session);

  const [filters, setFilters] = useState({
    minHeight: 0,
    maxHeight: 220,
    minAge: 16,
    maxAge: 40,
    positions: [],
    strongFoot: 'Alle',
    transferStatus: 'Alle',
    clubId: null,
    nationality: ''
  });

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      let dbQuery = supabase.from('players_master').select('*, clubs(*)');

      if (query.trim()) {
        dbQuery = dbQuery.ilike('full_name', `%${query}%`);
      }

      if (filters.positions.length > 0) {
        dbQuery = dbQuery.in('position_primary', filters.positions);
      }

      if (filters.minHeight > 0) {
        dbQuery = dbQuery.gte('height_user', filters.minHeight);
      }

      if (filters.maxHeight < 220) {
        dbQuery = dbQuery.lte('height_user', filters.maxHeight);
      }

      if (filters.strongFoot !== 'Alle') {
        dbQuery = dbQuery.eq('strong_foot', filters.strongFoot);
      }

      if (filters.transferStatus !== 'Alle') {
        dbQuery = dbQuery.eq('transfer_status', filters.transferStatus);
      }

      if (filters.clubId) {
        dbQuery = dbQuery.eq('club_id', filters.clubId);
      }

      if (filters.nationality) {
        dbQuery = dbQuery.ilike('nationality', `%${filters.nationality}%`);
      }

      const { data } = await dbQuery.limit(50);

      // ✅ FIX: Client-side age filtering
      let filteredData = data || [];
      if (filters.minAge > 16 || filters.maxAge < 40) {
        filteredData = filteredData.filter(p => {
          const age = calculateAge(p.birth_date);
          if (!age) return false;
          return age >= filters.minAge && age <= filters.maxAge;
        });
      }

      setResults(filteredData);
      setLoading(false);
    };

    const timer = setTimeout(fetchResults, 400);
    return () => clearTimeout(timer);
  }, [query, filters]);

  const isOnWatchlist = (playerId) => {
    return watchlist.some(w => w.player_id === playerId);
  };

  const handleWatchlistToggle = (e, playerId) => {
    e.stopPropagation();
    if (!session) {
      onLoginReq();
      return;
    }
    toggleWatchlist(playerId);
  };

  return (
    <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
      <div className={styles.header}>
        <h2 className="text-2xl font-black text-white">Scouting</h2>
      </div>

      <div className="px-4 mt-4">
        <div className="relative mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
            <input
              placeholder="Spieler suchen..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`${styles.input} pl-12 pr-12`}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-2 top-2 p-2 rounded-lg transition ${
                showFilters ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
          <button
            onClick={() => {
              if (!session) {
                onLoginReq();
                return;
              }
              setShowWatchlist(true);
            }}
            className="bg-zinc-800 p-3.5 rounded-xl border border-white/10 text-white hover:bg-zinc-700 transition relative"
          >
            <Bookmark size={22} />
            {watchlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {watchlist.length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-6 shadow-2xl">
            {/* Positions */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Positionen</label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map(pos => (
                  <button
                    key={pos}
                    onClick={() =>
                      setFilters(prev => ({
                        ...prev,
                        positions: prev.positions.includes(pos)
                          ? prev.positions.filter(p => p !== pos)
                          : [...prev.positions, pos]
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      filters.positions.includes(pos)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Größe (cm)</label>
              <DualRangeSlider
                min={150}
                max={220}
                value={[filters.minHeight || 150, filters.maxHeight || 220]}
                onChange={([min, max]) => setFilters(prev => ({ ...prev, minHeight: min, maxHeight: max }))}
                formatLabel={val => `${val}cm`}
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Alter</label>
              <DualRangeSlider
                min={16}
                max={40}
                value={[filters.minAge, filters.maxAge]}
                onChange={([min, max]) => setFilters(prev => ({ ...prev, minAge: min, maxAge: max }))}
                formatLabel={val => `${val}J`}
              />
            </div>

            {/* Strong Foot */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Starker Fuß</label>
              <select
                value={filters.strongFoot}
                onChange={e => setFilters(prev => ({ ...prev, strongFoot: e.target.value }))}
                className={styles.input}
              >
                {STRONG_FOOT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Transfer Status */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Vertragsstatus</label>
              <select
                value={filters.transferStatus}
                onChange={e => setFilters(prev => ({ ...prev, transferStatus: e.target.value }))}
                className={styles.input}
              >
                {TRANSFER_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Nationalität</label>
              <input
                value={filters.nationality}
                onChange={e => setFilters(prev => ({ ...prev, nationality: e.target.value }))}
                placeholder="z.B. Deutschland"
                className={styles.input}
              />
            </div>

            <button
              onClick={() =>
                setFilters({
                  minHeight: 0,
                  maxHeight: 220,
                  minAge: 16,
                  maxAge: 40,
                  positions: [],
                  strongFoot: 'Alle',
                  transferStatus: 'Alle',
                  clubId: null,
                  nationality: ''
                })
              }
              className={`${styles.btn.secondary} w-full`}
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="animate-spin text-blue-500 mx-auto" size={40} />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <Search size={40} className="mx-auto mb-4 opacity-20" />
              <p>Keine Spieler gefunden.</p>
            </div>
          ) : (
            results.map(p => (
              <div
                key={p.id}
                onClick={() => onUserClick(p)}
                className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${styles.card}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 relative">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-zinc-600 m-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-base">{p.full_name}</h3>
                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">
                      {p.position_primary}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <Shield size={10} />
                    {p.clubs?.name || 'Vereinslos'}
                    {p.birth_date && (
                      <>
                        <span>•</span>
                        <span>{calculateAge(p.birth_date)}J</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={e => handleWatchlistToggle(e, p.id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <Bookmark
                    size={20}
                    className={isOnWatchlist(p.id) ? 'fill-blue-500 text-blue-500' : 'text-zinc-600'}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showWatchlist && (
        <WatchlistModal
          session={session}
          onClose={() => setShowWatchlist(false)}
          onUserClick={p => {
            setShowWatchlist(false);
            onUserClick(p);
          }}
        />
      )}
    </div>
  );
};

const InboxScreen = ({ session, onSelectChat, onUserClick, onLoginReq }) => {
  const [subTab, setSubTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    if (subTab === 'notifications') {
      fetchNotifications();
    } else {
      fetchChats();
    }
  }, [subTab, session]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:players_master!actor_id(full_name, avatar_url)')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    const map = new Map();
    (data || []).forEach(m => {
      const partnerId = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
      if (!map.has(partnerId)) {
        map.set(partnerId, m);
      }
    });

    if (map.size > 0) {
      const { data: users } = await supabase
        .from('players_master')
        .select('*')
        .in('user_id', [...map.keys()]);

      if (users) {
        setChats(
          users
            .map(u => ({
              ...u,
              lastMsg: map.get(u.user_id).content,
              time: map.get(u.user_id).created_at
            }))
            .sort((a, b) => new Date(b.time) - new Date(a.time))
        );
      }
    }
  };

  if (!session) {
    return (
      <div className="pt-20">
        <GuestFallback
          icon={Mail}
          title="Posteingang"
          text="Melde dich an, um Benachrichtigungen zu sehen und mit anderen zu chatten."
          onLogin={onLoginReq}
        />
      </div>
    );
  }

  const getNotificationText = (n) => {
    switch (n.type) {
      case 'like':
        return 'hat dein Video geliked.';
      case 'follow':
        return 'folgt dir jetzt.';
      case 'comment':
        return 'hat dein Video kommentiert.';
      default:
        return 'hat interagiert.';
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
      <div className={styles.header}>
        <h2 className="text-2xl font-black text-white">Inbox</h2>
      </div>

      <div className="px-4 mt-4">
        <div className="flex bg-zinc-900/50 rounded-xl p-1 mb-6 border border-white/5 relative">
          <button
            onClick={() => setSubTab('notifications')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${
              subTab === 'notifications'
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Mitteilungen
          </button>
          <button
            onClick={() => setSubTab('messages')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${
              subTab === 'messages'
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Nachrichten
          </button>
        </div>

        <div className="space-y-3">
          {subTab === 'notifications' &&
            (notifications.length > 0 ? (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-4 p-4 ${styles.card}`}>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shrink-0 mt-1">
                    {n.actor?.avatar_url ? (
                      <img src={n.actor.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-zinc-500 m-2.5" />
                    )}
                  </div>
                  <div className="flex-1 text-sm text-white pt-1">
                    <span className="font-bold">{n.actor?.full_name || 'Jemand'}</span>{' '}
                    <span className="text-zinc-400">{getNotificationText(n)}</span>
                    <div className="text-zinc-500 text-xs mt-1">{formatTimeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-20 flex flex-col items-center">
                <Bell size={40} className="mb-4 opacity-20" />
                <p>Alles ruhig hier.</p>
              </div>
            ))}

          {subTab === 'messages' &&
            (chats.length > 0 ? (
              chats.map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelectChat(c)}
                  className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition ${styles.card}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition border border-white/10">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-base font-bold text-white truncate">{c.full_name}</h4>
                      <span className="text-[10px] text-zinc-500">{formatTimeAgo(c.time)}</span>
                    </div>
                    <p className="text-sm text-zinc-400 truncate">{c.lastMsg}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-20 flex flex-col items-center">
                <Mail size={40} className="mb-4 opacity-20" />
                <p>Keine Chats vorhanden.</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({ partner, session, onClose, onUserClick }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${partner.user_id}),and(sender_id.eq.${partner.user_id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await supabase.from('direct_messages').insert({
      content: newMessage.trim(),
      sender_id: session.user.id,
      receiver_id: partner.user_id
    });

    setNewMessage('');
    fetchMessages();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900">
        <button onClick={onClose} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <div
          onClick={() => {
            onClose();
            onUserClick(partner);
          }}
          className="flex items-center gap-3 flex-1 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
            {partner.avatar_url && <img src={partner.avatar_url} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-bold">{partner.full_name}</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === session.user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                msg.sender_id === session.user.id
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-zinc-800 text-white rounded-bl-sm'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">{formatTimeAgo(msg.created_at)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-zinc-800 bg-zinc-900 flex gap-3">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Nachricht schreiben..."
          className={`${styles.input} flex-1`}
        />
        <button type="submit" disabled={!newMessage.trim()} className={`${styles.btn.primary} px-6`}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

const ProfileScreen = ({ player, isOwnProfile, session, onBack, onLogout, onClubClick, onLoginReq }) => {
  const [highlights, setHighlights] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [localPlayer, setLocalPlayer] = useState(player);
  const { toggleFollow, checkFollowing } = useFollow(session);

  useEffect(() => {
    fetchHighlights();
    checkIfFollowing();
  }, [player]);

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from('media_highlights')
      .select('*')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false });
    setHighlights(data || []);
  };

  const checkIfFollowing = async () => {
    if (!session?.user?.id || isOwnProfile) return;
    const following = await checkFollowing(player.user_id);
    setIsFollowing(following);
  };

  const handleFollowToggle = async () => {
    if (!session) {
      onLoginReq();
      return;
    }
    const nowFollowing = await toggleFollow(player.user_id, localPlayer);
    setIsFollowing(nowFollowing);
    setLocalPlayer(prev => ({
      ...prev,
      followers_count: nowFollowing ? (prev.followers_count || 0) + 1 : Math.max(0, (prev.followers_count || 0) - 1)
    }));
  };

  const age = calculateAge(localPlayer.birth_date);

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-zinc-900 to-black" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white"
        >
          <ArrowLeft size={20} />
        </button>
        {isOwnProfile && (
          <button
            onClick={onLogout}
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white"
          >
            <LogOut size={20} />
          </button>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden border-4 border-black">
            {localPlayer.avatar_url ? (
              <img src={localPlayer.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-zinc-600 m-8" />
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-20 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-white">{localPlayer.full_name}</h1>
          {localPlayer.is_verified && <BadgeCheck size={20} className="text-blue-500" />}
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-zinc-400 mb-4">
          <span>{localPlayer.position_primary}</span>
          {age && (
            <>
              <span>•</span>
              <span>{age} Jahre</span>
            </>
          )}
          {localPlayer.jersey_number && (
            <>
              <span>•</span>
              <span>#{localPlayer.jersey_number}</span>
            </>
          )}
        </div>

        {/* Club */}
        {localPlayer.clubs && (
          <button
            onClick={() => onClubClick(localPlayer.clubs)}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-zinc-900 rounded-xl border border-white/10 hover:bg-zinc-800 transition mb-4"
          >
            <Shield size={16} className="text-zinc-400" />
            <span className="text-white font-bold text-sm">{localPlayer.clubs.name}</span>
          </button>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-white font-bold text-xl">{highlights.length}</div>
            <div className="text-zinc-500 text-xs">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-xl">{localPlayer.followers_count || 0}</div>
            <div className="text-zinc-500 text-xs">Follower</div>
          </div>
        </div>

        {/* Actions */}
        {isOwnProfile ? (
          <div className="flex gap-3 mb-6">
            <button onClick={() => setShowEditModal(true)} className={`${styles.btn.secondary} flex-1`}>
              <Edit size={18} className="inline mr-2" />
              Profil bearbeiten
            </button>
          </div>
        ) : (
          <div className="flex gap-3 mb-6">
            <button onClick={handleFollowToggle} className={`${styles.btn.primary} flex-1`}>
              {isFollowing ? (
                <>
                  <UserMinus size={18} className="inline mr-2" />
                  Nicht mehr folgen
                </>
              ) : (
                <>
                  <UserPlus size={18} className="inline mr-2" />
                  Folgen
                </>
              )}
            </button>
          </div>
        )}

        {/* Player Details */}
        <div className={`${styles.card} p-4 mb-6 text-left`}>
          <h3 className="text-white font-bold mb-3">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {localPlayer.height_user && (
              <div>
                <span className="text-zinc-500">Größe</span>
                <p className="text-white font-bold">{localPlayer.height_user} cm</p>
              </div>
            )}
            {localPlayer.weight && (
              <div>
                <span className="text-zinc-500">Gewicht</span>
                <p className="text-white font-bold">{localPlayer.weight} kg</p>
              </div>
            )}
            {localPlayer.strong_foot && (
              <div>
                <span className="text-zinc-500">Stärker Fuß</span>
                <p className="text-white font-bold">{localPlayer.strong_foot}</p>
              </div>
            )}
            {localPlayer.nationality && (
              <div>
                <span className="text-zinc-500">Nationalität</span>
                <p className="text-white font-bold">{localPlayer.nationality}</p>
              </div>
            )}
            {localPlayer.transfer_status && (
              <div>
                <span className="text-zinc-500">Status</span>
                <p className="text-white font-bold">{localPlayer.transfer_status}</p>
              </div>
            )}
          </div>
        </div>

        {/* Highlights Grid */}
        <div>
          <h3 className="text-white font-bold mb-4 text-left">Highlights</h3>
          {highlights.length === 0 ? (
            <div className="text-center text-zinc-500 py-20">
              <Video size={40} className="mx-auto mb-4 opacity-20" />
              <p>Noch keine Videos hochgeladen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {highlights.map(h => (
                <div key={h.id} className="aspect-square bg-zinc-900 rounded overflow-hidden">
                  <video src={h.video_url} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          player={localPlayer}
          onClose={() => setShowEditModal(false)}
          onUpdate={updated => setLocalPlayer(updated)}
        />
      )}
    </div>
  );
};

const ClubDashboard = ({ club, session, onBack }) => {
  const [activeTab, setActiveTab] = useState('squad');
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [squad, setSquad] = useState([]);
  const [responses, setResponses] = useState([]);
  const [isCoach, setIsCoach] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const fetchData = useCallback(async () => {
    const { data: squadData } = await supabase.from('players_master').select('*').eq('club_id', club.id);
    setSquad(squadData || []);

    const me = squadData?.find(p => p.user_id === session.user.id);
    if (me && (me.club_role === 'coach' || me.club_role === 'admin')) setIsCoach(true);

    const { data: eventData } = await supabase
      .from('club_events')
      .select('*')
      .eq('club_id', club.id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });
    setEvents(eventData || []);

    if (eventData && eventData.length > 0) {
      const { data: respData } = await supabase.from('club_event_responses').select('*, players_master(*)');
      setResponses(respData || []);
    }

    const { data: newsData } = await supabase
      .from('club_news')
      .select('*')
      .eq('club_id', club.id)
      .order('created_at', { ascending: false });
    setNews(newsData || []);
  }, [club.id, session.user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResponse = async (eventId, status) => {
    await supabase.from('club_event_responses').upsert({
      event_id: eventId,
      user_id: session.user.id,
      status: status
    });
    fetchData();
  };

  const getUserResponse = (eventId) => responses.find(r => r.event_id === eventId && r.user_id === session.user.id)?.status;

  const getResponseCounts = (eventId) => {
    const eventResponses = responses.filter(r => r.event_id === eventId);
    return {
      attending: eventResponses.filter(r => r.status === 'attending').length,
      declined: eventResponses.filter(r => r.status === 'declined').length,
      maybe: eventResponses.filter(r => r.status === 'maybe').length,
      list: eventResponses
    };
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-2 text-sm font-bold ${
        activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="relative h-40 bg-zinc-900">
        {club.logo_url && <img src={club.logo_url} className="w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="absolute bottom-4 left-4">
          <h1 className="text-2xl font-bold text-white">{club.name}</h1>
          <p className="text-zinc-400 text-xs">{club.league}</p>
        </div>
      </div>

      <div className="flex bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
        <TabButton id="squad" label="Kader" icon={Users} />
        <TabButton id="events" label="Termine" icon={CalendarDays} />
        <TabButton id="news" label="News" icon={Megaphone} />
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'squad' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-500 text-xs font-bold uppercase">{squad.length} Spieler</span>
            </div>
            {squad.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                  {p.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">
                    {p.full_name} {p.club_role === 'coach' && '👑'}
                  </div>
                  <div className="text-zinc-500 text-xs">{p.position_primary}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            {events.map(ev => {
              const myStatus = getUserResponse(ev.id);
              const stats = getResponseCounts(ev.id);
              const isExpanded = expandedEvent === ev.id;
              return (
                <div key={ev.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5">
                  <div className="flex gap-4 p-4 border-l-4 border-blue-500">
                    <div className="text-center min-w-[50px]">
                      <div className="text-blue-500 font-bold text-xl">{new Date(ev.start_time).getDate()}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold">{ev.title}</div>
                      <div className="text-zinc-400 text-xs flex items-center gap-2 mt-1">
                        <Clock size={12} /> {new Date(ev.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t border-white/5 divide-x divide-white/5">
                    <button
                      onClick={() => handleResponse(ev.id, 'attending')}
                      className={`flex-1 py-3 flex justify-center items-center gap-1 text-xs font-bold transition ${
                        myStatus === 'attending' ? 'bg-green-500/20 text-green-500' : 'text-zinc-400'
                      }`}
                    >
                      <ThumbsUp size={14} /> Dabei
                    </button>
                    <button
                      onClick={() => handleResponse(ev.id, 'declined')}
                      className={`flex-1 py-3 flex justify-center items-center gap-1 text-xs font-bold transition ${
                        myStatus === 'declined' ? 'bg-red-500/20 text-red-500' : 'text-zinc-400'
                      }`}
                    >
                      <ThumbsDown size={14} /> Absage
                    </button>
                  </div>
                  <div
                    onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                    className="px-4 py-2 bg-black/20 flex justify-between items-center text-xs text-zinc-500 cursor-pointer"
                  >
                    <span>{stats.attending} zugesagt</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                  {isExpanded && (
                    <div className="p-3 bg-black/40 space-y-2 text-xs border-t border-white/5">
                      {stats.list
                        .filter(r => r.status === 'attending')
                        .map(r => (
                          <div key={r.user_id} className="text-zinc-300">
                            ✓ {r.players_master?.full_name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-3">
            {news.map(n => (
              <div key={n.id} className={`${styles.card} p-4`}>
                <h4 className="text-white font-bold mb-2">{n.title}</h4>
                <p className="text-zinc-400 text-sm mb-2">{n.content}</p>
                <span className="text-zinc-600 text-xs">{formatTimeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 11. MAIN APP COMPONENT
// ============================================================================

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedClub, setViewedClub] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState(null);
  const [toasts, setToasts] = useState([]);

  const { profile: smartProfile, loading: profileLoading, refresh: refreshProfile } = useProfile(session);

  useEffect(() => {
    if (smartProfile) setCurrentUserProfile(smartProfile);
  }, [smartProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setCurrentUserProfile(null);
        setActiveTab('home');
      }
    });
  }, []);

  const handleLoginSuccess = async (sessionData) => {
    setSession(sessionData);
    setShowLogin(false);
    await refreshProfile();
    setActiveTab('profile');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUserProfile(null);
    setActiveTab('home');
  };

  const addToast = (content) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, content }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <SafeErrorBoundary>
      <AuthContext.Provider value={{ session, currentUserProfile, refreshProfile }}>
        <ToastContext.Provider value={{ addToast }}>
          <div className="min-h-screen bg-black text-white font-sans pb-20">
            {!session && (
              <button
                onClick={() => setShowLogin(true)}
                className="fixed top-6 right-6 z-50 bg-white/10 px-4 py-2 rounded-full text-xs font-bold hover:bg-white/20 transition"
              >
                Login
              </button>
            )}

            {activeTab === 'home' && (
              <HomeScreen session={session} onUserClick={p => { setViewedProfile(p); setActiveTab('profile'); }} onLoginReq={() => setShowLogin(true)} />
            )}

            {activeTab === 'search' && (
              <SearchScreen session={session} onUserClick={p => { setViewedProfile(p); setActiveTab('profile'); }} onLoginReq={() => setShowLogin(true)} />
            )}

            {activeTab === 'inbox' && (
              <InboxScreen
                session={session}
                onSelectChat={u => setActiveChatPartner(u)}
                onUserClick={p => { setViewedProfile(p); setActiveTab('profile'); }}
                onLoginReq={() => setShowLogin(true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                player={viewedProfile || currentUserProfile}
                isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)}
                session={session}
                onBack={() => { setViewedProfile(null); setActiveTab('home'); }}
                onLogout={handleLogout}
                onClubClick={c => { setViewedClub(c); setActiveTab('club'); }}
                onLoginReq={() => setShowLogin(true)}
              />
            )}

            {activeTab === 'club' && viewedClub && (
              <ClubDashboard club={viewedClub} session={session} onBack={() => setActiveTab('profile')} />
            )}

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-[9999] rounded-3xl shadow-2xl">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'home' ? 'text-blue-400' : 'text-zinc-500'
                }`}
              >
                <Home size={24} />
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'search' ? 'text-blue-400' : 'text-zinc-500'
                }`}
              >
                <Search size={24} />
              </button>
              <div className="relative -top-8">
                <button
                  onClick={() => (session ? setShowUpload(true) : setShowLogin(true))}
                  className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-black hover:scale-110 transition"
                >
                  <Plus size={28} className="text-white" />
                </button>
              </div>
              <button
                onClick={() => setActiveTab('inbox')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'inbox' ? 'text-blue-400' : 'text-zinc-500'
                }`}
              >
                <Mail size={24} />
              </button>
              <button
                onClick={() => {
                  if (!session) setShowLogin(true);
                  else {
                    setViewedProfile(null);
                    setActiveTab('profile');
                  }
                }}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'profile' ? 'text-blue-400' : 'text-zinc-500'
                }`}
              >
                <User size={24} />
              </button>
            </div>

            {/* Modals */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
            {showUpload && currentUserProfile && (
              <UploadModal
                player={currentUserProfile}
                onClose={() => setShowUpload(false)}
                onUploadComplete={() => {
                  refreshProfile();
                  addToast('Video erfolgreich hochgeladen!');
                }}
              />
            )}
            {activeChatPartner && (
              <ChatWindow
                partner={activeChatPartner}
                session={session}
                onClose={() => setActiveChatPartner(null)}
                onUserClick={p => {
                  setActiveChatPartner(null);
                  setViewedProfile(p);
                  setActiveTab('profile');
                }}
              />
            )}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </div>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </SafeErrorBoundary>
  );
};

export default App;