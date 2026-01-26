import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, 
  MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, 
  Camera, UploadCloud, Mail, Users, ChevronRight, Shield,
  Instagram, Youtube, Video, Check, Trash2, 
  Database, Share2, Crown, FileText, Lock, Cookie, Download, 
  Flag, Bell, AlertCircle, Edit, Key, RefreshCw, AlertTriangle, 
  BadgeCheck, Pause, Upload, Film
} from 'lucide-react';

// --- STYLES ---
const btnPrimary = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50";
const inputStyle = "w-full bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-blue-500 transition placeholder:text-zinc-600";
const cardStyle = "bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden";
const glassHeader = "bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-4 py-4 pt-12 flex items-center justify-between";

// --- MOCK CLIENT ---
const MOCK_USER_ID = "user-123";
const STORAGE_KEY = 'scoutvision_mock_session';

const MOCK_DB = {
    players_master: [
        { 
            id: 99, 
            user_id: "user-demo", 
            full_name: "Demo Spieler", 
            position_primary: "IV", 
            transfer_status: "Gebunden", 
            avatar_url: "https://images.unsplash.com/photo-1522778119026-d647f0565c6a?w=400", 
            clubs: { id: 103, name: "BVB 09", league: "Bundesliga", is_icon_league: true }, 
            followers_count: 850, 
            is_verified: true, 
            height_user: 191,
            strong_foot: "Links",
            is_admin: false
        },
    ],
    clubs: [
        { id: 103, name: "BVB 09", league: "Bundesliga", is_verified: true }
    ],
    media_highlights: [
        { id: 1001, player_id: 99, video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", thumbnail_url: "https://placehold.co/600x800", category_tag: "Training", likes_count: 124, created_at: new Date().toISOString() },
    ],
    follows: [],
    direct_messages: [],
    notifications: [],
    comments: []
};

const createMockClient = () => {
    let currentSession = null;
    let authListener = null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) currentSession = JSON.parse(stored);
    } catch (e) {}

    const notify = (event, session) => {
        if (authListener) authListener(event, session);
    };

    return {
        auth: {
            getSession: async () => ({ data: { session: currentSession }, error: null }),
            onAuthStateChange: (cb) => { 
                authListener = cb;
                if (currentSession) cb('SIGNED_IN', currentSession);
                return { data: { subscription: { unsubscribe: () => { authListener = null; } } } };
            },
            signInWithPassword: async ({ email, password }) => {
                await new Promise(r => setTimeout(r, 500));
                if (!email || !password) return { error: { message: "Bitte ausfüllen" }, data: null };
                currentSession = { user: { id: MOCK_USER_ID, email } };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
                notify('SIGNED_IN', currentSession);
                return { data: { user: currentSession.user, session: currentSession }, error: null };
            },
            signUp: async ({ email, password }) => {
                await new Promise(r => setTimeout(r, 500));
                if (!email || !password) return { error: { message: "Bitte ausfüllen" }, data: null };
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
            }
        },
        from: (table) => {
            const data = MOCK_DB[table] || [];
            let filtered = [...data];
            return {
                select: (query) => {
                    if (table === 'media_highlights' && query && query.includes('players_master')) {
                        filtered = filtered.map(item => ({...item, players_master: MOCK_DB.players_master.find(p => p.id === item.player_id)}));
                    }
                    return helper(filtered);
                },
                insert: (obj) => { 
                    const newItem = { ...obj, id: Date.now() };
                    if(MOCK_DB[table]) MOCK_DB[table].push(newItem);
                    return { 
                        select: () => ({ single: async () => ({ data: newItem, error: null }) }),
                        then: async (cb) => cb({ data: [newItem], error: null })
                    };
                },
                update: (obj) => ({ 
                    eq: (col, val) => { 
                        const idx = MOCK_DB[table].findIndex(r => r[col] == val);
                        let res = { data: null, error: "Not found" };
                        if(idx >= 0) {
                            MOCK_DB[table][idx] = { ...MOCK_DB[table][idx], ...obj };
                            res = { data: MOCK_DB[table][idx], error: null };
                        }
                        return { 
                            select: () => ({ single: async () => res }),
                            then: async (cb) => cb(res)
                        };
                    }
                }),
                upsert: (obj) => { 
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
                    return {
                        select: () => ({ single: async () => ({ data: result, error: null }) }),
                        then: async (cb) => cb({ data: result, error: null })
                    };
                }
            };
            function helper(d) { 
                return { 
                    eq: (c,v) => helper(d.filter(r=>r[c]==v)),
                    ilike: (c,v) => helper(d.filter(r=>r[c]?.toLowerCase().includes(v.replace(/%/g,'').toLowerCase()))),
                    order: () => helper(d),
                    limit: () => helper(d),
                    maybeSingle: async () => ({ data: d[0]||null, error: null }),
                    single: async () => ({ data: d[0]||null, error: null }),
                    then: async (cb) => cb({ data: d, error: null })
                };
            }
        },
        storage: { 
            from: () => ({ 
                upload: async () => {
                    await new Promise(r => setTimeout(r, 1000));
                    return { error: null, data: { path: 'mock-path' } };
                },
                getPublicUrl: () => ({ 
                    data: { publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" }
                })
            })
        }
    };
};

