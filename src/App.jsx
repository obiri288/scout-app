import React, { useEffect, useState, useRef, useCallback } from 'react';
// HINWEIS FÜR LOKALE ENTWICKLUNG:
// 1. Installieren Sie: npm install @supabase/supabase-js
// 2. Entkommentieren Sie die folgende Zeile:
// import { createClient } from '@supabase/supabase-js'; 
import { 
  Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, 
  Activity, MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, 
  Camera, Save, UploadCloud, Mail, Users, ChevronRight, Shield, ShieldAlert, 
  Briefcase, ArrowRight, Instagram, Youtube, Video, Filter, Check, Trash2, 
  Database, Share2, Crown, FileText, Lock, Cookie, Download, 
  Flag, Bell, AlertCircle, Wifi, WifiOff, UserPlus, MapPin, Grid, List, UserCheck,
  Eye, EyeOff, Edit, Pencil, Smartphone, Key, RefreshCw, AlertTriangle, FileVideo, Film,
  Calendar, Weight, Hash, Globe
} from 'lucide-react';

// --- 1. HELFER & STYLES ---
const getClubStyle = (isIcon) => isIcon ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/20" : "border-white/10";
const getClubBorderColor = (club) => club?.color_primary || "#ffffff"; 

const btnPrimary = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
const btnSecondary = "bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50";
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

// --- MOCK DATABASE & CLIENT ---
const MOCK_USER_ID = "user-123";
const STORAGE_KEY = 'scoutvision_mock_session';

// UPDATE: Mock-Daten erweitert um neue Felder
const MOCK_DB = {
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
            clubs: { id: 103, name: "BVB 09", short_name: "BVB", league: "Bundesliga", is_icon_league: true, color_primary: "#fbbf24", color_secondary: "#000000", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB" }, 
            followers_count: 850, 
            is_verified: true, 
            height_user: 191, 
            weight: 86,
            strong_foot: "Links",
            birth_date: "1999-12-01",
            jersey_number: 4,
            nationality: "Deutschland"
        },
    ],
    clubs: [
        { id: 101, name: "FC Bayern München", short_name: "FCB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/dc2626/ffffff?text=FCB", is_verified: true, color_primary: "#dc2626", color_secondary: "#ffffff" },
        { id: 102, name: "FC Schalke 04", short_name: "S04", league: "2. Bundesliga", logo_url: "https://placehold.co/100x100/1d4ed8/ffffff?text=S04", is_verified: true, color_primary: "#1d4ed8", color_secondary: "#ffffff" },
        { id: 103, name: "Borussia Dortmund", short_name: "BVB", league: "Bundesliga", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB", is_verified: true, color_primary: "#fbbf24", color_secondary: "#000000" }
    ],
    media_highlights: [
        { id: 1001, player_id: 99, video_url: "https://assets.mixkit.co/videos/preview/mixkit-soccer-player-training-in-the-stadium-44520-large.mp4", thumbnail_url: "", category_tag: "Training", likes_count: 124, created_at: new Date().toISOString() },
    ],
    follows: [],
    direct_messages: [],
    notifications: []
};

// Simulation des Supabase Clients
const createMockClient = () => {
    let currentSession = null; 
    let authListener = null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) currentSession = JSON.parse(stored);
    } catch (e) { console.error(e); }

    const notify = (event, session) => {
        if (authListener) authListener(event, session);
    };

    return {
        auth: {
            getSession: async () => ({ data: { session: currentSession } }),
            onAuthStateChange: (cb) => { 
                authListener = cb; 
                if (currentSession) cb('SIGNED_IN', currentSession);
                return { data: { subscription: { unsubscribe: () => { authListener = null; } } } }; 
            },
            signInWithPassword: async ({ email, password }) => {
                await new Promise(r => setTimeout(r, 500));
                if (!email || !password) return { error: { message: "Bitte alles ausfüllen" } };
                currentSession = { user: { id: MOCK_USER_ID, email } };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
                notify('SIGNED_IN', currentSession);
                return { data: { user: currentSession.user, session: currentSession }, error: null };
            },
            signUp: async ({ email, password }) => {
                await new Promise(r => setTimeout(r, 500));
                if (!email || !password) return { error: { message: "Bitte alles ausfüllen" } };
                currentSession = { user: { id: MOCK_USER_ID, email } };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
                notify('SIGNED_IN', currentSession);
                return { data: { user: currentSession.user, session: currentSession }, error: null };
            },
            signOut: async () => {
                currentSession = null;
                localStorage.removeItem(STORAGE_KEY);
                notify('SIGNED_OUT', null);
                return { error: null };
            },
            resetPasswordForEmail: async () => ({ data: {}, error: null })
        },
        from: (table) => {
            const data = MOCK_DB[table] || [];
            let filtered = [...data];
            return {
                select: (query) => {
                    if (table === 'media_highlights' && query.includes('players_master')) {
                        filtered = filtered.map(item => ({...item, players_master: MOCK_DB.players_master.find(p => p.id === item.player_id)}));
                    }
                    if (table === 'players_master') {
                        filtered = filtered.map(p => {
                            if (p.clubs && typeof p.clubs === 'object') return p; 
                            return p; 
                        });
                    }
                    return helper(filtered);
                },
                insert: async (obj) => { 
                    const newItem = { ...obj, id: Date.now() }; 
                    if(MOCK_DB[table]) MOCK_DB[table].push(newItem); 
                    return { select: () => ({ single: () => ({ data: newItem }) }), catch: ()=>{} }; 
                },
                update: (obj) => ({ eq: (col, val) => { 
                    const idx = MOCK_DB[table].findIndex(r => r[col] == val);
                    if(idx >= 0) MOCK_DB[table][idx] = { ...MOCK_DB[table][idx], ...obj };
                    return { select: () => ({ single: () => ({ data: MOCK_DB[table][idx] }) }) }; 
                }}),
                delete: () => ({ match: () => ({ error: null }) }),
                upsert: async (obj) => { 
                    if (!MOCK_DB[table]) MOCK_DB[table] = [];
                    const existingIdx = MOCK_DB[table].findIndex(r => r.user_id === obj.user_id);
                    let result;
                    if (existingIdx >= 0) {
                         MOCK_DB[table][existingIdx] = { ...MOCK_DB[table][existingIdx], ...obj };
                         result = MOCK_DB[table][existingIdx];
                    } else {
                         result = { ...obj, id: Date.now(), followers_count: 0 };
                         MOCK_DB[table].push(result);
                    }
                    return { data: result, error: null };
                }
            };
            function helper(d) { return { 
                eq: (c,v) => helper(d.filter(r=>r[c]==v)), 
                ilike: (c,v) => helper(d.filter(r=>r[c]?.toLowerCase().includes(v.replace(/%/g,'').toLowerCase()))),
                in: (c,v) => helper(d.filter(r=>v.includes(r[c]))),
                match: (obj) => helper(d.filter(r => Object.keys(obj).every(k => r[k] === obj[k]))),
                or: () => helper(d),
                order: () => helper(d), 
                limit: () => helper(d), 
                maybeSingle: () => ({ data: d[0]||null }), 
                single: () => ({ data: d[0]||null }),
                then: (cb) => cb({ data: d }) 
            };}
        },
        storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "https://placehold.co/600" } }) }) },
        channel: () => ({ on: () => ({ subscribe: () => {} }) }),
        removeChannel: () => {}
    };
};

