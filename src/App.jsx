import React, { useEffect, useState, useRef, useCallback } from 'react';
// HINWEIS FÜR LOKALE ENTWICKLUNG (VS CODE):
// 1. Führen Sie im Terminal aus: npm install @supabase/supabase-js
// 2. Entfernen Sie die zwei Slashes (//) vor dem Import unten:
// import { createClient } from '@supabase/supabase-js'; 

import { 
  Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, 
  Activity, MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, 
  Camera, Save, UploadCloud, Mail, Users, ChevronRight, Shield, ShieldAlert, 
  Briefcase, ArrowRight, Instagram, Youtube, Video, Filter, Check, Trash2, 
  Database, Share2, Crown, FileText, Lock, Cookie, Download, 
  Flag, Bell, AlertCircle, Wifi, WifiOff, UserPlus, MapPin, Grid, List, UserCheck,
  Eye, EyeOff, Edit, Pencil, Smartphone, Key, RefreshCw, AlertTriangle, FileVideo, Film,
  Calendar, Weight, Hash, Globe, Maximize2, CheckCheck, FileBadge, BadgeCheck, SlidersHorizontal, 
  BookMarked, Bookmark, CalendarDays, Megaphone, Clock
} from 'lucide-react';

// --- 1. KONFIGURATION ---

// DEINE ECHTEN SUPABASE CREDENTIALS (Wichtig für lokal)
const supabaseUrl = "https://wwdfagjgnliwraqrwusc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZhZ2pnbmxpd3JhcXJ3dXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjIwOTksImV4cCI6MjA4MTI5ODA5OX0.CqYfeZG_qrqeHE5PvqVviA-XYMcO0DhG51sKdIKAmJM";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit

// --- 2. HELFER & STYLES ---

const getClubStyle = (isIcon) => isIcon ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/20" : "border-white/10";
const getClubBorderColor = (club) => club?.color_primary || "#ffffff"; 

// NEU: DUAL RANGE SLIDER KOMPONENTE
const DualRangeSlider = ({ min, max, value, onChange, formatLabel }) => {
  const [minVal, maxVal] = value;
  const minRef = useRef(null);
  const maxRef = useRef(null);
  const range = useRef(null);

  // Prozentberechnung für den blauen Balken
  const getPercent = useCallback((value) => Math.round(((value - min) / (max - min)) * 100), [min, max]);

  // Setzt die linke Seite des Balkens
  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxVal); 

    if (range.current) {
      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent, maxVal]);

  // Styles direkt injizieren für Webkit-Thumb Styling
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
        <div className="absolute top-4 left-0 text-xs text-zinc-400 font-mono font-bold mt-1">{formatLabel ? formatLabel(minVal) : minVal}</div>
        <div className="absolute top-4 right-0 text-xs text-zinc-400 font-mono font-bold mt-1">{formatLabel ? formatLabel(maxVal) : maxVal}</div>
      </div>
    </div>
  );
};


// Generiert ein Thumbnail aus einem Video-File (Client-Side)
const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;
        
        const timeout = setTimeout(() => resolve(null), 3000); // Max 3s warten

        video.onloadeddata = () => {
            // Springe zu Sekunde 1 oder zum Anfang
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement("canvas");
                canvas.width = 480; // Performance: Kleineres Thumbnail
                canvas.height = 270;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(video.src);
                    resolve(blob);
                }, "image/jpeg", 0.7);
            } catch (e) {
                console.error("Thumbnail Error:", e);
                resolve(null); 
            }
        };
        video.onerror = () => { clearTimeout(timeout); resolve(null); };
    });
};

const btnPrimary = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
const inputStyle = "w-full bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-zinc-600";
const cardStyle = "bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden";
const glassHeader = "bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-4 py-4 pt-12 flex items-center justify-between transition-all";

// Helper um Alter zu berechnen
const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// --- 3. DATENBANK LOGIK (Mock für Vorschau, Real für Local) ---

const MOCK_USER_ID = "user-123";
const STORAGE_KEY_SESSION = 'scoutvision_mock_session';
const STORAGE_KEY_DB = 'scoutvision_mock_db';

const INITIAL_DB = {
    players_master: [
        { 
            id: 99, 
            user_id: "user-demo", 
            full_name: "Nico Schlotterbeck", 
            first_name: "Nico", last_name: "Schlotterbeck",
            position_primary: "IV", transfer_status: "Gebunden", 
            avatar_url: "https://images.unsplash.com/photo-1522778119026-d647f0565c6a?w=400&h=400&fit=crop", 
            clubs: { id: 103, name: "BVB 09", short_name: "BVB", league: "Bundesliga", is_icon_league: true, color_primary: "#fbbf24", color_secondary: "#000000", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB" }, 
            club_id: 103, club_role: 'coach',
            followers_count: 850, is_verified: true, height_user: 191, weight: 86, strong_foot: "Links", birth_date: "1999-12-01", jersey_number: 4, nationality: "Deutschland"
        },
        { 
            id: 100, 
            user_id: "user-test2", 
            full_name: "Jamal Musiala", 
            first_name: "Jamal", last_name: "Musiala",
            position_primary: "ZOM", transfer_status: "Vertrag läuft aus", 
            avatar_url: "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=400&h=400&fit=crop", 
            clubs: { id: 101, name: "FC Bayern München", short_name: "FCB", league: "Bundesliga", color_primary: "#dc2626" }, 
            followers_count: 1200, is_verified: true, height_user: 184, weight: 72, strong_foot: "Rechts", birth_date: "2003-02-26", jersey_number: 42, nationality: "Deutschland"
        },
    ],
    clubs: [
        { id: 101, name: "FC Bayern München", short_name: "FCB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/dc2626/ffffff?text=FCB", is_verified: true, color_primary: "#dc2626", color_secondary: "#ffffff" },
        { id: 102, name: "FC Schalke 04", short_name: "S04", league: "2. Bundesliga", logo_url: "https://placehold.co/100x100/1d4ed8/ffffff?text=S04", is_verified: true, color_primary: "#1d4ed8", color_secondary: "#ffffff" },
        { id: 103, name: "Borussia Dortmund", short_name: "BVB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB", is_verified: true, color_primary: "#fbbf24", color_secondary: "#000000" }
    ],
    media_highlights: [
        { id: 1001, player_id: 99, video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", thumbnail_url: "", category_tag: "Training", likes_count: 124, created_at: new Date().toISOString() },
    ],
    club_events: [
        { id: 1, club_id: 103, title: "Abschlusstraining", type: "training", start_time: new Date(Date.now() + 86400000).toISOString(), location: "Trainingsplatz 1" },
        { id: 2, club_id: 103, title: "Heimspiel vs. FCB", type: "match", start_time: new Date(Date.now() + 172800000).toISOString(), location: "Stadion" }
    ],
    club_news: [
        { id: 1, club_id: 103, title: "Kaderbekanntgabe", content: "Treffpunkt am Samstag um 13:00 Uhr.", created_at: new Date().toISOString() }
    ],
    scout_watchlist: [],
    direct_messages: [],
    media_likes: [],
    media_comments: [],
    follows: [],
    notifications: []
};

// Lädt DB aus LocalStorage
const loadDB = () => {
    try { const s = localStorage.getItem(STORAGE_KEY_DB); return s ? JSON.parse(s) : JSON.parse(JSON.stringify(INITIAL_DB)); } catch { return JSON.parse(JSON.stringify(INITIAL_DB)); }
};
const saveDB = (db) => localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));

