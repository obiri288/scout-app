import React, { useEffect, useState, useRef } from 'react';
// import { createClient } from '@supabase/supabase-js'; // Mock aktiv für Preview
import { 
  Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, 
  Activity, MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, 
  Camera, Save, UploadCloud, Mail, Users, ChevronRight, Shield, ShieldAlert, 
  Briefcase, ArrowRight, Instagram, Youtube, Video, Filter, Check, Trash2, 
  Database, Share2, Copy, Trophy, Crown, FileText, Lock, Cookie, Download, 
  Flag, Bell, AlertCircle, Wifi, WifiOff, UserPlus, MapPin, Grid, List, UserCheck,
  Eye, EyeOff
} from 'lucide-react';

// --- MOCK DATABASE & CLIENT (Simulation) ---
const MOCK_USER_ID = "user-123";

const MOCK_DB = {
    players_master: [
        // Leon Goretzka entfernt. Neutraler Demo-User hinzugefügt.
        { id: 99, user_id: "user-demo", full_name: "Nico Schlotterbeck", position_primary: "IV", transfer_status: "Gebunden", avatar_url: "https://images.unsplash.com/photo-1522778119026-d647f0565c6a?w=400&h=400&fit=crop", clubs: { id: 103, name: "BVB 09", league: "Bundesliga", is_icon_league: true }, followers_count: 850, is_verified: true },
    ],
    clubs: [
        { id: 101, name: "FC Berlin", league: "Regionalliga", logo_url: "https://placehold.co/100x100/1e293b/ffffff?text=FCB", is_verified: true },
        { id: 103, name: "BVB 09", league: "Bundesliga", logo_url: "https://placehold.co/100x100/fbbf24/000000?text=BVB", is_verified: true }
    ],
    media_highlights: [
        // Video angepasst auf Demo-User
        { id: 1001, player_id: 99, video_url: "https://assets.mixkit.co/videos/preview/mixkit-soccer-player-training-in-the-stadium-44520-large.mp4", thumbnail_url: "", category_tag: "Training", likes_count: 124, created_at: new Date().toISOString() },
    ],
    follows: [],
    direct_messages: [],
    notifications: []
};