// AKTIVIERE MOCK FÜR PREVIEW (Für Production bitte createClient nutzen)
const supabase = createMockClient(); 
// const supabase = createClient(supabaseUrl, supabaseKey); 

const MAX_FILE_SIZE = 50 * 1024 * 1024; 

// --- 2. HOOKS ---
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
            let { data } = await supabase.from('players_master')
                .select('*, clubs(*)')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (!data) {
                // Auto-Create Profile for new user
                const newProfile = { 
                    user_id: session.user.id, 
                    full_name: 'Neuer Spieler', 
                    position_primary: 'ZM', 
                    transfer_status: 'Gebunden',
                    followers_count: 0,
                    is_verified: false,
                    is_admin: false
                };
                await supabase.from('players_master').upsert(newProfile);
                data = newProfile;
            }
            setProfile(data);
        } catch (e) {
            console.error("Profile fetch error", e);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchOrCreateIndex();
    }, [fetchOrCreateIndex]);

    return { profile, loading, refresh: fetchOrCreateIndex, setProfile };
};

// --- 3. UI KOMPONENTEN ---

class SafeErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Settings Error:", error, errorInfo); }
    render() {
      if (this.state.hasError) {
        return (
          <div className="p-6 text-center text-white bg-zinc-900 rounded-xl m-4 border border-red-500/30">
            <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
            <h3 className="font-bold mb-2">Ein Fehler ist aufgetreten</h3>
            <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm">Neustarten</button>
          </div>
        );
      }
      return this.props.children; 
    }
}

const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-2xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent"></div>
            <Icon size={40} className="text-zinc-500 relative z-10" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-zinc-400 mb-8 max-w-xs leading-relaxed text-sm">{text}</p>
        <button onClick={onLogin} className={`${btnPrimary} w-full max-w-xs`}>
            Jetzt anmelden / registrieren
        </button>
    </div>
);