// Simulation des Supabase Clients
const createMockClient = () => {
    let currentSession = null; 
    let authListener = null;
    let db = loadDB();
    const tempStorage = new Map();

    try { const s = localStorage.getItem(STORAGE_KEY_SESSION); if (s) currentSession = JSON.parse(s); } catch (e) {}
    const notify = (event, session) => { if (authListener) authListener(event, session); };

    return {
        auth: {
            getSession: async () => ({ data: { session: currentSession } }),
            onAuthStateChange: (cb) => { authListener = cb; if (currentSession) cb('SIGNED_IN', currentSession); return { data: { subscription: { unsubscribe: () => { authListener = null; } } } }; },
            signInWithPassword: async ({ email }) => { await new Promise(r => setTimeout(r, 500)); currentSession = { user: { id: MOCK_USER_ID, email } }; localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentSession)); notify('SIGNED_IN', currentSession); return { data: { user: currentSession.user, session: currentSession }, error: null }; },
            signUp: async ({ email }) => { await new Promise(r => setTimeout(r, 500)); currentSession = { user: { id: MOCK_USER_ID, email } }; localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(currentSession)); notify('SIGNED_IN', currentSession); return { data: { user: currentSession.user, session: currentSession }, error: null }; },
            signOut: async () => { currentSession = null; localStorage.removeItem(STORAGE_KEY_SESSION); notify('SIGNED_OUT', null); return { error: null }; }
        },
        from: (table) => {
            db = loadDB(); const tableData = db[table] || []; let filtered = [...tableData];
            return {
                select: (query) => {
                    // Simuliere Joins (einfach)
                    if (table === 'media_highlights' && query?.includes('players_master')) {
                        filtered = filtered.map(item => ({...item, players_master: db.players_master.find(p => p.id === item.player_id)}));
                    }
                    if (table === 'media_comments' && query?.includes('auth.users')) {
                         filtered = filtered.map(item => ({...item, users: {id: item.user_id}}));
                    }
                    if (table === 'players_master') {
                        filtered = filtered.map(p => {
                            if (p.clubs && typeof p.clubs === 'object') return p; 
                            return p; 
                        });
                    }
                    if (table === 'scout_watchlist' && query?.includes('players_master')) {
                         filtered = filtered.map(item => { const p = db.players_master.find(pm => pm.id === item.player_id); return { ...item, players_master: p }; }).filter(item => item.players_master); 
                    }
                    if (query?.includes('order')) { filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); }
                    return helper(filtered);
                },
                insert: async (obj) => { const newItem = { ...obj, id: Date.now(), created_at: new Date().toISOString() }; if(!db[table]) db[table] = []; db[table].unshift(newItem); saveDB(db); return { data: [newItem], error: null }; },
                update: (obj) => ({ eq: (col, val) => { const idx = db[table].findIndex(r => r[col] == val); let res = { data: null, error: "Not found" }; if(idx >= 0) { db[table][idx] = { ...db[table][idx], ...obj }; saveDB(db); res = { data: db[table][idx], error: null }; } return { select: () => ({ single: () => res }) }; }}),
                delete: () => ({ match: (filter) => { if (!db[table]) return { error: null }; db[table] = db[table].filter(row => !Object.keys(filter).every(key => row[key] === filter[key])); saveDB(db); return { error: null }; }}),
                upsert: async (obj) => { if (!db[table]) db[table] = []; const existingIdx = db[table].findIndex(r => r.user_id === obj.user_id); let result; if (existingIdx >= 0) { db[table][existingIdx] = { ...db[table][existingIdx], ...obj }; result = db[table][existingIdx]; } else { result = { ...obj, id: Date.now(), followers_count: 0 }; db[table].push(result); } saveDB(db); return { data: result, error: null }; }
            };
            function helper(d) { return { 
                eq: (c,v) => helper(d.filter(r=>r[c]==v)), 
                ilike: (c,v) => helper(d.filter(r=>r[c]?.toLowerCase().includes(v.replace(/%/g,'').toLowerCase()))), 
                in: (c,v) => helper(d.filter(r=>v.includes(r[c]))),
                match: (obj) => helper(d.filter(r => Object.keys(obj).every(k => r[k] === obj[k]))), 
                gte: (c,v) => helper(d.filter(r => r[c] >= v)),
                lte: (c,v) => helper(d.filter(r => r[c] <= v)),
                or: () => helper(d), 
                order: () => helper(d), 
                limit: () => helper(d), 
                maybeSingle: () => ({ data: d[0]||null, error: null }), 
                single: () => ({ data: d[0]||null, error: null }), 
                then: (cb) => cb({ data: d, error: null }) 
            };}
        },
        storage: { from: () => ({ upload: async (path, file) => { const url = URL.createObjectURL(file); tempStorage.set(path, url); return { error: null }; }, getPublicUrl: (path) => { const url = tempStorage.get(path) || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"; return { data: { publicUrl: url } }; } })},
        channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
        removeChannel: () => {}
    };
};

// --- HIER WIRD UMGESCHALTET ---

// 1. FÜR VORSCHAU IM BROWSER: Mock Client verwenden (Standard)
const supabase = createMockClient();

// 2. FÜR LOKALE ENTWICKLUNG (VS Code):
// Kommentieren Sie die Zeile oben aus und aktivieren Sie die Zeile unten:
// const supabase = createClient(supabaseUrl, supabaseKey); 


// --- 4. HOOKS ---

const useSmartProfile = (session) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchOrCreateIndex = useCallback(async () => {
        if (!session?.user?.id) {
            setProfile(null);
            return;
        }
        setLoading(true);
        try {
            // 1. Versuche existierendes Profil zu laden
            let { data, error } = await supabase.from('players_master')
                .select('*, clubs(*)')
                .eq('user_id', session.user.id)
                .maybeSingle();

            // 2. Falls keins existiert -> Auto-Create
            if (!data) {
                const newProfile = { 
                    user_id: session.user.id, 
                    full_name: 'Neuer Spieler', 
                    position_primary: 'ZM', 
                    transfer_status: 'Gebunden',
                    followers_count: 0,
                    is_verified: false,
                    is_admin: false
                };
                
                const { data: createdProfile, error: createError } = await supabase
                    .from('players_master')
                    .upsert(newProfile)
                    .select()
                    .single();
                
                if (createError) throw createError;
                data = createdProfile;
            }
            setProfile(data);
        } catch (e) {
            console.error("Profile fetch error:", e.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchOrCreateIndex();
    }, [fetchOrCreateIndex]);

    return { profile, loading, refresh: fetchOrCreateIndex, setProfile };
};

// --- 5. UI KOMPONENTEN ---

class SafeErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("UI Error:", error, errorInfo); }
    render() {
      if (this.state.hasError) return <div className="p-4 text-red-500 bg-red-500/10 rounded-xl m-4">Ein Fehler ist aufgetreten.</div>;
      return this.props.children; 
    }
}

const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent"></div>
            <Icon size={40} className="text-zinc-500 relative z-10" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-zinc-400 mb-8 max-w-xs leading-relaxed text-sm">{text}</p>
        <button onClick={onLogin} className={`${btnPrimary} w-full max-w-xs`}>Anmelden</button>
    </div>
);