// Simulation des Supabase Clients (Bugfix: Session-Handling)
const createMockClient = () => {
    let currentSession = null; 
    let authListener = null;

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
                if (!email || !password) return { error: { message: "Bitte alles ausfüllen" } };
                
                // Login erfolgreich simulieren
                currentSession = { user: { id: MOCK_USER_ID, email } };
                
                // WICHTIG: Session wird hier korrekt gesetzt
                notify('SIGNED_IN', currentSession);
                
                return { data: { user: currentSession.user, session: currentSession }, error: null };
            },
            signUp: async ({ email, password }) => {
                if (!email || !password) return { error: { message: "Bitte alles ausfüllen" } };
                
                // Registrierung erfolgreich -> direkt einloggen
                currentSession = { user: { id: MOCK_USER_ID, email } };
                notify('SIGNED_IN', currentSession);
                
                return { data: { user: currentSession.user, session: currentSession }, error: null };
            },
            signOut: async () => {
                currentSession = null;
                notify('SIGNED_OUT', null);
                return { error: null };
            }
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
                upsert: (obj) => ({ error: null })
            };
            function helper(d) { return { 
                eq: (c,v) => helper(d.filter(r=>r[c]==v)), 
                ilike: (c,v) => helper(d.filter(r=>r[c]?.toLowerCase().includes(v.replace(/%/g,'').toLowerCase()))),
                in: (c,v) => helper(d.filter(r=>v.includes(r[c]))),
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
const supabase = createMockClient();
const MAX_FILE_SIZE = 50 * 1024 * 1024; 

// --- 3. HELFER & STYLES ---
const getClubStyle = (isIcon) => isIcon ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/20" : "border-white/10";
const btnPrimary = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
const btnSecondary = "bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50";
const inputStyle = "w-full bg-zinc-900/50 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-zinc-600";
const cardStyle = "bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden";
const glassHeader = "bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-4 py-4 pt-12 flex items-center justify-between transition-all";

// --- 4. KOMPONENTEN & MODALS ---

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

// Empty State für fehlendes Profil
const EmptyProfileState = ({ onCreate }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-2xl shadow-blue-900/10 relative overflow-hidden group cursor-pointer" onClick={onCreate}>
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent"></div>
             <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={32} className="text-white"/>
             </div>
             <UserPlus size={40} className="text-zinc-500 relative z-10 group-hover:opacity-0 transition-opacity" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Werde zum Profi</h3>
        <p className="text-zinc-400 mb-8 max-w-xs leading-relaxed text-sm">
            Dein Spielerpass ist noch leer. Erstelle jetzt dein Profil, um von Scouts gefunden zu werden.
        </p>
        <button onClick={onCreate} className={`${btnPrimary} w-full max-w-xs flex items-center justify-center gap-2`}>
            <UserCheck size={18} />
            Profil erstellen
        </button>
    </div>
);

const OnboardingWizard = ({ session, onComplete }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault(); if (!name.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('players_master').upsert({ user_id: session.user.id, full_name: name, position_primary: 'ZM', transfer_status: 'Gebunden' }, { onConflict: 'user_id' });
            if (error) throw error; onComplete();
        } catch (error) { alert("Fehler: " + error.message); } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-md space-y-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"><User size={40} className="text-white" /></div>
                <h1 className="text-3xl font-bold text-white mb-2">Willkommen! 👋</h1>
                <p className="text-zinc-400">Wie sollen dich Scouts nennen?</p>
                <form onSubmit={handleSubmit} className="space-y-4"><input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Spielername" className={inputStyle} required autoFocus /><button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>{loading ? <Loader2 className="animate-spin" /> : "Profil erstellen"}</button></form>
                <button onClick={() => supabase.auth.signOut()} className="text-zinc-500 text-xs hover:text-white underline">Abbrechen</button>
            </div>
        </div>
    );
};

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

const SettingsModal = ({ onClose, onLogout, installPrompt, onInstallApp, onRequestPush, realtimeStatus }) => {
    const [view, setView] = useState('menu');
    const LegalText = ({ title, content }) => (<div className="h-full flex flex-col"><div className="flex items-center gap-3 mb-6 pb-2 border-b border-white/5"><button onClick={() => setView('menu')} className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft size={20} className="text-white" /></button><h3 className="font-bold text-white text-lg">{title}</h3></div><div className="flex-1 overflow-y-auto text-zinc-400 text-sm space-y-4 pr-2 leading-relaxed">{content}</div></div>);
    const MenuItem = ({ icon: Icon, label, onClick, highlight }) => (
        <button onClick={onClick} className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group ${highlight ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}>
            <div className="flex items-center gap-4"><div className={`p-2 rounded-xl ${highlight ? 'bg-blue-500 text-white' : 'bg-black/30 text-zinc-400 group-hover:text-white'}`}><Icon size={20} /></div><span className={`font-semibold ${highlight ? 'text-blue-200' : 'text-zinc-200 group-hover:text-white'}`}>{label}</span></div><ChevronRight size={18} className={highlight ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
        </button>
    );
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className={`w-full max-w-sm ${cardStyle} h-[600px] max-h-[90vh] flex flex-col relative p-6`}>
                <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-white/10 rounded-full transition text-zinc-500 hover:text-white"><X size={20} /></button>
                {view === 'menu' && (
                    <div className="space-y-4 mt-8">
                        <div className="text-center mb-8"><div className="w-16 h-16 bg-gradient-to-tr from-zinc-800 to-zinc-700 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg"><Settings size={32} className="text-zinc-400"/></div><h2 className="text-xl font-bold text-white">Einstellungen</h2><p className="text-zinc-500 text-xs mt-1">Version 2.0.4 (Glass Stable)</p></div>
                        {installPrompt && <MenuItem icon={Download} label="App installieren" onClick={onInstallApp} highlight />}
                        <MenuItem icon={Bell} label="Benachrichtigungen" onClick={onRequestPush} />
                        <div className="h-px bg-white/5 my-2"></div>
                        <MenuItem icon={FileText} label="Impressum" onClick={() => setView('impressum')} />
                        <MenuItem icon={Lock} label="Datenschutz" onClick={() => setView('privacy')} />
                        <div className="pt-4"><button onClick={onLogout} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 p-4 rounded-2xl flex justify-center font-bold items-center gap-2 border border-red-500/20 transition"><LogOut size={18} /> Abmelden</button></div>
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs">
                            {realtimeStatus === 'SUBSCRIBED' ? <Wifi size={12} className="text-green-500"/> : <WifiOff size={12} className="text-red-500"/>}
                            <span className={realtimeStatus === 'SUBSCRIBED' ? 'text-green-500' : 'text-red-500'}>{realtimeStatus === 'SUBSCRIBED' ? 'Verbunden' : 'Getrennt'}</span>
                        </div>
                    </div>
                )}
                {view === 'impressum' && <LegalText title="Impressum" content={<><p>ScoutVision GmbH (i.G.)<br/>Musterstraße 1, 12345 Berlin</p></>} />}
                {view === 'privacy' && <LegalText title="Datenschutz" content={<p>Datenschutzerklärung...</p>} />}
            </div>
        </div>
    );
};

// --- OPTIMIERTE LOGIN MODAL KOMPONENTE ---
const LoginModal = ({ onClose, onSuccess }) => {
  const [view, setView] = useState('login'); // Standard: 'login' (Kein Start-Screen mehr)
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

    // Password Check
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
            // In Mock simulieren wir direkten Success
            setTimeout(() => onSuccess(), 1000); 
            return; 
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (error) { 
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

                    {msg && <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2"><AlertCircle size={14}/> {msg}</div>}
                    
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4"><div className={`w-full sm:max-w-md ${cardStyle} p-6 border-t border-zinc-700 shadow-2xl`}>
      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Clip hochladen</h3><button onClick={onClose}><X className="text-zinc-400 hover:text-white" /></button></div>
      {uploading ? <div className="text-center py-12"><Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" /><p className="text-zinc-400 font-medium">Dein Highlight wird verarbeitet...</p></div> : (
      <div className="space-y-4">
          <div className="bg-zinc-900/50 p-2 rounded-xl border border-white/5"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent text-white p-2 outline-none font-medium"><option>Training</option><option>Match Highlight</option><option>Tor</option><option>Skill</option></select></div>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800/50 hover:border-blue-500/50 transition-all group">
              <div className="p-4 bg-zinc-800 rounded-full mb-3 group-hover:scale-110 transition-transform"><UploadCloud className="w-8 h-8 text-blue-400" /></div><p className="text-sm text-zinc-300 font-medium">Video auswählen</p><p className="text-xs text-zinc-500 mt-1">Max. 50 MB</p><input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
      </div>
      )}
    </div></div>
  );
};

const EditProfileModal = ({ player, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false); const [formData, setFormData] = useState({ full_name: player.full_name || '', position_primary: player.position_primary || 'ZOM', height_user: player.height_user || '', strong_foot: player.strong_foot || 'Rechts', club_id: player.club_id || '', transfer_status: player.transfer_status || 'Gebunden', instagram_handle: player.instagram_handle || '', tiktok_handle: player.tiktok_handle || '', youtube_handle: player.youtube_handle || '' });
  const [avatarFile, setAvatarFile] = useState(null); const [previewUrl, setPreviewUrl] = useState(player.avatar_url); const [clubSearch, setClubSearch] = useState(''); const [clubResults, setClubResults] = useState([]); const [selectedClub, setSelectedClub] = useState(player.clubs || null); const [showCreateClub, setShowCreateClub] = useState(false); const [newClubData, setNewClubData] = useState({ name: '', league: 'Kreisliga' });
  useEffect(() => { if (clubSearch.length < 2) { setClubResults([]); return; } const t = setTimeout(async () => { const { data } = await supabase.from('clubs').select('*').ilike('name', `%${clubSearch}%`).limit(5); setClubResults(data || []); }, 300); return () => clearTimeout(t); }, [clubSearch]);
  const handleCreateClub = async () => { if(!newClubData.name) return; setLoading(true); try { const { data } = await supabase.from('clubs').insert({ name: newClubData.name, league: newClubData.league }).select().single(); setSelectedClub(data); setShowCreateClub(false); } catch(e){} finally { setLoading(false); } }
  const handleSave = async (e) => { e.preventDefault(); setLoading(true); try { let av = player.avatar_url; if (avatarFile) { const p = `${player.user_id}/${Date.now()}.jpg`; await supabase.storage.from('avatars').upload(p, avatarFile); const { data } = supabase.storage.from('avatars').getPublicUrl(p); av = data.publicUrl; } const { data } = await supabase.from('players_master').update({ ...formData, height_user: formData.height_user ? parseInt(formData.height_user) : null, avatar_url: av, club_id: selectedClub?.id || null }).eq('id', player.id).select('*, clubs(*)').single(); onUpdate(data); onClose(); } catch(e){ alert(e.message); } finally { setLoading(false); } };
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full sm:max-w-md ${cardStyle} h-[90vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
        <div className="flex justify-between items-center p-6 border-b border-white/5"><h2 className="text-xl font-bold text-white">Profil bearbeiten</h2><button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button></div>
        <div className="flex-1 overflow-y-auto p-6"><form onSubmit={handleSave} className="space-y-6"><div className="flex justify-center"><div className="relative group cursor-pointer"><div className="w-28 h-28 rounded-full bg-zinc-800 border-4 border-zinc-900 overflow-hidden shadow-xl">{previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-zinc-600 m-8" />}</div><div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><Camera size={28} className="text-white" /></div><input type="file" accept="image/*" onChange={e => {const f=e.target.files[0]; if(f){setAvatarFile(f); setPreviewUrl(URL.createObjectURL(f));}}} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div><div className="space-y-4"><input value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} className={inputStyle} placeholder="Name" /><select value={formData.position_primary} onChange={e=>setFormData({...formData, position_primary: e.target.value})} className={inputStyle}>{['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p=><option key={p}>{p}</option>)}</select>{selectedClub ? <div className="bg-zinc-800 p-4 rounded-xl flex justify-between items-center border border-white/10"><span className="font-bold text-white">{selectedClub.name}</span><button type="button" onClick={()=>setSelectedClub(null)} className="p-1 hover:bg-white/10 rounded"><X size={16} className="text-zinc-400"/></button></div> : <div className="relative"><Search className="absolute left-4 top-4 text-zinc-500" size={18}/><input placeholder="Verein suchen..." value={clubSearch} onChange={e=>setClubSearch(e.target.value)} className={`${inputStyle} pl-12`}/>{clubResults.length > 0 && <div className="absolute z-10 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl">{clubResults.map(c=><div key={c.id} onClick={()=>{setSelectedClub(c); setClubSearch('')}} className="p-3 hover:bg-zinc-800 cursor-pointer text-white border-b border-white/5 last:border-0">{c.name}</div>)}<div onClick={()=>setShowCreateClub(true)} className="p-3 bg-blue-500/10 text-blue-400 cursor-pointer font-bold text-sm">+ "{clubSearch}" neu anlegen</div></div>}</div>}{showCreateClub && <div className="mt-2 bg-zinc-800/50 p-4 rounded-xl border border-white/10 space-y-3 animate-in fade-in"><input placeholder="Name" value={newClubData.name} onChange={e=>setNewClubData({...newClubData, name:e.target.value})} className={inputStyle}/><button type="button" onClick={handleCreateClub} className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg">Erstellen</button></div>}</div><button disabled={loading} className={`${btnPrimary} w-full mt-6`}>{loading ? <Loader2 className="animate-spin mx-auto"/> : "Speichern & Schließen"}</button></form></div>
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

const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
  const [comments, setComments] = useState([]); const [newComment, setNewComment] = useState('');
  useEffect(() => { supabase.from('media_comments').select('*').eq('video_id', video.id).order('created_at',{ascending:false}).then(({data}) => setComments(data||[])) }, [video]);
  const handleSend = async (e) => { e.preventDefault(); if (!newComment.trim() || !session) { if(!session) onLoginReq(); return; } const { data } = await supabase.from('media_comments').insert({ video_id: video.id, user_id: session.user.id, content: newComment }).select().single(); if(data) { setComments([data, ...comments]); setNewComment(''); } };
  return (<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"><div className={`w-full max-w-md ${cardStyle} rounded-t-3xl h-[60vh] flex flex-col shadow-2xl border-t border-zinc-700 animate-in slide-in-from-bottom-10`}><div className="flex justify-between items-center p-5 border-b border-white/5"><div className="text-sm font-bold text-white">Kommentare ({comments.length})</div><button onClick={onClose}><X size={20} className="text-zinc-500 hover:text-white" /></button></div><div className="flex-1 overflow-y-auto p-5 space-y-4">{comments.map(c=><div key={c.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2"><div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 border border-white/5"><User size={14}/></div><div><div className="text-xs text-zinc-400 font-bold mb-0.5">User {c.user_id.slice(0,4)}</div><p className="text-sm text-zinc-200 bg-zinc-800/50 px-3 py-2 rounded-xl rounded-tl-none">{c.content}</p></div></div>)}</div><form onSubmit={handleSend} className="p-4 border-t border-white/5 flex gap-3 bg-zinc-900/80"><input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Kommentar hinzufügen..." className="flex-1 bg-black/50 border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"/><button type="submit" className="p-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition"><Send size={18} /></button></form></div></div>);
};

const AdminDashboard = ({ session }) => {
    const [tab, setTab] = useState('clubs'); const [pendingClubs, setPendingClubs] = useState([]); const [reports, setReports] = useState([]); const [editingClub, setEditingClub] = useState(null); const [editForm, setEditForm] = useState({ logo_url: '', league: '' });
    const fetchPending = async () => { const { data } = await supabase.from('clubs').select('*').eq('is_verified', false); setPendingClubs(data || []); };
    const fetchReports = async () => { const { data } = await supabase.from('reports').select('*').eq('status', 'pending'); setReports(data || []); };
    useEffect(() => { fetchPending(); fetchReports(); }, []);
    const handleVerify = async (club) => { if(!editForm.logo_url || !editForm.league) return alert("Bitte Logo und Liga ausfüllen"); const { error } = await supabase.from('clubs').update({ is_verified: true, logo_url: editForm.logo_url, league: editForm.league }).eq('id', club.id); if(error) alert(error.message); else { setEditingClub(null); fetchPending(); } };
    const handleResolveReport = async (id) => { const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id); if(error) alert(error.message); else fetchReports(); };
    return (<div className="pb-24 pt-8 px-4 max-w-md mx-auto min-h-screen"><h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3"><Database className="text-blue-500"/> Admin</h2><div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2"><button onClick={()=>setTab('clubs')} className={`text-sm font-bold pb-2 px-2 ${tab==='clubs'?'text-white border-b-2 border-blue-500':'text-zinc-500'}`}>Vereine ({pendingClubs.length})</button><button onClick={()=>setTab('reports')} className={`text-sm font-bold pb-2 px-2 ${tab==='reports'?'text-white border-b-2 border-blue-500':'text-zinc-500'}`}>Meldungen ({reports.length})</button></div>{tab === 'clubs' && (<div className="space-y-4">{pendingClubs.length === 0 && <div className="text-zinc-500 text-center py-10">Keine offenen Vereine. Gute Arbeit! 🧹</div>}{pendingClubs.map(c => (<div key={c.id} className={`p-4 ${cardStyle}`}><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-white">{c.name}</h3><span className="text-xs text-zinc-500 font-mono">ID: {c.id.slice(0,8)}</span></div><ShieldAlert className="text-amber-500" size={20}/></div>{editingClub === c.id ? (<div className="space-y-3"><input placeholder="Logo URL" value={editForm.logo_url} onChange={e=>setEditForm({...editForm, logo_url: e.target.value})} className={inputStyle}/><select value={editForm.league} onChange={e=>setEditForm({...editForm, league: e.target.value})} className={inputStyle}><option value="">Liga wählen...</option><option>1. Bundesliga</option><option>2. Bundesliga</option><option>3. Liga</option><option>Regionalliga</option><option>Oberliga</option><option>Verbandsliga</option><option>Landesliga</option><option>Bezirksliga</option><option>Kreisliga</option></select><div className="flex gap-2"><button onClick={()=>handleVerify(c)} className="bg-green-600 text-white text-xs font-bold px-3 py-3 rounded-xl flex-1 flex items-center justify-center gap-1">Verifizieren</button><button onClick={()=>setEditingClub(null)} className="bg-zinc-700 text-white text-xs px-3 py-3 rounded-xl">Abbruch</button></div></div>) : (<div className="flex gap-2"><button onClick={()=>{setEditingClub(c.id); setEditForm({logo_url: c.logo_url||'', league: c.league||''})}} className="bg-blue-600 text-white text-xs font-bold px-4 py-3 rounded-xl flex-1">Bearbeiten</button><button onClick={()=>handleDelete(c.id)} className="bg-red-900/30 text-red-500 text-xs font-bold px-3 py-3 rounded-xl border border-red-500/20"><Trash2 size={16}/></button></div>)}</div>))}</div>)}{tab === 'reports' && (<div className="space-y-4">{reports.map(r => (<div key={r.id} className={`p-4 border-red-900/30 ${cardStyle}`}><div className="flex justify-between items-start mb-3"><span className="text-red-400 text-xs font-bold uppercase bg-red-900/20 px-2 py-1 rounded-md border border-red-500/20">{r.reason}</span><span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span></div><p className="text-white text-sm mb-4">Gemeldetes Objekt: <span className="font-mono text-zinc-400 bg-black/30 px-1 rounded">{r.target_type} {r.target_id.slice(0,6)}...</span></p><div className="flex gap-2"><button onClick={()=>handleResolveReport(r.id)} className="flex-1 bg-zinc-800 text-white text-xs font-bold py-3 rounded-xl hover:bg-zinc-700">Als erledigt markieren</button></div></div>))}</div>)}</div>);
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
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/5 relative">{p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <User size={24} className="text-zinc-600 m-4"/>}</div>
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
                const { data } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).order('created_at',{ascending:false});
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

// 4. PROFILE SCREEN
const ProfileScreen = ({ player, highlights, onVideoClick, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onSettingsReq, onFollow, onShowFollowers, onLoginReq, onCreateProfile, onClubClick, onAdminReq }) => {
    // GAST-CHECK: Eigenes Profil erfordert Login
    if (isOwnProfile && !player) {
        return <EmptyProfileState onCreate={onCreateProfile} />;
    }
    
    if (!player) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Lädt...</div>;
    const statusColors = { 'Gebunden': 'bg-red-500 shadow-red-500/50', 'Vertrag läuft aus': 'bg-amber-500 shadow-amber-500/50', 'Suche Verein': 'bg-emerald-500 shadow-emerald-500/50' };
    const statusColor = statusColors[player.transfer_status] || 'bg-zinc-500';

    return (
        <div className="pb-24 animate-in fade-in">
             <div className="relative">
                 {/* Header Background Gradient */}
                 <div className="absolute inset-0 h-48 bg-gradient-to-b from-blue-900/20 to-black pointer-events-none"></div>
                 
                 <div className="pt-8 px-6 text-center relative z-10">
                     <div className="flex justify-between items-center mb-6">
                        {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-zinc-900/50 rounded-full text-white backdrop-blur-md border border-white/10"><ArrowLeft size={20}/></button> : <div></div>}
                        {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-zinc-900/50 rounded-full text-white backdrop-blur-md border border-white/10"><Settings size={20}/></button>}
                     </div>
                     
                     <div className={`relative mb-4 group inline-block`}>
                        <div className={`absolute -inset-0.5 rounded-full blur opacity-50 bg-blue-600`}></div>
                        <div className={`relative w-28 h-28 rounded-full bg-zinc-900 overflow-hidden border-2 border-black ${getClubStyle(player.clubs?.is_icon_league)}`}>
                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={48} className="text-zinc-600 m-8"/>}
                        </div>
                        {/* Status Badge am Bild */}
                        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-black ${statusColor} flex items-center justify-center`} title={player.transfer_status}></div>
                     </div>
                     
                     <h1 className="text-2xl font-black text-white flex items-center justify-center gap-2 mb-1">
                         {player.full_name} 
                         {player.is_verified && <CheckCircle size={18} className="text-blue-500 fill-blue-500/10"/>}
                         {player.clubs?.is_icon_league && <Crown size={18} className="text-amber-400 fill-amber-400/20"/>}
                     </h1>
                     
                     <p onClick={() => player.clubs && onClubClick(player.clubs)} className="text-zinc-400 text-sm mb-6 font-medium cursor-pointer hover:text-white transition">
                        {player.clubs?.name || "Vereinslos"} <span className="mx-1 text-zinc-600">•</span> <span className="text-zinc-300">{player.position_primary}</span>
                     </p>

                     {/* NEUE STATS LEISTE (Kompakt) */}
                     <div className="flex items-center justify-center gap-6 text-sm mb-6 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm mx-auto max-w-sm">
                        <div className="text-center cursor-pointer hover:opacity-80 transition" onClick={onShowFollowers}>
                            <span className="block font-bold text-white text-lg">{player.followers_count || 0}</span>
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Follower</span>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <span className="block font-bold text-white text-lg">{highlights.length}</span>
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Clips</span>
                        </div>
                        {(player.height_user || player.strong_foot) && (
                            <>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="text-center text-zinc-400 text-xs flex flex-col justify-center">
                                    <div className="font-bold text-white">{player.height_user ? `${player.height_user} cm` : '-'}</div>
                                    <div className="text-zinc-500 text-[10px] uppercase">{player.strong_foot || '-'}</div>
                                </div>
                            </>
                        )}
                     </div>

                     <div className="flex justify-center gap-6 mb-8">
                        {player.instagram_handle && <a href={`https://instagram.com/${player.instagram_handle}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900/50 rounded-xl text-zinc-400 hover:text-pink-500 hover:bg-pink-500/10 transition border border-white/5"><Instagram size={20}/></a>}
                        {player.tiktok_handle && <a href={`https://tiktok.com/@${player.tiktok_handle}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900/50 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition border border-white/5"><Video size={20}/></a>}
                        {player.youtube_handle && <a href={`https://youtube.com/@${player.youtube_handle}`} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900/50 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition border border-white/5"><Youtube size={20}/></a>}
                     </div>

                     <div className="w-full max-w-sm mx-auto flex gap-3">
                         {isOwnProfile ? (
                            <div className="flex-1 flex flex-col gap-2">
                                <button onClick={onEditReq} className={`${btnSecondary} w-full`}>Profil bearbeiten</button>
                                {player.is_admin && <button onClick={onAdminReq} className="text-xs text-blue-400 hover:text-blue-300 py-1 flex items-center justify-center gap-1"><Database size={12}/> Admin</button>}
                            </div>
                         ) : (
                            <>
                                <button onClick={onFollow} disabled={!player.user_id} className={`flex-1 ${player.isFollowing ? btnSecondary : btnPrimary} py-2.5 rounded-xl font-bold text-sm transition-all`}>
                                    {player.isFollowing ? 'Gefolgt' : 'Folgen'}
                                </button>
                                <button onClick={onChatReq} className={`flex-1 ${btnSecondary} py-2.5`}>Nachricht</button>
                            </>
                         )}
                     </div>
                 </div>
             </div>
             
             {/* Video Grid mit neuem Look */}
             <div className="grid grid-cols-3 gap-0.5 mt-6 border-t border-white/10">
                {highlights.map(v => (
                    <div key={v.id} onClick={() => onVideoClick(v)} className="aspect-[3/4] bg-zinc-900 relative cursor-pointer group overflow-hidden">
                        <video src={v.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Play size={8} fill="white"/> {v.category_tag}</div>
                    </div>
                ))}
             </div>
             {highlights.length === 0 && <div className="py-20 text-center text-zinc-600 text-sm">Noch keine Highlights hochgeladen.</div>}
        </div>
    )
}

// 5. CLUB SCREEN
const ClubScreen = ({ club, onBack, onUserClick }) => {
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        const fetchPlayers = async () => {
            const { data } = await supabase.from('players_master').select('*').eq('club_id', club.id);
            setPlayers(data || []);
        };
        fetchPlayers();
    }, [club]);

    return (
        <div className="min-h-screen bg-black pb-24 animate-in slide-in-from-right">
             <div className="relative h-40 bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
                {club.logo_url && <img src={club.logo_url} className="w-full h-full object-cover opacity-30 blur-sm"/>}
                <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition z-10"><ArrowLeft size={20}/></button>
             </div>
             <div className="px-6 -mt-12 relative z-10">
                 <div className="w-24 h-24 bg-zinc-900 rounded-2xl p-1 border border-zinc-800 shadow-2xl mb-4">
                     {club.logo_url ? <img src={club.logo_url} className="w-full h-full object-contain rounded-xl"/> : <Shield size={40} className="text-zinc-600 m-6"/>}
                 </div>
                 <h1 className="text-3xl font-black text-white mb-1">{club.name}</h1>
                 <p className="text-zinc-400 text-sm font-medium mb-6">{club.league}</p>

                 <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Kader ({players.length})</h3>
                 <div className="space-y-3">
                     {players.map(p => (
                         <div key={p.id} onClick={()=>onUserClick(p)} className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition ${cardStyle}`}>
                             <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="text-zinc-500 m-3"/>}
                             </div>
                             <div>
                                 <h4 className="font-bold text-white text-sm">{p.full_name}</h4>
                                 <span className="text-xs text-zinc-500 bg-white/10 px-2 py-0.5 rounded">{p.position_primary}</span>
                             </div>
                             <ChevronRight size={16} className="ml-auto text-zinc-600"/>
                         </div>
                     ))}
                     {players.length === 0 && <p className="text-zinc-500 text-sm">Keine Spieler gefunden.</p>}
                 </div>
             </div>
        </div>
    );
};

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeChatPartnerRef = useRef(activeChatPartner);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => { activeChatPartnerRef.current = activeChatPartner; }, [activeChatPartner]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
        // WICHTIGER FIX: Prüfen, ob session UND session.user existieren
        if (session?.user) fetchMyProfile(session.user.id); 
    });
    
    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        setSession(session); 
        // WICHTIGER FIX: Prüfen, ob session UND session.user existieren
        if (session?.user) fetchMyProfile(session.user.id); 
        else setCurrentUserProfile(null); 
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchMyProfile = async (userId) => { 
      const { data } = await supabase.from('players_master').select('*, clubs(*)').eq('user_id', userId).maybeSingle(); 
      if (data) setCurrentUserProfile(data); 
      // WICHTIG: Wenn KEIN Profil gefunden wird, machen wir hier NICHTS automatisches (kein showOnboarding),
      // damit der EmptyState im ProfileScreen angezeigt werden kann.
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
  
  // Tab-Logik angepasst für Empty State Support
  const handleProfileTabClick = () => { 
      if (session && currentUserProfile) {
          loadProfile(currentUserProfile); 
      } else {
          // Auch wenn kein Profil da ist, wechseln wir zum Tab.
          // Der ProfileScreen kümmert sich um die Anzeige (EmptyState oder GuestFallback).
          setViewedProfile(null); // Reset, damit wir wissen "es ist kein fremdes Profil"
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
            // Hier ist die Logik für "Ist das mein Tab?":
            // 1. Session existiert
            // 2. UND (entweder viewedProfile ist null [d.h. ich habe auf den Tab geklickt] ODER die ID passt)
            isOwnProfile={session && (!viewedProfile || viewedProfile.user_id === session.user.id)}
            
            onBack={() => setActiveTab('home')}
            onLogout={() => supabase.auth.signOut().then(() => setActiveTab('home'))}
            onEditReq={() => setShowEditProfile(true)}
            onSettingsReq={() => setShowSettings(true)}
            onChatReq={() => { if(!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }}
            onClubClick={(c) => { setViewedClub(c); setActiveTab('club'); }}
            onAdminReq={()=>setActiveTab('admin')}
            onFollow={() => {}}
            onShowFollowers={() => setShowFollowersModal(true)}
            onLoginReq={() => setShowLogin(true)}
            onCreateProfile={() => setShowOnboarding(true)} // Öffnet den Wizard
          />
      )}
      
      {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => setActiveTab('home')} onUserClick={loadProfile} />}
      {activeTab === 'admin' && <AdminDashboard session={session} />}
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 flex justify-between items-center z-40 rounded-3xl shadow-2xl shadow-black/50">
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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onLogout={() => { supabase.auth.signOut(); setShowSettings(false); setActiveTab('home'); }} installPrompt={deferredPrompt} onInstallApp={handleInstallApp} onRequestPush={handlePushRequest} />}
      {showFollowersModal && viewedProfile && <FollowerListModal userId={viewedProfile.user_id} onClose={() => setShowFollowersModal(false)} onUserClick={(p) => { setShowFollowersModal(false); loadProfile(p); }} />}
      {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
      {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} onClose={() => setActiveChatPartner(null)} onUserClick={loadProfile} />}
      {showOnboarding && session && <OnboardingWizard session={session} onComplete={() => { setShowOnboarding(false); fetchMyProfile(session.user.id); }} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if(currentUserProfile) loadProfile(currentUserProfile); }} />}
      {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
    </div>
  );
};

export default App;