const FollowerListModal = ({ userId, onClose, onUserClick }) => {
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { const f = async () => { try { const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId); if (data?.length) { const ids = data.map(f => f.follower_id); const { data: u } = await supabase.from('players_master').select('*, clubs(*)').in('user_id', ids); setFollowers(u||[]); } } catch(e){} finally { setLoading(false); } }; f(); }, [userId]);
    return (<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className={`w-full max-w-md ${cardStyle} h-[70vh] p-4`}><div className="flex justify-between mb-4"><h2 className="font-bold text-white">Follower</h2><button onClick={onClose}><X className="text-zinc-400"/></button></div><div className="space-y-2">{followers.map(p=><div key={p.id} onClick={()=>{onClose();onUserClick(p)}} className="flex gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"><div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">{p.avatar_url?<img src={p.avatar_url} className="w-full h-full object-cover"/>:<User className="m-2"/>}</div><div><div className="text-white font-bold">{p.full_name}</div><div className="text-zinc-500 text-xs">{p.clubs?.name}</div></div></div>)}</div></div></div>);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

// --- EINSTELLUNGEN OVERLAY ---
const SettingsModal = ({ onClose, onLogout, installPrompt, onInstallApp, onRequestPush, user, onEditReq }) => {
    const [showToast, setShowToast] = useState(null);

    // Render-Guard
    if (!user) return null;

    const showFeedback = (msg) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(null), 2000);
    };

    const handleClearCache = () => {
        try {
            localStorage.clear();
            showFeedback('Cache geleert!');
        } catch (e) {
            showFeedback('Fehler beim Leeren');
        }
    };

    const handleShare = () => { 
        if(user?.id) {
            navigator.clipboard.writeText(`https://scoutvision.app/u/${user.id}`); 
            showFeedback('Link in Zwischenablage!');
        }
    };

    const handleDeleteAccount = () => {
        if(confirm("ACHTUNG: Möchtest du deinen Account wirklich unwiderruflich löschen?")) {
            // Echte Löschlogik würde hier eine Cloud Function rufen
            alert("Bitte kontaktiere den Support für die endgültige Löschung.");
        }
    };

    const SettingsItem = ({ icon: Icon, label, onClick, danger = false }) => (
        <button 
            onClick={onClick}
            className={`w-full p-3 flex items-center justify-between group transition-all rounded-xl ${danger ? 'hover:bg-red-500/10' : 'hover:bg-white/5'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${danger ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400 group-hover:text-white'}`}>
                    <Icon size={18} />
                </div>
                <span className={`font-medium text-sm ${danger ? 'text-red-500' : 'text-zinc-200 group-hover:text-white'}`}>{label}</span>
            </div>
            <ChevronRight size={16} className={danger ? 'text-red-500' : 'text-zinc-600 group-hover:text-zinc-400'} />
        </button>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex justify-end">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
             
             {/* Slide-In Panel */}
             <div className="relative w-80 max-w-[85vw] h-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                 {/* Header */}
                 <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18}/> Einstellungen</h2>
                     <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white transition">
                         <X size={20} />
                     </button>
                 </div>
                 
                 {/* Content */}
                 <SafeErrorBoundary>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Section 1 */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">App</h3>
                            <SettingsItem icon={Download} label="App installieren" onClick={onInstallApp} />
                            <SettingsItem icon={Bell} label="Benachrichtigungen" onClick={onRequestPush} />
                            <SettingsItem icon={RefreshCw} label="Cache leeren" onClick={handleClearCache} />
                        </div>

                        {/* Section 2 */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Account</h3>
                            <SettingsItem icon={Edit} label="Profil bearbeiten" onClick={onEditReq} />
                            <SettingsItem icon={Share2} label="Profil teilen" onClick={handleShare} />
                            <SettingsItem icon={Key} label="Passwort ändern" onClick={() => showFeedback("Email gesendet")} />
                        </div>

                        {/* Section 3 */}
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Rechtliches</h3>
                            <SettingsItem icon={Lock} label="Datenschutz" onClick={() => showFeedback("Geöffnet")} />
                            <SettingsItem icon={FileText} label="Impressum" onClick={() => showFeedback("Geöffnet")} />
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-4 border-t border-white/10 space-y-2">
                            <SettingsItem icon={LogOut} label="Abmelden" onClick={onLogout} danger />
                            <SettingsItem icon={Trash2} label="Account löschen" onClick={handleDeleteAccount} danger />
                        </div>
                        
                        <div className="text-center text-zinc-700 text-xs py-4">v2.3.0 Live</div>
                    </div>
                 </SafeErrorBoundary>

                 {/* In-Menu Toast */}
                 {showToast && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-20">
                        {showToast}
                    </div>
                )}
             </div>
        </div>
    );
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
        const { data, error } = await supabase.auth.signUp({ email, password });
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-blue-900/10`}>
        <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition"><X size={20} /></button>
        
        <div className="animate-in fade-in slide-in-from-right-5">
            <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><User size={28} className="text-white"/></div>
                <h2 className="text-2xl font-bold text-white">{view === 'register' ? 'Account erstellen' : 'Willkommen zurück'}</h2>
                <p className="text-zinc-400 text-sm text-center">{view === 'register' ? 'Werde Teil der Community' : 'Melde dich an, um fortzufahren'}</p>
            </div>

            {successMsg ? (
                <div className="text-center space-y-4">
                    <div className="bg-green-500/10 text-green-400 p-4 rounded-xl border border-green-500/20 text-sm">{successMsg}</div>
                </div>
            ) : (
                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-3">
                        <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" placeholder="Passwort" required className={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
                        
                        {view === 'register' && (
                            <div className="animate-in slide-in-from-top-2 fade-in">
                                <input type="password" placeholder="Passwort bestätigen" required className={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {msg && <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex flex-col gap-2"><div className="flex items-center gap-2"><AlertCircle size={14}/> {msg}</div></div>}
                    
                    <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}>
                        {loading && <Loader2 className="animate-spin" size={18} />} 
                        {view === 'register' ? 'Kostenlos registrieren' : 'Anmelden'}
                    </button>
                </form>
            )}

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-zinc-500 text-xs mb-2">{view === 'register' ? 'Du hast schon einen Account?' : 'Neu bei ScoutVision?'}</p>
                <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setMsg(''); }} className="text-white hover:text-blue-400 font-bold text-sm transition">
                    {view === 'register' ? 'Jetzt anmelden' : 'Kostenlos registrieren'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ player, onClose, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false); const [category, setCategory] = useState("Training");
  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > MAX_FILE_SIZE) { alert("Datei zu groß! Max 50 MB."); return; }
    if (!player?.user_id) { alert("Bitte Profil erst vervollständigen."); return; }
    try { setUploading(true); const filePath = `${player.user_id}/${Date.now()}.${file.name.split('.').pop()}`; const { error: upErr } = await supabase.storage.from('player-videos').upload(filePath, file); if (upErr) throw upErr; const { data: { publicUrl } } = supabase.storage.from('player-videos').getPublicUrl(filePath); const { error: dbErr } = await supabase.from('media_highlights').insert({ player_id: player.id, video_url: publicUrl, thumbnail_url: "https://placehold.co/600x400/18181b/ffffff/png?text=Video", category_tag: category }); if (dbErr) throw dbErr; onUploadComplete(); onClose(); } catch (error) { alert('Upload Fehler: ' + error.message); } finally { setUploading(false); }
  };
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full sm:max-w-md ${cardStyle} p-6 border-t border-zinc-700 shadow-2xl relative mb-20 sm:mb-0`}> 
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Clip hochladen</h3><button onClick={onClose}><X className="text-zinc-400 hover:text-white" /></button></div>
        {uploading ? <div className="text-center py-12"><Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" /><p className="text-zinc-400 font-medium">Dein Highlight wird verarbeitet...</p></div> : (
        <div className="space-y-4">
            <div className="bg-zinc-900/50 p-2 rounded-xl border border-white/5"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent text-white p-2 outline-none font-medium"><option>Training</option><option>Match Highlight</option><option>Tor</option><option>Skill</option></select></div>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800/50 hover:border-blue-500/50 transition-all group">
                <div className="p-4 bg-zinc-800 rounded-full mb-3 group-hover:scale-110 transition-transform"><UploadCloud className="w-8 h-8 text-blue-400" /></div><p className="text-sm text-zinc-300 font-medium">Video auswählen</p><p className="text-xs text-zinc-500 mt-1">Max. 50 MB</p><input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
        </div>
        )}
      </div>
    </div>
  );
};