const FollowerListModal = ({ userId, onClose, onUserClick }) => {
    const [followers, setFollowers] = useState([]);
    useEffect(() => { const f = async () => { try { const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId); if (data?.length) { const ids = data.map(f => f.follower_id); const { data: u } = await supabase.from('players_master').select('*, clubs(*)').in('user_id', ids); setFollowers(u||[]); } } catch(e){} }; f(); }, [userId]);
    return (<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className={`w-full max-w-md ${cardStyle} h-[70vh] p-4`}><div className="flex justify-between mb-4"><h2 className="font-bold text-white">Follower</h2><button onClick={onClose}><X className="text-zinc-400"/></button></div><div className="space-y-2">{followers.map(p=><div key={p.id} onClick={()=>{onClose();onUserClick(p)}} className="flex gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"><div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">{p.avatar_url?<img src={p.avatar_url} className="w-full h-full object-cover"/>:<User className="m-2"/>}</div><div><div className="text-white font-bold">{p.full_name}</div><div className="text-zinc-500 text-xs">{p.clubs?.name}</div></div></div>)}</div></div></div>);
};

const ToastContainer = ({ toasts, removeToast }) => (<div className="fixed top-6 left-0 right-0 z-[120] flex flex-col items-center gap-3 pointer-events-none px-4">{toasts.map(t => (<div key={t.id} onClick={()=>removeToast(t.id)} className={`bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer animate-in slide-in-from-top-2`}><div className={`p-3 rounded-full ${t.type==='error'?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400'}`}>{t.type==='error'?<AlertCircle size={20}/>:<Bell size={20}/>}</div><div className="flex-1 text-sm font-medium">{t.content}</div></div>))}</div>);

const CookieBanner = () => { const [accepted, setAccepted] = useState(false); useEffect(() => { if (localStorage.getItem('cookie_consent') === 'true') setAccepted(true); }, []); if (accepted) return null; return (<div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[100]"><div className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-4"><div className="flex items-start gap-4"><Cookie size={24} className="text-white"/><div className="text-xs text-zinc-400">Wir nutzen technisch notwendige Cookies.</div></div><button onClick={() => { localStorage.setItem('cookie_consent', 'true'); setAccepted(true); }} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm">Alles klar</button></div></div>); };

const ReportModal = ({ targetId, targetType, onClose, session }) => {
    const [reason, setReason] = useState('Spam');
    const [loading, setLoading] = useState(false);
    const handleReport = async () => {
        setLoading(true);
        try { await supabase.from('reports').insert({ reporter_id: session.user.id, target_id: targetId, target_type: targetType, reason: reason, status: 'pending' }).catch(() => {}); alert("Vielen Dank! Wir prüfen die Meldung."); onClose(); } catch (e) { alert("Fehler beim Melden."); } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-xs ${cardStyle} p-5`}>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Flag size={18} className="text-red-500"/> Inhalt melden</h3>
                <div className="bg-zinc-900/50 p-1 rounded-xl mb-4 border border-white/5">
                    <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-transparent text-white p-2 text-sm outline-none"><option>Spam / Werbung</option><option>Unangemessener Inhalt</option><option>Beleidigung</option><option>Fake Profil</option></select>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white/5 text-zinc-400 py-2.5 rounded-xl font-bold text-xs hover:text-white transition">Abbruch</button>
                    <button onClick={handleReport} disabled={loading} className="flex-1 bg-red-600/90 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs transition">Melden</button>
                </div>
            </div>
        </div>
    );
};

const VerificationModal = ({ onClose, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const handleUpload = async () => { setUploading(true); await new Promise(r => setTimeout(r, 1500)); alert("Dokumente erfolgreich hochgeladen! Wir prüfen deinen Status."); setUploading(false); onUploadComplete(); onClose(); };
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`w-full max-w-md ${cardStyle} p-6 border-t border-zinc-700 shadow-2xl relative`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><BadgeCheck className="text-blue-500" size={24}/> Verifizierung</h3>
                    <button onClick={onClose}><X className="text-zinc-400 hover:text-white" /></button>
                </div>
                <div className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                        Lade ein Foto deines Spielerpasses oder Personalausweises hoch, um das "Verifiziert"-Badge zu erhalten.
                    </div>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800/50 hover:border-blue-500/50 transition-all group">
                        <div className="p-4 bg-zinc-800 rounded-full mb-3 group-hover:scale-110 transition-transform"><FileBadge className="w-8 h-8 text-blue-400" /></div>
                        <p className="text-sm text-zinc-300 font-medium">Dokument auswählen</p>
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                    {uploading && <div className="text-center text-zinc-400 text-xs flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Upload läuft...</div>}
                </div>
            </div>
        </div>
    );
};

const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComments = async () => {
            const { data } = await supabase.from('media_comments').select('*, users:auth.users(id)').eq('video_id', video.id).order('created_at', { ascending: true });
            setComments(data || []);
            setLoading(false);
        };
        fetchComments();
        
        const channel = supabase.channel('comments').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_comments', filter: `video_id=eq.${video.id}` }, payload => {
            setComments(prev => [...prev, payload.new]);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [video.id]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!session) return onLoginReq();
        if (!text.trim()) return;
        await supabase.from('media_comments').insert({ video_id: video.id, user_id: session.user.id, content: text });
        setText('');
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[60vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl`}>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900">
                    <h3 className="text-white font-bold">Kommentare</h3>
                    <button onClick={onClose}><X className="text-zinc-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <Loader2 className="animate-spin mx-auto text-zinc-500"/> : comments.length === 0 ? <p className="text-zinc-500 text-center text-sm">Noch keine Kommentare.</p> : 
                    comments.map(c => (
                        <div key={c.id} className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 text-sm text-white break-words">{c.content}</div>
                    ))}
                </div>
                <form onSubmit={sendComment} className="p-4 border-t border-white/5 bg-zinc-900 flex gap-2">
                    <input className={inputStyle} value={text} onChange={e => setText(e.target.value)} placeholder="Kommentar..." />
                    <button className={`${btnPrimary} w-auto px-4`}><Send size={18}/></button>
                </form>
            </div>
        </div>
    );
};

const WatchlistModal = ({ session, onClose, onUserClick }) => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNote, setEditingNote] = useState(null); 
    const [noteText, setNoteText] = useState("");

    useEffect(() => {
        const fetchWatchlist = async () => {
            setLoading(true);
            const { data } = await supabase.from('scout_watchlist').select('*, players_master(*, clubs(*))').eq('scout_id', session.user.id).order('created_at', { ascending: false });
            setList(data || []);
            setLoading(false);
        };
        fetchWatchlist();
    }, []);

    const handleRemove = async (playerId) => {
        await supabase.from('scout_watchlist').delete().match({ scout_id: session.user.id, player_id: playerId });
        setList(prev => prev.filter(item => item.player_id !== playerId));
    };

    const handleSaveNote = async (itemId) => {
        await supabase.from('scout_watchlist').update({ note: noteText }).eq('id', itemId);
        setList(prev => prev.map(item => item.id === itemId ? { ...item, note: noteText } : item));
        setEditingNote(null);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[80vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bookmark className="text-blue-500" fill="currentColor" size={20}/> Merkliste</h2>
                    <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-zinc-500"/></div> : (
                        list.length === 0 ? <div className="text-center text-zinc-500 py-10">Noch keine Spieler gemerkt.</div> :
                        list.map(item => (
                            <div key={item.id} className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(item.players_master)}>
                                    <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                                        {item.players_master?.avatar_url ? <img src={item.players_master.avatar_url} className="w-full h-full object-cover"/> : <User className="m-3 text-zinc-500"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white truncate">{item.players_master?.full_name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <span className="bg-white/10 px-1.5 rounded">{item.players_master?.position_primary}</span>
                                            <span>{item.players_master?.clubs?.name}</span>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemove(item.player_id); }} className="p-2 text-zinc-500 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                                <div className="mt-3 pt-2 border-t border-white/5">
                                    {editingNote === item.id ? (
                                        <div className="flex gap-2">
                                            <input autoFocus className="flex-1 bg-black/30 text-xs text-white p-2 rounded-lg outline-none border border-blue-500/50" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notiz..." />
                                            <button onClick={() => handleSaveNote(item.id)} className="text-blue-500 font-bold text-xs">OK</button>
                                        </div>
                                    ) : (
                                        <div onClick={() => { setEditingNote(item.id); setNoteText(item.note || ""); }} className="text-xs text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300">
                                            <NotebookPen size={12}/> {item.note || "Notiz hinzufügen..."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const SettingsModal = ({ onClose, onLogout, installPrompt, onInstallApp, onRequestPush, user, onEditReq, onVerifyReq }) => {
    const [showToast, setShowToast] = useState(null);
    if (!user) return null;
    const showFeedback = (msg) => { setShowToast(msg); setTimeout(() => setShowToast(null), 2000); };
    const handleClearCache = () => { try { localStorage.clear(); showFeedback('Cache geleert!'); } catch (e) { showFeedback('Fehler beim Leeren'); } };
    const handleShare = () => { if(user?.id) { navigator.clipboard.writeText(`https://scoutvision.app/u/${user.id}`); showFeedback('Link in Zwischenablage!'); } };
    const handleDeleteAccount = () => { if(confirm("ACHTUNG: Möchtest du deinen Account wirklich unwiderruflich löschen?")) { onLogout(); alert("Account gelöscht."); } };
    const SettingsItem = ({ icon: Icon, label, onClick, danger = false, highlight = false }) => (
        <button onClick={onClick} className={`w-full p-3 flex items-center justify-between group transition-all rounded-xl ${danger ? 'hover:bg-red-500/10' : highlight ? 'bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20' : 'hover:bg-white/5'}`}>
            <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${danger ? 'bg-red-500/20 text-red-500' : highlight ? 'bg-blue-500 text-white' : 'bg-white/5 text-zinc-400 group-hover:text-white'}`}><Icon size={18} /></div><span className={`font-medium text-sm ${danger ? 'text-red-500' : highlight ? 'text-blue-100' : 'text-zinc-200 group-hover:text-white'}`}>{label}</span></div><ChevronRight size={16} className={danger ? 'text-red-500' : highlight ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
        </button>
    );
    return (<div className="fixed inset-0 z-[10000] flex justify-end"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div><div className="relative w-80 max-w-[85vw] h-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"><div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18}/> Einstellungen</h2><button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition"><X size={20} /></button></div><SafeErrorBoundary><div className="flex-1 overflow-y-auto p-4 space-y-6"><div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">App</h3><SettingsItem icon={Download} label="App installieren" onClick={onInstallApp} /><SettingsItem icon={Bell} label="Benachrichtigungen" onClick={onRequestPush} /><SettingsItem icon={RefreshCw} label="Cache leeren" onClick={handleClearCache} /></div><div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Account</h3><SettingsItem icon={Edit} label="Profil bearbeiten" onClick={onEditReq} />{!user.is_verified && <SettingsItem icon={BadgeCheck} label="Verifizierung beantragen" onClick={onVerifyReq} highlight />}<SettingsItem icon={Share2} label="Profil teilen" onClick={handleShare} /><SettingsItem icon={Key} label="Passwort ändern" onClick={() => showFeedback("Email gesendet")} /></div><div className="space-y-1"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Rechtliches</h3><SettingsItem icon={Lock} label="Datenschutz" onClick={() => showFeedback("Geöffnet")} /><SettingsItem icon={FileText} label="Impressum" onClick={() => showFeedback("Geöffnet")} /></div><div className="pt-4 border-t border-white/10 space-y-2"><SettingsItem icon={LogOut} label="Abmelden" onClick={onLogout} danger /><SettingsItem icon={Trash2} label="Account löschen" onClick={handleDeleteAccount} danger /></div></div></SafeErrorBoundary>{showToast && (<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-20">{showToast}</div>)}</div></div>);
};

const LoginModal = ({ onClose, onSuccess }) => {
  const [view, setView] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault(); 
    setLoading(true); setMsg(''); setSuccessMsg('');
    const isSignUp = view === 'register';

    if (isSignUp && password !== confirmPassword) {
        setMsg("Passwörter stimmen nicht überein!");
        setLoading(false);
        return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) { 
            throw error; 
        }
        if (data.user) { 
            setSuccessMsg('✅ Registrierung erfolgreich! Anmeldung...');
            // CRUCIAL: Pass new user data to parent via onSuccess
            setTimeout(() => onSuccess({ user: data.user }), 1000); 
            return; 
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // CRUCIAL: Pass session data to parent via onSuccess
        onSuccess(data.session);
      }
    } catch (error) { 
        console.error("Auth Error:", error);
        setMsg(error.message || "Ein Fehler ist aufgetreten.");
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-blue-900/10`}>
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition"><X size={20} /></button>
        <div className="animate-in fade-in slide-in-from-right-5">
            <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><User size={28} className="text-white"/></div>
                <h2 className="text-2xl font-bold text-white">{view === 'register' ? 'Account erstellen' : 'Willkommen zurück'}</h2>
                <p className="text-zinc-400 text-sm text-center">{view === 'register' ? 'Werde Teil der Community' : 'Melde dich an, um fortzufahren'}</p>
            </div>
            {successMsg ? (
                <div className="text-center space-y-4"><div className="bg-green-500/10 text-green-400 p-4 rounded-xl border border-green-500/20 text-sm">{successMsg}</div></div>
            ) : (
                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-3">
                        <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" placeholder="Passwort" required className={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
                        {view === 'register' && (<div className="animate-in slide-in-from-top-2 fade-in"><input type="password" placeholder="Passwort bestätigen" required className={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>)}
                    </div>
                    {msg && (<div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex flex-col gap-2"><div className="flex items-center gap-2"><AlertCircle size={14}/> {msg}</div></div>)}
                    <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}>{loading && <Loader2 className="animate-spin" size={18} />} {view === 'register' ? 'Kostenlos registrieren' : 'Anmelden'}</button>
                </form>
            )}
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-zinc-500 text-xs mb-2">{view === 'register' ? 'Du hast schon einen Account?' : 'Neu bei ScoutVision?'}</p>
                <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); }} className="text-white hover:text-blue-400 font-bold text-sm transition">{view === 'register' ? 'Jetzt anmelden' : 'Kostenlos registrieren'}</button>
            </div>
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ player, onClose, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false); 
  const [category, setCategory] = useState("Training");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => { 
      e.preventDefault(); 
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if(droppedFile) processFile(droppedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile.size > MAX_FILE_SIZE) { 
        setErrorMsg("Datei zu groß! Max 50 MB."); 
        return; 
    }
    if (!selectedFile.type.startsWith('video/')) {
        setErrorMsg("Nur Videodateien erlaubt (MP4, MOV).");
        return;
    }
    setErrorMsg("");
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!player?.user_id || !file) { 
        setErrorMsg("Bitte Profil erst vervollständigen."); 
        return; 
    }
    
    setUploading(true);
    setProgress(10);
    
    const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 5, 90));
    }, 500);

    try { 
        const fileExt = file.name.split('.').pop();
        const fileName = `${player.user_id}/${Date.now()}.${fileExt}`;
        const thumbName = `${player.user_id}/${Date.now()}_thumb.jpg`;
        
        let thumbUrl = null;
        try {
            const thumbBlob = await generateVideoThumbnail(file);
            if (thumbBlob) {
                await supabase.storage.from('player-videos').upload(thumbName, thumbBlob);
                const { data } = supabase.storage.from('player-videos').getPublicUrl(thumbName);
                thumbUrl = data.publicUrl;
            }
        } catch (e) {
            console.warn("Thumbnail failed", e);
            thumbUrl = "https://placehold.co/600x400/18181b/ffffff/png?text=Video";
        }

        const { error: upErr } = await supabase.storage.from('player-videos').upload(fileName, file); 
        if (upErr) throw upErr; 
        
        const { data: { publicUrl } } = supabase.storage.from('player-videos').getPublicUrl(fileName); 
        
        const { error: dbErr } = await supabase.from('media_highlights').insert({ 
            player_id: player.id, 
            video_url: publicUrl, 
            thumbnail_url: thumbUrl,
            category_tag: category,
            created_at: new Date().toISOString() 
        }); 
        
        if (dbErr) throw dbErr; 
        
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
            onUploadComplete(); 
            onClose(); 
        }, 800);

    } catch (error) { 
        console.error(error);
        setErrorMsg('Upload fehlgeschlagen: ' + error.message); 
        setUploading(false);
        clearInterval(progressInterval);
    }
  };

  useEffect(() => {
      return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full sm:max-w-md ${cardStyle} p-6 border-t border-zinc-700 shadow-2xl relative mb-20 sm:mb-0`}> 
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white flex items-center gap-2"><UploadCloud className="text-blue-500"/> Clip hochladen</h3><button onClick={onClose}><X className="text-zinc-400 hover:text-white" /></button></div>
        
        {uploading ? (
            <div className="text-center py-8 space-y-4">
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex items-center justify-center gap-2 text-zinc-400 font-medium text-sm">
                    <Loader2 className="animate-spin" size={16}/> 
                    <span>Wird verarbeitet... {Math.round(progress)}%</span>
                </div>
                <p className="text-xs text-zinc-600">Bitte Fenster nicht schließen.</p>
            </div> 
        ) : (
        <div className="space-y-4">
            {!file ? (
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all group relative ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:bg-zinc-800/50 hover:border-blue-500/50'}`}
                >
                    <div className={`p-4 rounded-full mb-3 transition-transform shadow-lg ${isDragOver ? 'bg-blue-500 text-white scale-110' : 'bg-zinc-800 text-blue-400 group-hover:scale-110'}`}>
                        <FileVideo className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-zinc-300 font-medium">Video auswählen oder hierher ziehen</p>
                    <p className="text-xs text-zinc-500 mt-1">Max. 50 MB • MP4, MOV</p>
                    <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-lg border border-white/10">
                        <video src={previewUrl} className="w-full h-full object-cover opacity-80" controls />
                        <button onClick={() => {setFile(null); setPreviewUrl(null); setErrorMsg("");}} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-red-500/80 transition">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    {errorMsg && (
                        <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                            <AlertTriangle size={14}/> {errorMsg}
                        </div>
                    )}

                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 space-y-3">
                         <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase ml-1">Kategorie</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-800 text-white p-2.5 mt-1 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition">
                                <option>Training</option>
                                <option>Match Highlight</option>
                                <option>Tor</option>
                                <option>Skill</option>
                            </select>
                         </div>
                         <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase ml-1">Beschreibung</label>
                            <input 
                                type="text" 
                                placeholder="Was passiert im Video?" 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                className="w-full bg-zinc-800 text-white p-2.5 mt-1 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition placeholder:text-zinc-600" 
                            />
                         </div>
                    </div>
                    <button onClick={handleUpload} className={`${btnPrimary} w-full flex items-center justify-center gap-2`}>
                        <UploadCloud size={20} /> Jetzt hochladen
                    </button>
                </div>
            )}
            
            {errorMsg && !file && (
                <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle size={14}/> {errorMsg}
                </div>
            )}
        </div>
        )}
      </div>
    </div>
  );
};