const supabase = createMockClient();
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// --- HOOKS ---
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
                const newProfile = { 
                    user_id: session.user.id,
                    full_name: 'Neuer Spieler',
                    position_primary: 'ZM',
                    transfer_status: 'Gebunden',
                    followers_count: 0,
                    is_verified: false,
                    is_admin: false
                };
                const result = await supabase.from('players_master').upsert(newProfile);
                data = result.data;
            }
            setProfile(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchOrCreateIndex();
    }, [fetchOrCreateIndex]);

    return { profile, loading, refresh: fetchOrCreateIndex, setProfile };
};

// --- COMPONENTS ---
const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed top-6 left-0 right-0 z-[120] flex flex-col items-center gap-3 pointer-events-none px-4">
        {toasts.map(t => (
            <div key={t.id} onClick={()=>removeToast(t.id)} className="bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer animate-in slide-in-from-top-2">
                <div className={`p-3 rounded-full ${t.type==='error'?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400'}`}>
                    {t.type==='error'?<AlertCircle size={20}/>:<Bell size={20}/>}
                </div>
                <div className="flex-1 text-sm font-medium">{t.content}</div>
            </div>
        ))}
    </div>
);

const CookieBanner = () => {
    const [accepted, setAccepted] = useState(false);
    useEffect(() => {
        if (localStorage.getItem('cookie_consent') === 'true') setAccepted(true);
    }, []);
    if (accepted) return null;
    return (
        <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[100]">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <Cookie size={24} className="text-white"/>
                    <div className="text-xs text-zinc-400">Wir nutzen Cookies.</div>
                </div>
                <button onClick={() => { localStorage.setItem('cookie_consent', 'true'); setAccepted(true); }} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm">
                    OK
                </button>
            </div>
        </div>
    );
};

const SettingsModal = ({ onClose, onLogout, onInstallApp, onRequestPush, user, onEditReq }) => {
    const [showToast, setShowToast] = useState(null);
    if (!user) return null;

    const showFeedback = (msg) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(null), 2000);
    };

    const SettingsItem = ({ icon: Icon, label, onClick, danger = false }) => (
        <button onClick={onClick} className={`w-full p-3 flex items-center justify-between group transition-all rounded-xl ${danger ? 'hover:bg-red-500/10' : 'hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${danger ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400 group-hover:text-white'}`}>
                    <Icon size={18} />
                </div>
                <span className={`font-medium text-sm ${danger ? 'text-red-500' : 'text-zinc-200'}`}>{label}</span>
            </div>
            <ChevronRight size={16} className="text-zinc-600"/>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-80 max-w-[85vw] h-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18}/> Einstellungen</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase px-2 mb-2">App</h3>
                        <SettingsItem icon={Download} label="App installieren" onClick={onInstallApp} />
                        <SettingsItem icon={Bell} label="Benachrichtigungen" onClick={onRequestPush} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase px-2 mb-2">Account</h3>
                        <SettingsItem icon={Edit} label="Profil bearbeiten" onClick={onEditReq} />
                        <SettingsItem icon={Share2} label="Profil teilen" onClick={() => showFeedback("Link kopiert")} />
                    </div>
                    <div className="pt-4 border-t border-white/10 space-y-2">
                        <SettingsItem icon={LogOut} label="Abmelden" onClick={onLogout} danger />
                    </div>
                </div>
                {showToast && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl z-20">
                        {showToast}
                    </div>
                )}
            </div>
        </div>
    );
};