const EditProfileModal = ({ player, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'sport', 'social'
  
  // Intelligente Initialisierung: Versucht Namen zu splitten, falls keine separaten Felder existieren
  const initialFirstName = player.first_name || (player.full_name ? player.full_name.split(' ')[0] : '');
  const initialLastName = player.last_name || (player.full_name ? player.full_name.split(' ').slice(1).join(' ') : '');

  const [formData, setFormData] = useState({ 
      first_name: initialFirstName,
      last_name: initialLastName,
      position_primary: player.position_primary || 'ZOM', 
      height_user: player.height_user || '', 
      weight: player.weight || '',
      strong_foot: player.strong_foot || 'Rechts', 
      transfer_status: player.transfer_status || 'Gebunden',
      instagram_handle: player.instagram_handle || '', 
      tiktok_handle: player.tiktok_handle || '', 
      youtube_handle: player.youtube_handle || '',
      birth_date: player.birth_date || '',
      jersey_number: player.jersey_number || '',
      nationality: player.nationality || ''
  });

  const [avatarFile, setAvatarFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(player.avatar_url); 
  
  // Club Search
  const [clubSearch, setClubSearch] = useState(''); 
  const [clubResults, setClubResults] = useState([]); 
  const [selectedClub, setSelectedClub] = useState(player.clubs || null); 
  const [isSearching, setIsSearching] = useState(false);

  // Suche Logik (Mock-Simulation für Preview, in echter App supabase query)
  useEffect(() => { 
      if (clubSearch.length < 2) { setClubResults([]); return; } 
      const t = setTimeout(async () => { 
          // Hier würde die echte Supabase-Suche stehen
          const { data } = await supabase.from('clubs').select('*').ilike('name', `%${clubSearch}%`).limit(5);
          setClubResults(data || []);
      }, 300); 
      return () => clearTimeout(t); 
  }, [clubSearch]);

  const handleCreateClub = async () => {
    if(!clubSearch.trim()) return; 
    setLoading(true); 
    try { 
        const { data } = await supabase.from('clubs').insert({ name: clubSearch, league: 'Kreisliga', is_verified: false }).select().single(); 
        setSelectedClub(data); 
        setClubSearch('');
        setClubResults([]);
    } catch(e){ alert(e.message); } 
    finally { setLoading(false); } 
  };

  const handleSave = async (e) => { 
      e.preventDefault(); 
      setLoading(true); 
      try { 
          let av = player.avatar_url; 
          if (avatarFile) { 
              const p = `${player.user_id}/${Date.now()}.jpg`; 
              await supabase.storage.from('avatars').upload(p, avatarFile); 
              const { data } = supabase.storage.from('avatars').getPublicUrl(p); 
              av = data.publicUrl; 
          } 
          
          // ZUSAMMENBAUEN
          const full_name = `${formData.first_name} ${formData.last_name}`.trim();
          
          const updates = { 
            ...formData, 
            full_name, // Wichtig für DB Kompatibilität
            height_user: formData.height_user ? parseInt(formData.height_user) : null,
            weight: formData.weight ? parseInt(formData.weight) : null,
            jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
            avatar_url: av, 
            club_id: selectedClub?.id || null 
          };
          
          const { data } = await supabase.from('players_master').update(updates).eq('id', player.id).select('*, clubs(*)').single(); 
          onUpdate(data); 
          onClose(); 
      } catch(e){ 
          alert(e.message); 
      } finally { 
          setLoading(false); 
      } 
  };

  const TabButton = ({ id, label, icon: Icon }) => (
      <button 
          type="button"
          onClick={() => setActiveTab(id)}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === id ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
      >
          <Icon size={16} /> {label}
      </button>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full sm:max-w-md ${cardStyle} h-[90vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900">
            <h2 className="text-lg font-bold text-white">Profil bearbeiten</h2>
            <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-zinc-900">
            <TabButton id="general" label="Allgemein" icon={User} />
            <TabButton id="sport" label="Sportlich" icon={Activity} />
            <TabButton id="social" label="Socials" icon={Share2} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50">
            <form id="edit-form" onSubmit={handleSave} className="space-y-6">
                
                {/* TAB 1: ALLGEMEIN */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        {/* Avatar */}
                        <div className="flex justify-center">
                            <div className="relative group cursor-pointer">
                                <div className="w-28 h-28 rounded-full bg-zinc-800 border-4 border-zinc-900 overflow-hidden shadow-xl">
                                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-zinc-600 m-8" />}
                                </div>
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                                    <Camera size={28} className="text-white" />
                                </div>
                                <input type="file" accept="image/*" onChange={e => {
                                    const f = e.target.files[0]; 
                                    if(f){ setAvatarFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Persönliche Daten</h3>
                            
                            {/* Vorname & Nachname Split */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Vorname</label>
                                    <input value={formData.first_name} onChange={e=>setFormData({...formData, first_name: e.target.value})} className={inputStyle} placeholder="Max" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nachname</label>
                                    <input value={formData.last_name} onChange={e=>setFormData({...formData, last_name: e.target.value})} className={inputStyle} placeholder="Mustermann" />
                                </div>
                            </div>

                            {/* Geburtstag & Nationalität */}
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Geburtsdatum</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
                                        <input type="date" value={formData.birth_date} onChange={e=>setFormData({...formData, birth_date: e.target.value})} className={`${inputStyle} pl-10`} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nationalität</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
                                        <input placeholder="z.B. Deutschland" value={formData.nationality} onChange={e=>setFormData({...formData, nationality: e.target.value})} className={`${inputStyle} pl-10`} />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: SPORTLICH */}
                {activeTab === 'sport' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        {/* Verein */}
                        <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase ml-1 mb-1 block">Aktueller Verein</label>
                            {selectedClub ? (
                                <div className="bg-zinc-800 p-3 rounded-xl flex justify-between items-center border border-blue-500/30 shadow-lg shadow-blue-900/10" style={{ borderColor: getClubBorderColor(selectedClub) }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                            {selectedClub.logo_url ? <img src={selectedClub.logo_url} className="w-full h-full rounded-full object-cover"/> : <Shield size={14}/>}
                                        </div>
                                        <div>
                                            <span className="font-bold text-white block text-sm">{selectedClub.name}</span>
                                            <span className="text-xs text-zinc-500">{selectedClub.league}</span>
                                        </div>
                                    </div>
                                    <button type="button" onClick={()=>setSelectedClub(null)} className="p-2 hover:bg-white/10 rounded-full transition"><X size={16} className="text-zinc-400"/></button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-4 top-4 text-zinc-500" size={18}/>
                                    <input placeholder="Verein suchen..." value={clubSearch} onChange={e=>setClubSearch(e.target.value)} className={`${inputStyle} pl-12`} />
                                    {/* (Suchergebnisse Overlay Logik hier wenn aktiv) */}
                                    {clubResults.length > 0 && (
                                        <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                                            {clubResults.map(c => (
                                                <div key={c.id} onClick={()=>{setSelectedClub(c); setClubSearch('');}} className="p-3 hover:bg-zinc-800 cursor-pointer text-white border-b border-white/5 flex items-center gap-3">
                                                    {c.is_verified ? <CheckCircle size={14} className="text-blue-500"/> : <Shield size={14} className="text-zinc-600"/>}
                                                    <span className="text-sm">{c.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {clubSearch.length > 2 && clubResults.length === 0 && (
                                        <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl p-2">
                                            <div onClick={handleCreateClub} className="p-3 bg-blue-600/10 text-blue-400 cursor-pointer font-bold text-xs hover:bg-blue-600/20 flex items-center gap-2 rounded-lg">
                                                <Plus size={14}/> "{clubSearch}" als neuen Verein anlegen
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Hauptposition</label>
                                <select value={formData.position_primary} onChange={e=>setFormData({...formData, position_primary: e.target.value})} className={inputStyle}>
                                    {['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p=><option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Transfer-Status</label>
                                <select value={formData.transfer_status} onChange={e=>setFormData({...formData, transfer_status: e.target.value})} className={inputStyle}>
                                    <option>Gebunden</option>
                                    <option>Suche Verein</option>
                                    <option>Vertrag läuft aus</option>
                                </select>
                            </div>
                        </div>

                        {/* Physische Daten + Trikotnummer */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-1">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nr.</label>
                                <input type="number" placeholder="#" value={formData.jersey_number} onChange={e=>setFormData({...formData, jersey_number: e.target.value})} className={`${inputStyle} text-center`} />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Größe</label>
                                <input type="number" placeholder="cm" value={formData.height_user} onChange={e=>setFormData({...formData, height_user: e.target.value})} className={inputStyle} />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Gewicht</label>
                                <input type="number" placeholder="kg" value={formData.weight} onChange={e=>setFormData({...formData, weight: e.target.value})} className={inputStyle} />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Fuß</label>
                                <select value={formData.strong_foot} onChange={e=>setFormData({...formData, strong_foot: e.target.value})} className={`${inputStyle} px-1 text-xs`}>
                                    <option>Rechts</option>
                                    <option>Links</option>
                                    <option>Beidfüßig</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: SOCIALS */}
                {activeTab === 'social' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="bg-zinc-800/30 p-4 rounded-xl border border-white/5 text-center mb-2">
                             <p className="text-sm text-zinc-400">Verbinde deine Accounts, damit Scouts mehr von dir sehen können.</p>
                        </div>
                        <div className="relative"><Instagram className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="Instagram Username" value={formData.instagram_handle} onChange={e=>setFormData({...formData, instagram_handle: e.target.value})} className={`${inputStyle} pl-12`}/></div>
                        <div className="relative"><Video className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="TikTok Username" value={formData.tiktok_handle} onChange={e=>setFormData({...formData, tiktok_handle: e.target.value})} className={`${inputStyle} pl-12`}/></div>
                        <div className="relative"><Youtube className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="YouTube Channel" value={formData.youtube_handle} onChange={e=>setFormData({...formData, youtube_handle: e.target.value})} className={`${inputStyle} pl-12`}/></div>
                    </div>
                )}
            </form>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900">
            <button form="edit-form" disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Änderungen speichern</>}
            </button>
        </div>

      </div>
    </div>
  );
};

const ChatWindow = ({ partner, session, onClose, onUserClick }) => {
  const [messages, setMessages] = useState([]); const [txt, setTxt] = useState(''); const endRef = useRef(null);
  useEffect(() => { const f = async () => { const { data } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).or(`sender_id.eq.${partner.user_id},receiver_id.eq.${partner.user_id}`).order('created_at',{ascending:true}); setMessages((data||[]).filter(m => (m.sender_id===session.user.id && m.receiver_id===partner.user_id) || (m.sender_id===partner.user_id && m.receiver_id===session.user.id))); endRef.current?.scrollIntoView(); }; f(); const i = setInterval(f, 3000); return () => clearInterval(i); }, [partner]);
  const send = async (e) => { e.preventDefault(); if(!txt.trim()) return; await supabase.from('direct_messages').insert({sender_id:session.user.id, receiver_id:partner.user_id, content:txt}); setMessages([...messages, {sender_id:session.user.id, content:txt, id:Date.now()}]); setTxt(''); endRef.current?.scrollIntoView(); };
  return (<div className="fixed inset-0 z-[90] bg-black flex flex-col animate-in slide-in-from-right duration-300"><div className="flex items-center gap-4 p-4 pt-12 pb-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-10"><button onClick={onClose}><ArrowLeft className="text-zinc-400 hover:text-white"/></button><div onClick={()=>{onClose(); onUserClick(partner)}} className="flex items-center gap-3 cursor-pointer group"><div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 group-hover:border-blue-500 transition">{partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="m-2.5 text-zinc-500"/>}</div><div className="font-bold text-white">{partner.full_name}</div></div></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-black to-zinc-950">{messages.map(m=><div key={m.id} className={`flex ${m.sender_id===session.user.id?'justify-end':'justify-start'}`}><div className={`px-5 py-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${m.sender_id===session.user.id?'bg-blue-600 text-white rounded-br-none':'bg-zinc-800 text-zinc-200 rounded-bl-none border border-white/5'}`}>{m.content}</div></div>)}<div ref={endRef}/></div><form onSubmit={send} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3 pb-8 sm:pb-4"><input value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Schreib eine Nachricht..." className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-full px-5 py-3 outline-none focus:border-blue-500 transition"/><button className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-90"><Send size={20}/></button></form></div>);
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

const SearchScreen = ({ onUserClick }) => {
  const [query, setQuery] = useState(''); const [res, setRes] = useState([]); const [pos, setPos] = useState('Alle'); const [status, setStatus] = useState('Alle');
  useEffect(() => { const t = setTimeout(async () => { let q = supabase.from('players_master').select('*, clubs(*)'); if(query) q = q.ilike('full_name', `%${query}%`); if(pos !== 'Alle') q = q.eq('position_primary', pos); if(status !== 'Alle') q = q.eq('transfer_status', status); const { data } = await q.limit(20); setRes(data||[]); }, 300); return () => clearTimeout(t); }, [query, pos, status]);
  const FilterChip = ({ label, active, onClick }) => ( <button onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>{label}</button> );
  return (
    <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
      <div className={glassHeader}><h2 className="text-2xl font-black text-white">Scouting</h2></div>
      <div className="px-4 mt-4">
          <div className="relative mb-6"><Search className="absolute left-4 top-4 text-zinc-500" size={20}/><input placeholder="Suche..." value={query} onChange={e=>setQuery(e.target.value)} className={`${inputStyle} pl-12`} /></div>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">{['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={status === s} onClick={() => setStatus(s)} />)}</div>
          <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide border-b border-white/5 mb-4">{['Alle', 'ST','ZOM','ZM','IV','TW'].map(p => <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={pos === p} onClick={() => setPos(p)} />)}</div>
          <div className="space-y-3">
              {res.map(p => (
                  <div key={p.id} onClick={()=>onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 relative">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <User size={24} className="text-zinc-600 m-4"/>}</div>
                      <div className="flex-1">
                          <div className="flex justify-between items-center"><h3 className="font-bold text-white text-base">{p.full_name}</h3><span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">{p.position_primary}</span></div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400"><Shield size={10} /> {p.clubs?.name || "Vereinslos"}</div>
                      </div>
                      <ChevronRight size={18} className="text-zinc-600"/>
                  </div>
              ))}
              {res.length === 0 && <div className="text-center py-20 text-zinc-600"><Search size={48} className="mx-auto mb-4 opacity-20"/><p>Keine Ergebnisse</p></div>}
          </div>
      </div>
    </div>
  );
};

const InboxScreen = ({ session, onSelectChat, onUserClick, onLoginReq }) => {
    const [subTab, setSubTab] = useState('notifications'); const [notis, setNotis] = useState([]); const [chats, setChats] = useState([]);
    if (!session) return <div className="pt-20"><GuestFallback icon={Mail} title="Posteingang" text="Melde dich an, um mit Scouts und anderen Spielern zu chatten." onLogin={onLoginReq} /></div>;
    useEffect(() => {
        if(subTab==='notifications') supabase.from('notifications').select('*, actor:players_master!actor_id(full_name, avatar_url)').order('created_at', {ascending:false}).limit(20).then(({data}) => setNotis(data||[]));
        else if (subTab === 'messages' && session?.user?.id) {
            (async () => {
                const { data } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).or(`sender_id.eq.${partner.user_id},receiver_id.eq.${partner.user_id}`).order('created_at',{ascending:true});
                const map = new Map();
                (data||[]).forEach(m => { const pid = m.sender_id===session.user.id?m.receiver_id:m.sender_id; if(!map.has(pid)) map.set(pid, m); });
                if(map.size>0) { const {data:users} = await supabase.from('players_master').select('*').in('user_id', [...map.keys()]); setChats(users.map(u=>({...u, lastMsg: map.get(u.user_id).content, time: map.get(u.user_id).created_at})).sort((a,b)=>new Date(b.time)-new Date(a.time))); }
            })();
        }
    }, [subTab, session]);
    return (
        <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
            <div className={glassHeader}><h2 className="text-2xl font-black text-white">Inbox</h2></div>
            <div className="px-4 mt-4">
                <div className="flex bg-zinc-900/50 rounded-xl p-1 mb-6 border border-white/5 relative">
                    <button onClick={()=>setSubTab('notifications')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab==='notifications'?'bg-zinc-800 text-white shadow-lg':'text-zinc-500 hover:text-zinc-300'}`}>Mitteilungen</button>
                    <button onClick={()=>setSubTab('messages')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab==='messages'?'bg-zinc-800 text-white shadow-lg':'text-zinc-500 hover:text-zinc-300'}`}>Nachrichten</button>
                </div>
                <div className="space-y-3">
                    {subTab === 'notifications' && (notis.length > 0 ? notis.map(n => (
                        <div key={n.id} className={`flex items-start gap-4 p-4 ${cardStyle}`}>
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shrink-0 mt-1">{n.actor?.avatar_url?<img src={n.actor.avatar_url} className="w-full h-full object-cover"/>:<User size={16} className="text-zinc-500 m-2.5"/>}</div>
                            <div className="flex-1 text-sm text-white pt-1"><span className="font-bold">{n.actor?.full_name||"Jemand"}</span> <span className="text-zinc-400">{n.type==='like'?'hat dein Video geliked.':n.type==='follow'?'folgt dir jetzt.':'hat kommentiert.'}</span></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        </div>
                    )) : <div className="text-center text-zinc-500 py-20 flex flex-col items-center"><Bell size={40} className="mb-4 opacity-20"/><p>Alles ruhig hier.</p></div>)}
                    {subTab === 'messages' && (chats.length > 0 ? chats.map(c => (
                        <div key={c.id} onClick={() => onSelectChat(c)} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition ${cardStyle}`}>
                            <div onClick={(e) => { e.stopPropagation(); onUserClick(c); }} className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition border border-white/10">{c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : <User size={24} className="text-zinc-500"/>}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1"><h4 className="text-base font-bold text-white truncate">{c.full_name}</h4><span className="text-[10px] text-zinc-500">{new Date(c.time).toLocaleDateString()}</span></div>
                                <p className="text-sm text-zinc-400 truncate">{c.lastMsg}</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600"/>
                        </div>
                    )) : <div className="text-center text-zinc-500 py-20 flex flex-col items-center"><Mail size={40} className="mb-4 opacity-20"/><p>Keine Chats vorhanden.</p></div>)}
                </div>
            </div>
        </div>
    );
};

// 4. PROFILE SCREEN (Überarbeitet: Neues Design & Auto-Loading)
const ProfileScreen = ({ player, highlights, onVideoClick, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onSettingsReq, onFollow, onShowFollowers, onLoginReq, onCreateProfile, onClubClick, onAdminReq }) => {
    // Falls ein User eingeloggt ist, aber noch kein Profil hat (wird im Hintergrund erstellt),
    // zeigen wir kurz einen Lade-Indikator, bis das Profil da ist.
    if (isOwnProfile && !player) return <div className="min-h-screen flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2"/> Profil wird geladen...</div>;
    // Falls es ein fremdes Profil ist, das nicht lädt
    if (!player) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Profil nicht gefunden.</div>;
    
    // Status Farben
    const statusColors = { 
        'Gebunden': 'bg-red-500 shadow-red-500/50', 
        'Vertrag läuft aus': 'bg-amber-500 shadow-amber-500/50', 
        'Suche Verein': 'bg-emerald-500 shadow-emerald-500/50' 
    };
    const statusColor = statusColors[player.transfer_status] || 'bg-zinc-500';
    const statusTextClass = player.transfer_status === 'Suche Verein' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : player.transfer_status === 'Vertrag läuft aus' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

    return (
        <div className="pb-24 animate-in fade-in">
             <div className="relative bg-zinc-900 pb-6 rounded-b-[2rem] overflow-hidden shadow-2xl border-b border-white/5">
                 {/* Top Cover / Header */}
                 <div className="absolute inset-0 h-40 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-black pointer-events-none"></div>
                 
                 {/* Nav */}
                 <div className="pt-6 px-6 flex justify-between items-center relative z-10">
                    {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"><ArrowLeft size={20}/></button> : <div></div>}
                    {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"><Settings size={20}/></button>}
                 </div>

                 <div className="flex flex-col items-center pt-2 relative z-10 px-6">
                     {/* Avatar */}
                     <div className={`relative mb-4 group`}>
                        <div className={`absolute -inset-1 rounded-full blur opacity-40 bg-gradient-to-tr from-blue-600 to-purple-600`}></div>
                        <div className={`relative w-32 h-32 rounded-full bg-zinc-900 overflow-hidden border-4 border-zinc-900 shadow-2xl`}>
                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={56} className="text-zinc-600 m-8"/>}
                        </div>
                     </div>
                     
                     {/* Name & Badge */}
                     <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2 mb-1 text-center leading-tight">
                         {player.full_name} 
                         {player.is_verified && <CheckCircle size={20} className="text-blue-500 fill-blue-500/10"/>}
                     </h1>
                     
                     {/* Club & Position */}
                     <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium mb-4">
                        {player.clubs?.is_icon_league && <Crown size={14} className="text-amber-400"/>}
                        <span onClick={() => player.clubs && onClubClick(player.clubs)} className="hover:text-white transition cursor-pointer">{player.clubs?.name || "Vereinslos"}</span>
                        <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                        <span className="text-zinc-300 bg-white/10 px-2 py-0.5 rounded text-xs">{player.position_primary}</span>
                     </div>

                     {/* Transfer Status Pill */}
                     <div className={`mb-6 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusTextClass}`}>
                        {player.transfer_status}
                     </div>

                     {/* Stats Grid - Cards */}
                     <div className="grid grid-cols-3 gap-3 w-full mb-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition" onClick={onShowFollowers}>
                            <span className="text-xl font-black text-white">{player.followers_count || 0}</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Follower</span>
                        </div>
                         <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-white">{highlights.length}</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Clips</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                             <div className="text-white font-bold text-sm">{player.strong_foot || '-'}</div>
                             <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{player.height_user ? `${player.height_user} cm` : 'Größe'}</span>
                        </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="w-full flex gap-3">
                         {isOwnProfile ? (
                             <>
                                <button onClick={onEditReq} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                                    <Edit size={18}/> Profil
                                </button>
                                <button className="bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition">
                                    <Share2 size={20}/>
                                </button>
                                {player.is_admin && <button onClick={onAdminReq} className="bg-blue-900/30 text-blue-400 p-3 rounded-xl border border-blue-500/30 hover:bg-blue-900/50"><Database size={20}/></button>}
                             </>
                         ) : (
                            <>
                                <button onClick={onFollow} className={`flex-1 ${player.isFollowing ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'} border py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}>
                                    {player.isFollowing ? <Check size={18}/> : <Plus size={18}/>}
                                    {player.isFollowing ? 'Gefolgt' : 'Folgen'}
                                </button>
                                <button onClick={onChatReq} className="bg-zinc-800 text-white px-5 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition">
                                    <MessageCircle size={20}/>
                                </button>
                            </>
                         )}
                     </div>
                 </div>
             </div>

             {/* Social Links Row */}
             <div className="flex justify-center gap-6 py-6 border-b border-white/5">
                {player.instagram_handle ? <a href={`https://instagram.com/${player.instagram_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-pink-500 transition"><Instagram size={24}/></a> : <Instagram size={24} className="text-zinc-800"/>}
                {player.tiktok_handle ? <a href={`https://tiktok.com/@${player.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition"><Video size={24}/></a> : <Video size={24} className="text-zinc-800"/>}
                {player.youtube_handle ? <a href={`https://youtube.com/@${player.youtube_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 transition"><Youtube size={24}/></a> : <Youtube size={24} className="text-zinc-800"/>}
             </div>
             
             {/* Content Tabs (Visual only for now) */}
             <div className="flex px-4 pt-4 pb-2 gap-6 text-sm font-bold text-zinc-500 border-b border-white/5">
                 <span className="text-white border-b-2 border-blue-500 pb-2">Highlights</span>
                 <span className="hover:text-zinc-300 cursor-pointer">Stats</span>
                 <span className="hover:text-zinc-300 cursor-pointer">Über</span>
             </div>

             {/* Video Grid */}
             <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {highlights.map(v => (
                    <div key={v.id} onClick={() => onVideoClick(v)} className="aspect-[3/4] bg-zinc-900 relative cursor-pointer group overflow-hidden">
                        <video src={v.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Play size={8} fill="white"/> {v.likes_count}</div>
                    </div>
                ))}
             </div>
             {highlights.length === 0 && <div className="py-20 text-center text-zinc-600 text-sm">Noch keine Highlights hochgeladen.</div>}
        </div>
    )
}

// --- 6. MAIN APP ---
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
  const [toasts, setToasts] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeChatPartnerRef = useRef(activeChatPartner);
  const [reportTarget, setReportTarget] = useState(null);

  // Smart Profile Hook (Auto-Load & Auto-Create)
  const { profile: smartProfile, loading: profileLoading, refresh: refreshProfile } = useSmartProfile(session);

  // Sync smart profile with app state
  useEffect(() => {
    if (smartProfile) setCurrentUserProfile(smartProfile);
  }, [smartProfile]);

  useEffect(() => { activeChatPartnerRef.current = activeChatPartner; }, [activeChatPartner]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
    });
    
    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        setSession(session); 
        if (!session) setCurrentUserProfile(null); 
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = async (sessionData) => {
    setSession(sessionData);
    setShowLogin(false);
    refreshProfile(); // Trigger profile load explicitly
    setViewedProfile(null); // Clear any previous view
    setActiveTab('profile'); // Switch tab
  };
  
  // Fehlende Handler für Settings Menü ergänzt:
  const handleInstallApp = () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        setDeferredPrompt(null);
    } else {
        alert("App ist bereits installiert oder wird nicht unterstützt.");
    }
  };

  const handlePushRequest = () => {
      // Mock Implementation
      if ("Notification" in window) {
          Notification.requestPermission().then(permission => {
              if (permission === "granted") alert("Push-Benachrichtigungen aktiviert!");
          });
      } else {
          alert("Push wird nicht unterstützt.");
      }
  };

  const loadProfile = async (targetPlayer) => { 
      let p = { ...targetPlayer };
      if (session) { const { data } = await supabase.from('follows').select('*').match({ follower_id: session.user.id, following_id: p.user_id }).maybeSingle(); p.isFollowing = !!data; }
      // Echte Follower-Zahl holen
      const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.user_id);
      p.followers_count = count || 0;

      setViewedProfile(p); 
      const { data } = await supabase.from('media_highlights').select('*').eq('player_id', p.id).order('created_at', { ascending: false }); 
      setProfileHighlights(data || []); 
      setActiveTab('profile'); 
  };
  
  // Tab-Logik angepasst
  const handleProfileTabClick = () => { 
      if (!session) {
          setShowLogin(true);
          return;
      }

      // Wenn wir ein Profil haben, laden wir es. Wenn nicht (noch am Laden), zeigen wir den Ladescreen
      if (currentUserProfile) {
          loadProfile(currentUserProfile); 
      } else {
          // Trigger reload if needed, show loading state by setting null viewedProfile
          refreshProfile();
          setViewedProfile(null); 
          setActiveTab('profile'); 
      }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 pb-20">
      {!session && <button onClick={() => setShowLogin(true)} className="fixed top-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white/20 transition hover:scale-105 active:scale-95"><LogIn size={14} /> Login</button>}
      
      {activeTab === 'home' && <HomeScreen onVideoClick={setActiveVideo} session={session} onLikeReq={() => setShowLogin(true)} onCommentClick={setActiveCommentsVideo} onUserClick={loadProfile} onReportReq={(id, type) => setReportTarget({id, type})} />}
      {activeTab === 'search' && <SearchScreen onUserClick={loadProfile} />}
      {activeTab === 'inbox' && <InboxScreen session={session} onSelectChat={setActiveChatPartner} onUserClick={loadProfile} onLoginReq={() => setShowLogin(true)} />}
      
      {activeTab === 'profile' && (
          <ProfileScreen 
            player={viewedProfile} 
            highlights={profileHighlights} 
            onVideoClick={setActiveVideo}
            isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)}
            onBack={() => setActiveTab('home')}
            onLogout={() => supabase.auth.signOut().then(() => setActiveTab('home'))}
            onEditReq={() => setShowEditProfile(true)}
            onSettingsReq={() => setShowSettings(true)} // Öffnet SettingsOverlay
            onChatReq={() => { if(!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }}
            onClubClick={(c) => { setViewedClub(c); setActiveTab('club'); }}
            onAdminReq={()=>setActiveTab('admin')}
            onFollow={() => {}}
            onShowFollowers={() => setShowFollowersModal(true)}
            onLoginReq={() => setShowLogin(true)}
            onCreateProfile={() => {}} // Legacy prop
          />
      )}
      
      {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => setActiveTab('home')} onUserClick={loadProfile} />}
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
      
      {/* Settings Overlay - Integration */}
      {showSettings && (
          <SettingsModal 
              onClose={() => setShowSettings(false)} 
              onLogout={() => { 
                  supabase.auth.signOut(); 
                  setShowSettings(false); 
                  setSession(null); 
                  setCurrentUserProfile(null);
                  setActiveTab('home'); 
              }} 
              installPrompt={deferredPrompt} 
              onInstallApp={handleInstallApp} 
              onRequestPush={handlePushRequest}
              user={currentUserProfile}
              onEditReq={() => {
                  setShowSettings(false);
                  setShowEditProfile(true);
              }}
          />
      )}

      {showFollowersModal && viewedProfile && <FollowerListModal userId={viewedProfile.user_id} onClose={() => setShowFollowersModal(false)} onUserClick={(p) => { setShowFollowersModal(false); loadProfile(p); }} />}
      {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
      {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} onClose={() => setActiveChatPartner(null)} onUserClick={loadProfile} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if(currentUserProfile) loadProfile(currentUserProfile); }} />}
      {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
    </div>
  );
};

export default App;