const EditProfileModal = ({ player, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false); const [formData, setFormData] = useState({ full_name: player.full_name || '', position_primary: player.position_primary || 'ZOM', height_user: player.height_user || '', strong_foot: player.strong_foot || 'Rechts', club_id: player.club_id || '', transfer_status: player.transfer_status || 'Gebunden', instagram_handle: player.instagram_handle || '', tiktok_handle: player.tiktok_handle || '', youtube_handle: player.youtube_handle || '', birth_date: player.birth_date || '', jersey_number: player.jersey_number || '', nationality: player.nationality || '' });
  const [avatarFile, setAvatarFile] = useState(null); const [previewUrl, setPreviewUrl] = useState(player.avatar_url); const [clubSearch, setClubSearch] = useState(''); const [clubResults, setClubResults] = useState([]); const [selectedClub, setSelectedClub] = useState(player.clubs || null); const [showCreateClub, setShowCreateClub] = useState(false); const [newClubData, setNewClubData] = useState({ name: '', league: 'Kreisliga' });
  useEffect(() => { if (clubSearch.length < 2) { setClubResults([]); return; } const t = setTimeout(async () => { const { data } = await supabase.from('clubs').select('*').ilike('name', `%${clubSearch}%`).limit(5); setClubResults(data || []); }, 300); return () => clearTimeout(t); }, [clubSearch]);
  const handleCreateClub = async () => { if(!newClubData.name) return; setLoading(true); try { const { data } = await supabase.from('clubs').insert({ name: newClubData.name, league: newClubData.league }).select().single(); setSelectedClub(data); setShowCreateClub(false); } catch(e){} finally { setLoading(false); } }
  const handleSave = async (e) => { e.preventDefault(); setLoading(true); try { let av = player.avatar_url; if (avatarFile) { const p = `${player.user_id}/${Date.now()}.jpg`; await supabase.storage.from('avatars').upload(p, avatarFile); const { data } = supabase.storage.from('avatars').getPublicUrl(p); av = data.publicUrl; } const { data } = await supabase.from('players_master').update({ ...formData, height_user: formData.height_user ? parseInt(formData.height_user) : null, avatar_url: av, club_id: selectedClub?.id || null }).eq('id', player.id).select('*, clubs(*)').single(); onUpdate(data); onClose(); } catch(e){ alert(e.message); } finally { setLoading(false); } };
  
  // FIX: z-[10000]
  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full sm:max-w-md ${cardStyle} h-[90vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
        <div className="flex justify-between items-center p-6 border-b border-white/5"><h2 className="text-xl font-bold text-white">Profil bearbeiten</h2><button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button></div>
        <div className="flex-1 overflow-y-auto p-6"><form onSubmit={handleSave} className="space-y-6"><div className="flex justify-center"><div className="relative group cursor-pointer"><div className="w-28 h-28 rounded-full bg-zinc-800 border-4 border-zinc-900 overflow-hidden shadow-xl">{previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-zinc-600 m-8" />}</div><div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><Camera size={28} className="text-white" /></div><input type="file" accept="image/*" onChange={e => {const f=e.target.files[0]; if(f){setAvatarFile(f); setPreviewUrl(URL.createObjectURL(f));}}} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div><div className="space-y-4"><input value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} className={inputStyle} placeholder="Name" /><select value={formData.position_primary} onChange={e=>setFormData({...formData, position_primary: e.target.value})} className={inputStyle}>{['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p=><option key={p}>{p}</option>)}</select>{selectedClub ? <div className="bg-zinc-800 p-4 rounded-xl flex justify-between items-center border border-white/10"><span className="font-bold text-white">{selectedClub.name}</span><button type="button" onClick={()=>setSelectedClub(null)} className="p-1 hover:bg-white/10 rounded"><X size={16} className="text-zinc-400"/></button></div> : <div className="relative"><Search className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="Verein suchen..." value={clubSearch} onChange={e=>setClubSearch(e.target.value)} className={`${inputStyle} pl-12`}/>{clubResults.length > 0 && <div className="absolute z-10 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl">{clubResults.map(c=><div key={c.id} onClick={()=>{setSelectedClub(c); setClubSearch('')}} className="p-3 hover:bg-zinc-800 cursor-pointer text-white border-b border-white/5 last:border-0">{c.name}</div>)}<div onClick={()=>setShowCreateClub(true)} className="p-3 bg-blue-500/10 text-blue-400 cursor-pointer font-bold text-sm">+ "{clubSearch}" neu anlegen</div></div>}</div>}{showCreateClub && <div className="mt-2 bg-zinc-800/50 p-4 rounded-xl border border-white/10 space-y-3 animate-in fade-in"><input placeholder="Name" value={newClubData.name} onChange={e=>setNewClubData({...newClubData, name:e.target.value})} className={inputStyle}/><button type="button" onClick={handleCreateClub} className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg">Erstellen</button></div>}</div><div className="grid grid-cols-2 gap-3"><input type="number" min="0" placeholder="Größe (cm)" value={formData.height_user} onChange={e=>setFormData({...formData, height_user: e.target.value})} className={inputStyle} /><select value={formData.strong_foot} onChange={e=>setFormData({...formData, strong_foot: e.target.value})} className={inputStyle}><option>Rechts</option><option>Links</option><option>Beidfüßig</option></select></div><div className="space-y-3 pt-2"><h3 className="text-xs font-bold text-zinc-500 uppercase">Social Media</h3><div className="relative"><Instagram className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="Instagram" value={formData.instagram_handle} onChange={e=>setFormData({...formData, instagram_handle: e.target.value})} className={`${inputStyle} pl-12`}/></div><div className="relative"><Video className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="TikTok" value={formData.tiktok_handle} onChange={e=>setFormData({...formData, tiktok_handle: e.target.value})} className={`${inputStyle} pl-12`}/></div></div><button disabled={loading} className={`${btnPrimary} w-full mt-6`}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "Speichern & Schließen"}</button></form></div>
      </div>
    </div>
  );
};

const ChatWindow = ({ partner, session, onClose, onUserClick }) => {
  const [messages, setMessages] = useState([]); const [txt, setTxt] = useState(''); const endRef = useRef(null);
  useEffect(() => { const f = async () => { const { data } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).or(`sender_id.eq.${partner.user_id},receiver_id.eq.${partner.user_id}`).order('created_at',{ascending:true}); setMessages((data||[]).filter(m => (m.sender_id===session.user.id && m.receiver_id===partner.user_id) || (m.sender_id===partner.user_id && m.receiver_id===session.user.id))); endRef.current?.scrollIntoView(); }; f(); const i = setInterval(f, 3000); return () => clearInterval(i); }, [partner]);
  const send = async (e) => { e.preventDefault(); if(!txt.trim()) return; await supabase.from('direct_messages').insert({sender_id:session.user.id, receiver_id:partner.user_id, content:txt}); setMessages([...messages, {sender_id:session.user.id, content:txt, id:Date.now()}]); setTxt(''); endRef.current?.scrollIntoView(); };
  return (<div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-in slide-in-from-right duration-300"><div className="flex items-center gap-4 p-4 pt-12 pb-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-10"><button onClick={onClose}><ArrowLeft className="text-zinc-400 hover:text-white"/></button><div onClick={()=>{onClose(); onUserClick(partner)}} className="flex items-center gap-3 cursor-pointer group"><div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 group-hover:border-blue-500 transition">{partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="m-2.5 text-zinc-500"/>}</div><div className="font-bold text-white">{partner.full_name}</div></div></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-black to-zinc-950">{messages.map(m=><div key={m.id} className={`flex ${m.sender_id===session.user.id?'justify-end':'justify-start'}`}><div className={`px-5 py-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${m.sender_id===session.user.id?'bg-blue-600 text-white rounded-br-none':'bg-zinc-800 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.content}</div></div>)}<div ref={endRef}/></div><form onSubmit={send} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3 pb-8 sm:pb-4"><input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Schreib eine Nachricht..." className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-full px-5 py-3 outline-none focus:border-blue-500 transition"/><button className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-90"><Send size={20}/></button></form></div>);
};

const FeedItem = ({ video, onClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const [likes, setLikes] = useState(video.likes_count || 0); const [liked, setLiked] = useState(false); const [showMenu, setShowMenu] = useState(false);
    const like = async (e) => { e.stopPropagation(); if(!session){onLikeReq(); return;} setLiked(!liked); setLikes(l=>liked?l-1:l+1); if(!liked) { await supabase.from('media_likes').insert({user_id:session.user.id, video_id:video.id}); } };
    return (
        <div className="bg-black border-b border-zinc-900/50 pb-6 mb-2 last:mb-20"><div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3 cursor-pointer group" onClick={()=>onUserClick(video.players_master)}><div className={`w-10 h-10 rounded-full bg-zinc-800 overflow-hidden p-0.5 ${getClubStyle(video.players_master?.clubs?.is_icon_league)}`}><div className="w-full h-full rounded-full overflow-hidden bg-black">{video.players_master?.avatar_url ? <img src={video.players_master.avatar_url} className="w-full h-full object-cover"/> : <User className="m-2 text-zinc-500"/>}</div></div><div><div className="font-bold text-white text-sm flex items-center gap-1 group-hover:text-blue-400 transition">{video.players_master?.full_name} {video.players_master?.is_verified && <CheckCircle size={12} className="text-blue-500"/>}</div><div className="text-xs text-zinc-500">{video.players_master?.clubs?.name || "Vereinslos"}</div></div></div><div className="relative"><button onClick={(e) => {e.stopPropagation(); setShowMenu(!showMenu)}} className="text-zinc-500 hover:text-white p-2"><MoreHorizontal size={20}/></button>{showMenu && (<div className="absolute right-0 top-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 w-32 overflow-hidden animate-in fade-in"><button onClick={(e) => {e.stopPropagation(); setShowMenu(false); onReportReq(video.id, 'video');}} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-zinc-800 flex items-center gap-2"><Flag size={14}/> Melden</button></div>)}</div></div><div onClick={()=>onClick(video)} className="aspect-[4/5] bg-zinc-900 relative overflow-hidden group cursor-pointer"><video src={video.video_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500" muted loop playsInline onMouseOver={e=>e.target.play()} onMouseOut={e=>e.target.pause()} /><div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none"></div><div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold flex items-center gap-1"><Play size={10} fill="white"/> Watch</div></div><div className="px-4 pt-4 flex items-center gap-6"><button onClick={like} className={`flex items-center gap-2 transition-transform active:scale-90 ${liked?'text-red-500':'text-white hover:text-red-400'}`}><Heart size={26} className={liked?'fill-red-500':''}/> <span className="font-bold text-sm">{likes}</span></button><button onClick={(e)=>{e.stopPropagation(); onCommentClick(video)}} className="flex items-center gap-2 text-white hover:text-blue-400 transition"><MessageCircle size={26}/> <span className="font-bold text-sm">Chat</span></button><div className="ml-auto"><Share2 size={24} className="text-zinc-500 hover:text-white transition cursor-pointer"/></div></div></div>
    )
};

const HomeScreen = ({ onVideoClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const [feed, setFeed] = useState([]);
    useEffect(() => { supabase.from('media_highlights').select('*, players_master(*, clubs(*))').order('created_at', {ascending:false}).limit(20).then(({data}) => setFeed(data||[])) }, []);
    return <div className="pb-24 pt-0 max-w-md mx-auto">{feed.map(v => <FeedItem key={v.id} video={v} onClick={onVideoClick} session={session} onLikeReq={onLikeReq} onCommentClick={onCommentClick} onUserClick={onUserClick} onReportReq={onReportReq} />)}</div>;
};

// --- KOMPLETT NEU: SEARCH SCREEN MIT SCOUT ENGINE ---

const SearchScreen = ({ onUserClick, onOpenWatchlist }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);
  
    // Filter State
    const [filters, setFilters] = useState({
        minHeight: 0,
        maxHeight: 220,
        minAge: 16,
        maxAge: 40,
        positions: [], // Array von Strings, z.B. ['IV', 'ZDM']
        strongFoot: 'Alle',
        transferStatus: 'Alle'
    });
  
    const positionsList = ['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'];
  
    // --- SCOUTING QUERY LOGIC ---
    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            let dbQuery = supabase.from('players_master').select('*, clubs(*)');
  
            // 1. Textsuche (Name)
            if (query.trim()) {
                dbQuery = dbQuery.ilike('full_name', `%${query}%`);
            }
  
            // 2. Position Filter (Multi-Select)
            if (filters.positions.length > 0) {
                // Sucht Spieler, deren Hauptposition in der Liste ist
                dbQuery = dbQuery.in('position_primary', filters.positions);
            }
  
            // 3. Größen Filter
            if (filters.minHeight > 0) {
                dbQuery = dbQuery.gte('height_user', filters.minHeight);
            }
            if (filters.maxHeight < 220) {
                 dbQuery = dbQuery.lte('height_user', filters.maxHeight);
            }
  
            // 4. Alter Filter (Berechnung über Geburtsdatum)
            const today = new Date();
            if (filters.maxAge < 40) {
                const minBirthDate = new Date(today.getFullYear() - filters.maxAge - 1, today.getMonth(), today.getDate()).toISOString();
                dbQuery = dbQuery.gte('birth_date', minBirthDate);
            }
            if (filters.minAge > 16) {
                const maxBirthDate = new Date(today.getFullYear() - filters.minAge, today.getMonth(), today.getDate()).toISOString();
                dbQuery = dbQuery.lte('birth_date', maxBirthDate);
            }
  
            // 5. Fuß
            if (filters.strongFoot !== 'Alle') {
                dbQuery = dbQuery.eq('strong_foot', filters.strongFoot);
            }
  
            // 6. Status
            if (filters.transferStatus !== 'Alle') {
                dbQuery = dbQuery.eq('transfer_status', filters.transferStatus);
            }
  
            const { data } = await dbQuery.limit(20);
            setResults(data || []);
            setLoading(false);
        };
  
        // Debounce für Performance
        const timer = setTimeout(fetchResults, 400);
        return () => clearTimeout(timer);
    }, [query, filters]);
  
    // Helper für Multi-Select Toggle
    const togglePosition = (pos) => {
        setFilters(prev => {
            const newPos = prev.positions.includes(pos)
                ? prev.positions.filter(p => p !== pos) // Entfernen
                : [...prev.positions, pos]; // Hinzufügen
            return { ...prev, positions: newPos };
        });
    };
  
    const FilterChip = ({ label, active, onClick }) => (
        <button onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border ${active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}>
            {label}
        </button>
    );
  
    return (
      <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
        <div className={glassHeader}><h2 className="text-2xl font-black text-white">Scouting</h2></div>
        
        <div className="px-4 mt-4">
            {/* Suchleiste & Filter-Toggle */}
            <div className="relative mb-4 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 text-zinc-500" size={20}/>
                    <input 
                        placeholder="Spieler suchen..." 
                        value={query} 
                        onChange={e=>setQuery(e.target.value)} 
                        className={`${inputStyle} pl-12 pr-12`} 
                    />
                    <button 
                        onClick={() => setShowFilters(!showFilters)} 
                        className={`absolute right-2 top-2 p-2 rounded-lg transition ${showFilters ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:bg-white/10'}`}
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>
                {/* Watchlist Button */}
                <button onClick={onOpenWatchlist} className="bg-zinc-800 p-3.5 rounded-xl border border-white/10 text-white hover:bg-zinc-700">
                    <Bookmark size={22} />
                </button>
            </div>
            
            {/* --- DIE SCOUT ENGINE (FILTER UI) --- */}
            {showFilters && (
                <div className="mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl animate-in slide-in-from-top-2 space-y-6 shadow-2xl">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white text-sm flex items-center gap-2"><SlidersHorizontal size={14}/> Erweiterte Filter</h3>
                        <button 
                            onClick={() => setFilters({ minHeight: 0, maxHeight: 220, minAge: 16, maxAge: 40, positions: [], strongFoot: 'Alle', transferStatus: 'Alle' })}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                            Zurücksetzen
                        </button>
                    </div>
  
                    {/* Positionen Grid */}
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-bold uppercase">Positionen</label>
                        <div className="flex flex-wrap gap-2">
                            {positionsList.map(pos => (
                                <button 
                                    key={pos}
                                    onClick={() => togglePosition(pos)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filters.positions.includes(pos) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                    </div>
  
                    {/* Range Sliders (Simuliert durch Inputs für Stabilität) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-xs text-zinc-500 font-bold uppercase">Größe (cm)</label>
                             <div className="flex items-center gap-2">
                                 <input type="number" value={filters.minHeight || ''} onChange={e => setFilters({...filters, minHeight: parseInt(e.target.value) || 0})} placeholder="Min" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm text-center"/>
                                 <span className="text-zinc-600">-</span>
                                 <input type="number" value={filters.maxHeight || ''} onChange={e => setFilters({...filters, maxHeight: parseInt(e.target.value) || 220})} placeholder="Max" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm text-center"/>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs text-zinc-500 font-bold uppercase">Alter</label>
                             <div className="flex items-center gap-2">
                                 <input type="number" value={filters.minAge} onChange={e => setFilters({...filters, minAge: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm text-center"/>
                                 <span className="text-zinc-600">-</span>
                                 <input type="number" value={filters.maxAge} onChange={e => setFilters({...filters, maxAge: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm text-center"/>
                             </div>
                        </div>
                    </div>
  
                    {/* Dropdowns für Fuß & Status */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs text-zinc-500 font-bold uppercase">Starker Fuß</label>
                            <select value={filters.strongFoot} onChange={e => setFilters({...filters, strongFoot: e.target.value})} className="w-full bg-black border border-zinc-800 text-white p-2 rounded-lg text-sm outline-none">
                                <option>Alle</option>
                                <option>Rechts</option>
                                <option>Links</option>
                                <option>Beidfüßig</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs text-zinc-500 font-bold uppercase">Status</label>
                            <select value={filters.transferStatus} onChange={e => setFilters({...filters, transferStatus: e.target.value})} className="w-full bg-black border border-zinc-800 text-white p-2 rounded-lg text-sm outline-none">
                                <option>Alle</option>
                                <option>Gebunden</option>
                                <option>Suche Verein</option>
                                <option>Vertrag läuft aus</option>
                            </select>
                         </div>
                    </div>
                </div>
            )}
            
            {/* Quick Filter (Status) wenn Hauptfilter zu sind */}
            {!showFilters && (
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                    {['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => (
                        <FilterChip 
                            key={s} 
                            label={s} 
                            active={filters.transferStatus === s} 
                            onClick={() => setFilters(prev => ({...prev, transferStatus: s}))} 
                        />
                    ))}
                </div>
            )}
  
            {/* Ergebnisliste */}
            <div className="space-y-3">
                {loading ? <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : 
                results.length === 0 ? <div className="text-center py-20 text-zinc-600"><Search size={48} className="mx-auto mb-4 opacity-20"/><p>Keine Spieler gefunden.</p></div> :
                results.map(p => (
                    <div key={p.id} onClick={()=>onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 relative">
                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <User size={24} className="text-zinc-600 m-4"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-white text-base">{p.full_name}</h3>
                                <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">{p.position_primary}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-zinc-400"><Shield size={10} /> {p.clubs?.name || "Vereinslos"}</div>
                                {/* Scout Details */}
                                <div className="flex gap-2 text-[10px] text-zinc-500 font-mono border-l border-zinc-700 pl-3">
                                    {p.height_user && <span>{p.height_user}cm</span>}
                                    {p.strong_foot && <span>{p.strong_foot.charAt(0)}</span>}
                                    {p.birth_date && <span>{calculateAge(p.birth_date)}J</span>}
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600"/>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  };
  
  // --- ENDE SEARCH SCREEN ---

const ClubDashboard = ({ club, session, onBack }) => {
    const [activeTab, setActiveTab] = useState('squad'); // 'squad', 'events', 'news'
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [squad, setSquad] = useState([]);
    const [showAddEvent, setShowAddEvent] = useState(false);
    
    // Prüfen ob User Trainer/Admin ist (simuliert durch Mock DB Eintrag oder echte Rolle)
    const [isCoach, setIsCoach] = useState(false);

    const fetchData = useCallback(async () => {
        // 1. Kader laden
        const { data: squadData } = await supabase.from('players_master').select('*').eq('club_id', club.id);
        setSquad(squadData || []);
        
        // Check Role
        const me = squadData?.find(p => p.user_id === session.user.id);
        if (me && (me.club_role === 'coach' || me.club_role === 'admin')) setIsCoach(true);

        // 2. Events laden
        const { data: eventData } = await supabase.from('club_events').select('*').eq('club_id', club.id).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
        setEvents(eventData || []);

        // 3. News laden
        const { data: newsData } = await supabase.from('club_news').select('*').eq('club_id', club.id).order('created_at', { ascending: false });
        setNews(newsData || []);

    }, [club.id, session.user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const TabButton = ({ id, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(id)} className={`flex-1 py-3 border-b-2 flex items-center justify-center gap-2 text-sm font-bold ${activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'}`}>
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-black pb-20">
            {/* Header */}
            <div className="relative h-40 bg-zinc-900">
                {club.logo_url && <img src={club.logo_url} className="w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white"><ArrowLeft size={20}/></button>
                <div className="absolute bottom-4 left-4">
                    <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                    <p className="text-zinc-400 text-xs">{club.league}</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
                <TabButton id="squad" label="Kader" icon={Users} />
                <TabButton id="events" label="Termine" icon={CalendarDays} />
                <TabButton id="news" label="News" icon={Megaphone} />
            </div>

            <div className="p-4 space-y-4">
                {/* TAB: KADER */}
                {activeTab === 'squad' && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-500 text-xs font-bold uppercase">{squad.length} Spieler</span>
                            {/* Gamification: Spielerzähler */}
                            {squad.length < 11 && <span className="text-amber-500 text-xs bg-amber-500/10 px-2 py-1 rounded">Noch {11-squad.length} bis Offiziell</span>}
                        </div>
                        {squad.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">{p.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover"/>}</div>
                                <div>
                                    <div className="text-white font-bold text-sm">{p.full_name} {p.club_role === 'coach' && '👑'}</div>
                                    <div className="text-zinc-500 text-xs">{p.position_primary}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: EVENTS */}
                {activeTab === 'events' && (
                    <div className="space-y-3">
                        {isCoach && (
                            <button onClick={() => setShowAddEvent(true)} className="w-full py-3 border border-dashed border-zinc-700 text-zinc-400 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition">
                                <Plus size={16} /> Termin hinzufügen
                            </button>
                        )}
                        {events.length === 0 ? <div className="text-center text-zinc-600 py-8 text-sm">Keine anstehenden Termine.</div> : 
                            events.map(ev => (
                                <div key={ev.id} className="flex gap-4 p-4 bg-zinc-900 rounded-xl border-l-4 border-blue-500">
                                    <div className="text-center min-w-[50px]">
                                        <div className="text-blue-500 font-bold text-xl">{new Date(ev.start_time).getDate()}</div>
                                        <div className="text-zinc-500 text-xs uppercase">{new Date(ev.start_time).toLocaleString('de-DE', { month: 'short' })}</div>
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">{ev.title}</div>
                                        <div className="text-zinc-400 text-xs flex items-center gap-2 mt-1">
                                            <Clock size={12}/> {new Date(ev.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                            • {ev.location}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* TAB: NEWS */}
                {activeTab === 'news' && (
                    <div className="space-y-4">
                        {isCoach && (
                            <div className="bg-zinc-900 p-3 rounded-xl border border-white/5">
                                <input placeholder="Was gibt's Neues, Coach?" className="w-full bg-transparent text-white text-sm outline-none" />
                            </div>
                        )}
                        {news.length === 0 ? <div className="text-center text-zinc-600 py-8 text-sm">Keine Neuigkeiten.</div> :
                            news.map(n => (
                                <div key={n.id} className="bg-zinc-900 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-blue-400 font-bold text-xs uppercase">{n.title}</span>
                                        <span className="text-zinc-600 text-xs">{new Date(n.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-zinc-300 text-sm">{n.content}</p>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddEvent && <AddEventModal clubId={club.id} onClose={() => setShowAddEvent(false)} onRefresh={fetchData} />}
        </div>
    );
};

// --- 6. MAIN APP UPDATE ---
// Der App-Komponente bleibt weitestgehend gleich, wir müssen nur das Routing für den ClubScreen anpassen,
// damit er jetzt das 'ClubDashboard' rendert, wenn man draufklickt.

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedClub, setViewedClub] = useState(null);
  const [profileHighlights, setProfileHighlights] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [activeCommentsVideo, setActiveCommentsVideo] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0); 

  const activeChatPartnerRef = useRef(activeChatPartner);
  const [reportTarget, setReportTarget] = useState(null);

  const { profile: smartProfile, loading: profileLoading, refresh: refreshProfile } = useSmartProfile(session);

  useEffect(() => {
    if (smartProfile) setCurrentUserProfile(smartProfile);
  }, [smartProfile]);

  useEffect(() => { activeChatPartnerRef.current = activeChatPartner; }, [activeChatPartner]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        setSession(session); 
        if (!session) setCurrentUserProfile(null); 
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = async (sessionData) => {
    setSession(sessionData);
    setShowLogin(false);
    refreshProfile(); 
    setViewedProfile(null); 
    setActiveTab('profile'); 
  };
  
  const handleInstallApp = () => { if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); } else { alert("App ist bereits installiert oder wird nicht unterstützt."); } };
  const handlePushRequest = () => { if ("Notification" in window) { Notification.requestPermission().then(permission => { if (permission === "granted") alert("Push-Benachrichtigungen aktiviert!"); }); } else { alert("Push wird nicht unterstützt."); } };

  const loadProfile = async (targetPlayer) => { 
      let p = { ...targetPlayer };
      if (session) { const { data } = await supabase.from('follows').select('*').match({ follower_id: session.user.id, following_id: p.user_id }).maybeSingle(); p.isFollowing = !!data; }
      const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.user_id);
      p.followers_count = count || 0;
      setViewedProfile(p); 
      const { data } = await supabase.from('media_highlights').select('*').eq('player_id', p.id).order('created_at', { ascending: false }); 
      setProfileHighlights(data || []); 
      setActiveTab('profile'); 
  };
  
  const handleProfileTabClick = () => { 
      if (!session) { setShowLogin(true); return; }
      if (currentUserProfile) { loadProfile(currentUserProfile); } else { refreshProfile(); setViewedProfile(null); setActiveTab('profile'); }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 pb-20">
      {!session && <button onClick={() => setShowLogin(true)} className="fixed top-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white/20 transition hover:scale-105 active:scale-95"><LogIn size={14} /> Login</button>}
      
      {activeTab === 'home' && <HomeScreen key={feedVersion} onVideoClick={setActiveVideo} session={session} onLikeReq={() => setShowLogin(true)} onCommentClick={setActiveCommentsVideo} onUserClick={loadProfile} onReportReq={(id, type) => setReportTarget({id, type})} />}
      {activeTab === 'search' && <SearchScreen onUserClick={loadProfile} onOpenWatchlist={() => { if(!session) setShowLogin(true); else setShowWatchlist(true); }} />}
      {activeTab === 'inbox' && <InboxScreen session={session} onSelectChat={setActiveChatPartner} onUserClick={loadProfile} onLoginReq={() => setShowLogin(true)} />}
      
      {activeTab === 'profile' && (
          <ProfileScreen player={viewedProfile} highlights={profileHighlights} onVideoClick={setActiveVideo} isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)} onBack={() => setActiveTab('home')} onLogout={() => supabase.auth.signOut().then(() => setActiveTab('home'))} onEditReq={() => setShowEditProfile(true)} onSettingsReq={() => setShowSettings(true)} onChatReq={() => { if(!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }} onClubClick={(c) => { setViewedClub(c); setActiveTab('club'); }} onAdminReq={()=>setActiveTab('admin')} onFollow={() => {}} onShowFollowers={() => setShowFollowersModal(true)} onLoginReq={() => setShowLogin(true)} onCreateProfile={() => {}} />
      )}
      
      {/* UPDATE: ClubScreen durch ClubDashboard ersetzt */}
      {activeTab === 'club' && viewedClub && <ClubDashboard club={viewedClub} session={session} onBack={() => setActiveTab('home')} />}
      
      {activeTab === 'admin' && <AdminDashboard session={session} />}
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-[9999] rounded-3xl shadow-2xl shadow-black/50 pointer-events-auto">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'home' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Home size={24} /></button>
          <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'search' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><Search size={24} /></button>
          <div className="relative -top-8"><button onClick={() => session ? setShowUpload(true) : setShowLogin(true)} className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-black transition-transform hover:scale-105 active:scale-95"><Plus size={28} className="text-white" strokeWidth={3} /></button></div>
          <button onClick={() => { setActiveTab('inbox'); setUnreadCount(0); }} className={`flex flex-col items-center gap-1 transition duration-300 relative ${activeTab === 'inbox' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><div className="relative"><Mail size={24} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce shadow-sm border border-black">{unreadCount}</span>}</div></button>
          <button onClick={handleProfileTabClick} className={`flex flex-col items-center gap-1 transition duration-300 ${activeTab === 'profile' ? 'text-blue-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}><User size={24} /></button>
      </div>
      
      <CookieBanner />
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      {activeVideo && <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 animate-in fade-in duration-300"><button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition"><X size={24} className="text-white"/></button><video src={activeVideo.video_url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" /></div>}
      {showEditProfile && currentUserProfile && <EditProfileModal player={currentUserProfile} onClose={() => setShowEditProfile(false)} onUpdate={(updated) => { setCurrentUserProfile(updated); setViewedProfile(updated); }} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onLogout={() => { supabase.auth.signOut(); setShowSettings(false); setSession(null); setCurrentUserProfile(null); setActiveTab('home'); }} installPrompt={deferredPrompt} onInstallApp={handleInstallApp} onRequestPush={handlePushRequest} user={currentUserProfile} onEditReq={() => { setShowSettings(false); setShowEditProfile(true); }} onVerifyReq={() => { setShowSettings(false); setShowVerificationModal(true); }} />}
      {showVerificationModal && <VerificationModal onClose={() => setShowVerificationModal(false)} onUploadComplete={() => { refreshProfile(); }} />}
      {showFollowersModal && viewedProfile && <FollowerListModal userId={viewedProfile.user_id} onClose={() => setShowFollowersModal(false)} onUserClick={(p) => { setShowFollowersModal(false); loadProfile(p); }} />}
      {/* NEU: Watchlist Modal Integration */}
      {showWatchlist && session && <WatchlistModal session={session} onClose={() => setShowWatchlist(false)} onUserClick={(p) => { setShowWatchlist(false); loadProfile(p); }} />}
      {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
      {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} onClose={() => setActiveChatPartner(null)} onUserClick={loadProfile} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if(currentUserProfile) loadProfile(currentUserProfile); setFeedVersion(v => v + 1); }} />}
      {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
    </div>
  );
};

export default App;