const LoginModal = ({ onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            onSuccess(data.session);
        } catch (error) {
            setMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm ${cardStyle} p-8`}>
                <button onClick={onClose} className="absolute top-5 right-5"><X size={20}/></button>
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <User size={28} className="text-white"/>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Willkommen</h2>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="E-Mail" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" placeholder="Passwort" required className={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
                    {msg && <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl">{msg}</div>}
                    <button disabled={loading} className={btnPrimary + " w-full"}>
                        {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : "Anmelden"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const UploadModal = ({ player, onClose, onUploadComplete, addToast }) => {
    const [uploading, setUploading] = useState(false);
    const [category, setCategory] = useState("Training");
    const [progress, setProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            addToast("Datei zu groß!", "error");
            return;
        }
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!selectedFile || !player) return;
        try {
            setUploading(true);
            setProgress(30);
            await supabase.storage.from('player-videos').upload('test', selectedFile);
            setProgress(70);
            await supabase.from('media_highlights').insert({
                player_id: player.id,
                video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
                category_tag: category,
                likes_count: 0
            });
            setProgress(100);
            addToast("Upload erfolgreich!", "success");
            setTimeout(() => { onUploadComplete(); onClose(); }, 500);
        } catch (error) {
            addToast("Upload fehlgeschlagen", "error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full sm:max-w-md ${cardStyle} p-6`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Upload</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                {uploading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4"/>
                        <p className="text-zinc-400">Upload läuft...</p>
                        <div className="w-full bg-zinc-800 rounded-full h-2 mt-4">
                            <div className="bg-blue-600 h-full rounded-full transition-all" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputStyle}>
                            <option>Training</option>
                            <option>Match</option>
                            <option>Tor</option>
                        </select>
                        {preview ? (
                            <div className="relative">
                                <video src={preview} className="w-full rounded-xl" controls/>
                                <button onClick={() => {setSelectedFile(null); setPreview(null);}} className="absolute top-2 right-2 p-2 bg-red-500 rounded-full">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800/50">
                                <UploadCloud className="w-8 h-8 text-blue-400 mb-3"/>
                                <p className="text-sm text-zinc-300">Video auswählen</p>
                                <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect}/>
                            </label>
                        )}
                        {selectedFile && <button onClick={handleUpload} className={btnPrimary + " w-full"}>Hochladen</button>}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProfileScreen = ({ player, highlights, onVideoClick, isOwnProfile, onBack, onSettingsReq }) => {
    if (isOwnProfile && !player) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
    if (!player) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Profil nicht gefunden</div>;

    return (
        <div className="pb-24">
            <div className="relative bg-zinc-900 pb-6 rounded-b-3xl">
                <div className="absolute inset-0 h-40 bg-gradient-to-br from-blue-900/40 to-black"></div>
                <div className="pt-6 px-6 flex justify-between items-center relative z-10">
                    {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ArrowLeft size={20}/></button> : <div></div>}
                    {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-black/40 rounded-full"><Settings size={20}/></button>}
                </div>
                <div className="flex flex-col items-center pt-2 relative z-10 px-6">
                    <div className="w-32 h-32 rounded-full bg-zinc-900 overflow-hidden border-4 border-zinc-900 mb-4">
                        {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover"/> : <User size={56} className="text-zinc-600 m-8"/>}
                    </div>
                    <h1 className="text-3xl font-black text-white mb-1">{player.full_name}</h1>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                        <span>{player.clubs?.name || "Vereinslos"}</span>
                        <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                        <span>{player.position_primary}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full mb-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                            <span className="text-xl font-black text-white">{player.followers_count || 0}</span>
                            <span className="text-xs text-zinc-500 uppercase block mt-1">Follower</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                            <span className="text-xl font-black text-white">{highlights.length}</span>
                            <span className="text-xs text-zinc-500 uppercase block mt-1">Clips</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                            <span className="text-xl font-black text-white">{player.height_user || '-'}</span>
                            <span className="text-xs text-zinc-500 uppercase block mt-1">cm</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {highlights.map(v => (
                    <div key={v.id} onClick={() => onVideoClick(v)} className="aspect-[3/4] bg-zinc-900 relative cursor-pointer">
                        <video src={v.video_url} className="w-full h-full object-cover"/>
                    </div>
                ))}
            </div>
            {highlights.length === 0 && <div className="py-20 text-center text-zinc-600">Keine Videos</div>}
        </div>
    );
};

const HomeScreen = ({ onVideoClick, onUserClick }) => {
    const [feed, setFeed] = useState([]);
    useEffect(() => {
        supabase.from('media_highlights').select('*, players_master(*, clubs(*))').then(({data}) => setFeed(data||[]));
    }, []);

    return (
        <div className="pb-24 max-w-md mx-auto">
            {feed.map(v => (
                <div key={v.id} className="bg-black border-b border-zinc-900/50 pb-6 mb-2">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={()=>onUserClick(v.players_master)}>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                            {v.players_master?.avatar_url ? <img src={v.players_master.avatar_url} className="w-full h-full object-cover"/> : <User className="m-2"/>}
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm">{v.players_master?.full_name}</div>
                            <div className="text-xs text-zinc-500">{v.players_master?.clubs?.name}</div>
                        </div>
                    </div>
                    <div onClick={()=>onVideoClick(v)} className="aspect-[4/5] bg-zinc-900 relative cursor-pointer">
                        <video src={v.video_url} className="w-full h-full object-cover" muted loop playsInline/>
                    </div>
                    <div className="px-4 pt-4 flex items-center gap-6">
                        <Heart size={26} className="text-white"/>
                        <MessageCircle size={26} className="text-white"/>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [session, setSession] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [viewedProfile, setViewedProfile] = useState(null);
    const [profileHighlights, setProfileHighlights] = useState([]);
    const [activeVideo, setActiveVideo] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    const { profile: smartProfile, refresh: refreshProfile } = useSmartProfile(session);

    useEffect(() => {
        if (smartProfile) setCurrentUserProfile(smartProfile);
    }, [smartProfile]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) setCurrentUserProfile(null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const addToast = (content, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, content, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const handleInstallApp = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            setDeferredPrompt(null);
        } else {
            addToast("App bereits installiert", "error");
        }
    };

    const handlePushRequest = () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    addToast("Benachrichtigungen aktiviert!", "success");
                } else {
                    addToast("Benachrichtigungen abgelehnt", "error");
                }
            });
        } else {
            addToast("Nicht unterstützt", "error");
        }
    };

    const handleLoginSuccess = (sessionData) => {
        setSession(sessionData);
        setShowLogin(false);
        refreshProfile();
        setViewedProfile(null);
        setActiveTab('profile');
    };

    const loadProfile = async (targetPlayer) => {
        let p = { ...targetPlayer };
        setViewedProfile(p);
        const { data } = await supabase.from('media_highlights').select('*').eq('player_id', p.id);
        setProfileHighlights(data || []);
        setActiveTab('profile');
    };

    const handleProfileTabClick = () => {
        if (!session) {
            setShowLogin(true);
            return;
        }
        if (currentUserProfile) {
            loadProfile(currentUserProfile);
        } else {
            refreshProfile();
            setViewedProfile(null);
            setActiveTab('profile');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-20">
            {!session && (
                <button onClick={() => setShowLogin(true)} className="fixed top-6 right-6 z-50 bg-white/10 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-white/20 transition">
                    <LogIn size={14}/> Login
                </button>
            )}

            {activeTab === 'home' && <HomeScreen onVideoClick={setActiveVideo} onUserClick={loadProfile} />}

            {activeTab === 'profile' && (
                <ProfileScreen
                    player={viewedProfile}
                    highlights={profileHighlights}
                    onVideoClick={setActiveVideo}
                    isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)}
                    onBack={() => setActiveTab('home')}
                    onSettingsReq={() => setShowSettings(true)}
                />
            )}

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-[9999] rounded-3xl shadow-2xl">
                <button onClick={() => setActiveTab('home')} className={`transition ${activeTab === 'home' ? 'text-blue-400 scale-110' : 'text-zinc-500'}`}>
                    <Home size={24}/>
                </button>
                <button onClick={() => setActiveTab('search')} className={`transition ${activeTab === 'search' ? 'text-blue-400 scale-110' : 'text-zinc-500'}`}>
                    <Search size={24}/>
                </button>
                <div className="relative -top-8">
                    <button onClick={() => session ? setShowUpload(true) : setShowLogin(true)} className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-black">
                        <Plus size={28} className="text-white" strokeWidth={3}/>
                    </button>
                </div>
                <button onClick={() => setActiveTab('inbox')} className={`transition ${activeTab === 'inbox' ? 'text-blue-400 scale-110' : 'text-zinc-500'}`}>
                    <Mail size={24}/>
                </button>
                <button onClick={handleProfileTabClick} className={`transition ${activeTab === 'profile' ? 'text-blue-400 scale-110' : 'text-zinc-500'}`}>
                    <User size={24}/>
                </button>
            </div>

            <CookieBanner />
            <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

            {activeVideo && (
                <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4">
                    <button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 z-10 p-3 bg-white/10 rounded-full">
                        <X size={24} className="text-white"/>
                    </button>
                    <video src={activeVideo.video_url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl"/>
                </div>
            )}

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
                    onInstallApp={handleInstallApp}
                    onRequestPush={handlePushRequest}
                    user={currentUserProfile}
                    onEditReq={() => {
                        setShowSettings(false);
                        addToast("Profil bearbeiten", "success");
                    }}
                />
            )}

            {showLogin && (
                <LoginModal
                    onClose={() => setShowLogin(false)}
                    onSuccess={handleLoginSuccess}
                />
            )}

            {showUpload && (
                <UploadModal
                    player={currentUserProfile}
                    onClose={() => setShowUpload(false)}
                    onUploadComplete={() => {
                        if(currentUserProfile) loadProfile(currentUserProfile);
                    }}
                    addToast={addToast}
                />
            )}
        </div>
    );
};

export default App;