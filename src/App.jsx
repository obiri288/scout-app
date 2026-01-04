import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Play, CheckCircle, X, Plus, LogIn, LogOut, User, Home, Search, Activity, MoreHorizontal, Heart, MessageCircle, Send, ArrowLeft, Settings, Camera, Save, UploadCloud, Mail, Users, ChevronRight, Shield, ShieldAlert, Briefcase, ArrowRight, Instagram, Youtube, Video, Filter, Check, Trash2, Database, Share2, Copy, Trophy, Crown, FileText, Lock, Cookie, Download, Flag } from 'lucide-react';

// --- 2. KONFIGURATION ---

// Deine Supabase URL und Key (Hardcoded für direkten Start)
const supabaseUrl = "https://wwdfagjgnliwraqrwusc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZhZ2pnbmxpd3JhcXJ3dXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjIwOTksImV4cCI6MjA4MTI5ODA5OX0.CqYfeZG_qrqeHE5PvqVviA-XYMcO0DhG51sKdIKAmJM";

const supabase = createClient(supabaseUrl, supabaseKey);

// Konstante für Upload-Limit (50 MB für ~30-60sek HD Material in guter Qualität)
const MAX_FILE_SIZE = 50 * 1024 * 1024; 

// --- 2. HELFER & STYLES ---
const getClubStyle = (isIcon) => isIcon ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "border-zinc-700";

// --- 3. MODALS & COMPONENTS ---

// COOKIE BANNER
const CookieBanner = () => {
    const [accepted, setAccepted] = useState(false);
    useEffect(() => { const consent = localStorage.getItem('cookie_consent'); if (consent === 'true') setAccepted(true); }, []);
    const handleAccept = () => { localStorage.setItem('cookie_consent', 'true'); setAccepted(true); };
    if (accepted) return null;
    return (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
                <div className="flex items-start gap-3"><div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex-shrink-0"><Cookie size={24} /></div><div className="text-xs text-zinc-300"><span className="font-bold text-white block mb-1 text-sm">Cookies & Datenschutz</span>Wir nutzen technisch notwendige Cookies, um deinen Login-Status zu speichern. Ohne diese funktioniert die App nicht.</div></div>
                <button onClick={handleAccept} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition">Alles klar, verstanden</button>
            </div>
        </div>
    );
};

// REPORT MODAL (NEU - Fehlte vorher!)
const ReportModal = ({ targetId, targetType, onClose, session }) => {
    const [reason, setReason] = useState('Spam');
    const [loading, setLoading] = useState(false);
    
    const handleReport = async () => {
        setLoading(true);
        try {
            // Tabelle 'reports' muss in Supabase existieren, sonst Fehler ignorieren wir hier simuliert
            await supabase.from('reports').insert({ reporter_id: session.user.id, target_id: targetId, target_type: targetType, reason: reason, status: 'pending' }).catch(() => {});
            alert("Vielen Dank! Wir prüfen die Meldung.");
            onClose();
        } catch (e) { alert("Fehler beim Melden."); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Flag size={16} className="text-red-500"/> Inhalt melden</h3>
                <p className="text-xs text-zinc-400 mb-3">Warum möchtest du diesen Inhalt melden?</p>
                <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white p-2 rounded-lg mb-4 outline-none">
                    <option>Spam / Werbung</option>
                    <option>Unangemessener Inhalt</option>
                    <option>Beleidigung</option>
                    <option>Fake Profil</option>
                </select>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 bg-zinc-800 text-white py-2 rounded-lg font-bold text-xs">Abbruch</button>
                    <button onClick={handleReport} disabled={loading} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-xs">Melden</button>
                </div>
            </div>
        </div>
    );
};

// SETTINGS / LEGAL MODAL
const SettingsModal = ({ onClose, onLogout, installPrompt, onInstallApp }) => {
    const [view, setView] = useState('menu');
    const LegalText = ({ title, content }) => (<div className="h-full flex flex-col"><div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2"><button onClick={() => setView('menu')}><ArrowLeft size={20} className="text-zinc-400" /></button><h3 className="font-bold text-white">{title}</h3></div><div className="flex-1 overflow-y-auto text-zinc-400 text-sm space-y-4 pr-2">{content}</div></div>);

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-2xl h-[500px] flex flex-col relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                {view === 'menu' && (
                    <div className="space-y-4 mt-6">
                        <h2 className="text-xl font-bold text-white mb-6 text-center">Einstellungen</h2>
                        {installPrompt && (<button onClick={onInstallApp} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-xl flex items-center justify-between hover:opacity-90 transition mb-4 border border-indigo-400/30 shadow-lg shadow-indigo-500/20"><div className="flex items-center gap-3"><div className="bg-white/20 p-1.5 rounded-lg"><Download size={20} className="text-white" /></div><div className="text-left"><span className="text-white font-bold block text-sm">App installieren</span><span className="text-indigo-200 text-xs">Zum Home-Bildschirm</span></div></div><ChevronRight size={16} className="text-white" /></button>)}
                        <button onClick={() => setView('impressum')} className="w-full bg-zinc-800 p-4 rounded-xl flex items-center justify-between hover:bg-zinc-700 transition"><div className="flex items-center gap-3"><FileText size={20} className="text-zinc-400" /><span className="text-white">Impressum</span></div><ChevronRight size={16} className="text-zinc-600" /></button>
                        <button onClick={() => setView('privacy')} className="w-full bg-zinc-800 p-4 rounded-xl flex items-center justify-between hover:bg-zinc-700 transition"><div className="flex items-center gap-3"><Lock size={20} className="text-zinc-400" /><span className="text-white">Datenschutz</span></div><ChevronRight size={16} className="text-zinc-600" /></button>
                        <hr className="border-zinc-800 my-4" />
                        <button onClick={onLogout} className="w-full bg-red-500/10 p-4 rounded-xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-500/20 transition"><LogOut size={20} /> Abmelden</button>
                        <p className="text-center text-xs text-zinc-600 mt-4">Version 1.1.1 (Stable)</p>
                    </div>
                )}
                {view === 'impressum' && <LegalText title="Impressum" content={<><p>Angaben gemäß § 5 TMG</p><p>ScoutVision GmbH (i.G.)<br/>Musterstraße 1<br/>12345 Berlin</p><p>Kontakt:<br/>E-Mail: info@scoutvision.app</p></>} />}
                {view === 'privacy' && <LegalText title="Datenschutz" content={<><p>Datenschutzerklärung</p><p>Wir nehmen den Schutz deiner Daten ernst. Diese App nutzt Supabase für die Datenspeicherung.</p></>} />}
            </div>
        </div>
    );
};

// LOGIN MODAL
const LoginModal = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      const { error } = isSignUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error; onSuccess();
    } catch (error) { setMsg(error.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
        <div className="text-center mb-6"><div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3"><User size={24} /></div><h2 className="text-2xl font-bold text-white">{isSignUp ? 'Account erstellen' : 'Willkommen zurück'}</h2></div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Passwort" required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          {msg && <p className="text-amber-400 text-xs text-center">{msg}</p>}
          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex justify-center gap-2">{loading && <Loader2 className="animate-spin" size={18} />} {isSignUp ? 'Registrieren' : 'Einloggen'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center mt-4 text-indigo-400 text-sm hover:underline">{isSignUp ? 'Zum Login' : 'Neu registrieren'}</button>
      </div>
    </div>
  );
};

// UPLOAD MODAL (MIT 50MB LIMIT)
const UploadModal = ({ player, onClose, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Training");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { alert("Datei zu groß! Bitte maximal 50 MB hochladen."); return; }
    try {
      setUploading(true);
      const filePath = `${player.user_id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('player-videos').upload(filePath, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('player-videos').getPublicUrl(filePath);
      const { error: dbErr } = await supabase.from('media_highlights').insert({ player_id: player.id, video_url: publicUrl, thumbnail_url: "https://placehold.co/600x400/18181b/ffffff/png?text=Video", category_tag: category });
      if (dbErr) throw dbErr;
      onUploadComplete(); onClose();
    } catch (error) { alert('Upload Fehler: ' + error.message); } finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-xl p-6 border-t sm:border border-zinc-800 shadow-2xl">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Clip hochladen</h3><button onClick={onClose}><X className="text-zinc-400" /></button></div>
        {uploading ? <div className="text-center py-10"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" /><p className="text-zinc-400">Video wird verarbeitet...</p></div> : <div className="space-y-4"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-lg outline-none"><option>Training</option><option>Match Highlight</option><option>Tor</option><option>Skill</option></select><label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-800/50 transition"><UploadCloud className="w-8 h-8 text-zinc-400 mb-2" /><p className="text-sm text-zinc-400">Video auswählen (Max 50MB)</p><input type="file" accept="video/*" className="hidden" onChange={handleFileChange} /></label></div>}
      </div>
    </div>
  );
};

// EDIT PROFILE MODAL
const EditProfileModal = ({ player, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ full_name: player.full_name || '', position_primary: player.position_primary || 'ZOM', height_user: player.height_user || '', strong_foot: player.strong_foot || 'Rechts', club_id: player.club_id || '', transfer_status: player.transfer_status || 'Gebunden', instagram_handle: player.instagram_handle || '', tiktok_handle: player.tiktok_handle || '', youtube_handle: player.youtube_handle || '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(player.avatar_url);
  const [clubSearch, setClubSearch] = useState('');
  const [clubResults, setClubResults] = useState([]);
  const [selectedClub, setSelectedClub] = useState(player.clubs || null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClubData, setNewClubData] = useState({ name: '', league: 'Kreisliga' });

  useEffect(() => { if (clubSearch.length < 2) { setClubResults([]); return; } const timer = setTimeout(async () => { const { data } = await supabase.from('clubs').select('*').ilike('name', `%${clubSearch}%`).limit(5); setClubResults(data || []); }, 300); return () => clearTimeout(timer); }, [clubSearch]);
  const handleCreateClub = async () => { if(!newClubData.name) return; setLoading(true); try { const { data, error } = await supabase.from('clubs').insert({ name: newClubData.name, league: newClubData.league }).select().single(); if(error) throw error; setSelectedClub(data); setShowCreateClub(false); } catch(e) { alert("Fehler: " + e.message); } finally { setLoading(false); } }
  
  const handleSave = async (e) => { 
      e.preventDefault(); setLoading(true); 
      try { 
          let finalAvatarUrl = player.avatar_url; 
          if (avatarFile) { 
              const filePath = `${player.user_id}/${Date.now()}.jpg`; 
              const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, avatarFile); if (upErr) throw upErr; 
              const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath); finalAvatarUrl = publicUrl; 
          }
          const heightValue = formData.height_user ? parseInt(formData.height_user) : null;
          const { data, error } = await supabase.from('players_master').update({ ...formData, height_user: heightValue, avatar_url: finalAvatarUrl, club_id: selectedClub ? selectedClub.id : null }).eq('id', player.id).select('*, clubs(*)').single(); 
          if (error) throw error; onUpdate(data); onClose(); 
      } catch (err) { alert('Fehler: ' + err.message); } finally { setLoading(false); } 
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:max-w-md bg-zinc-900 sm:rounded-xl rounded-t-2xl border-t sm:border border-zinc-800 p-6 shadow-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Profil bearbeiten</h2><button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button></div>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex justify-center"><div className="relative group cursor-pointer"><div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden">{previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <User size={32} className="text-zinc-500" />}</div><div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Camera size={24} className="text-white" /></div><input type="file" accept="image/*" onChange={e => {const f=e.target.files[0]; if(f){setAvatarFile(f); setPreviewUrl(URL.createObjectURL(f));}}} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2"><label className="text-xs text-zinc-500 font-bold uppercase">Name</label><input value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} className="w-full bg-zinc-800 text-white p-3 rounded-lg mt-1" /></div>
             <div className="col-span-2"><label className="text-xs text-zinc-500 font-bold uppercase">Transfer Status</label><select value={formData.transfer_status} onChange={e=>setFormData({...formData, transfer_status: e.target.value})} className="w-full bg-zinc-800 text-white p-3 rounded-lg mt-1 outline-none border border-zinc-700 focus:border-indigo-500"><option value="Gebunden">🔴 Vertraglich gebunden</option><option value="Vertrag läuft aus">🟡 Vertrag läuft aus</option><option value="Suche Verein">🟢 Suche neuen Verein</option></select></div>
             <div className="col-span-2"><label className="text-xs text-zinc-500 font-bold uppercase">Verein</label>{selectedClub ? (<div className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg mt-1 border border-indigo-500/50"><div className="flex items-center gap-3">{selectedClub.is_verified ? <img src={selectedClub.logo_url} className="w-8 h-8 object-contain"/> : <ShieldAlert size={24} className="text-zinc-500" /> }<div><div className="text-sm font-bold text-white">{selectedClub.name}</div><div className="text-xs text-zinc-400">{selectedClub.is_verified ? selectedClub.league : "Unverifiziert (Pending)"}</div></div></div><button type="button" onClick={() => { setSelectedClub(null); setClubSearch(''); setShowCreateClub(false); }}><X size={16} className="text-zinc-400 hover:text-white"/></button></div>) : showCreateClub ? (<div className="bg-zinc-800 p-4 rounded-lg mt-1 border border-zinc-700 space-y-3 animate-in fade-in"><h4 className="text-sm font-bold text-white">Neuen Verein anlegen</h4><input placeholder="Vereinsname" value={newClubData.name} onChange={e=>setNewClubData({...newClubData, name: e.target.value})} className="w-full bg-zinc-900 text-white p-2 rounded border border-zinc-700 text-sm" /><select value={newClubData.league} onChange={e=>setNewClubData({...newClubData, league: e.target.value})} className="w-full bg-zinc-900 text-white p-2 rounded border border-zinc-700 text-sm"><option>Kreisliga</option><option>Bezirksliga</option><option>Landesliga</option><option>Verbandsliga</option><option>Oberliga</option><option>Regionalliga</option><option>Jugendliga</option></select><div className="flex gap-2"><button type="button" onClick={handleCreateClub} className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded flex-1">Erstellen & Beitreten</button><button type="button" onClick={()=>setShowCreateClub(false)} className="bg-zinc-700 text-white text-xs px-3 py-2 rounded">Abbruch</button></div></div>) : (<div className="relative mt-1"><input placeholder="Suche deinen Verein..." value={clubSearch} onChange={e => setClubSearch(e.target.value)} className="w-full bg-zinc-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />{clubSearch.length > 1 && (<div className="absolute z-10 w-full bg-zinc-900 border border-zinc-800 rounded-lg mt-1 shadow-xl overflow-hidden">{clubResults.map(c => (<div key={c.id} onClick={() => { setSelectedClub(c); setClubSearch(''); }} className="p-3 hover:bg-zinc-800 cursor-pointer flex items-center gap-3">{c.is_verified ? <img src={c.logo_url} className="w-6 h-6 object-contain"/> : <Shield size={20} className="text-zinc-500"/>}<div className="text-sm text-white">{c.name}</div></div>))}<div onClick={() => { setNewClubData({...newClubData, name: clubSearch}); setShowCreateClub(true); }} className="p-3 hover:bg-zinc-800 cursor-pointer border-t border-zinc-800 flex items-center gap-2 text-indigo-400"><Plus size={16} /><span className="text-sm font-bold">"{clubSearch}" neu erstellen</span></div></div>)}</div>)}</div>
             <div className="col-span-2 pt-2 border-t border-zinc-800"><h4 className="text-xs text-zinc-500 font-bold uppercase mb-2">Social Media</h4></div>
             <div className="col-span-2 relative"><Instagram className="absolute left-3 top-3 text-zinc-500" size={16} /><input placeholder="Instagram Username" value={formData.instagram_handle} onChange={e=>setFormData({...formData, instagram_handle: e.target.value})} className="w-full bg-zinc-800 text-white p-3 pl-10 rounded-lg text-sm" /></div>
             <div className="col-span-2 relative"><Briefcase className="absolute left-3 top-3 text-zinc-500" size={16} /><input placeholder="TikTok Username" value={formData.tiktok_handle} onChange={e=>setFormData({...formData, tiktok_handle: e.target.value})} className="w-full bg-zinc-800 text-white p-3 pl-10 rounded-lg text-sm" /></div>
             <div><label className="text-xs text-zinc-500 font-bold uppercase">Position</label><select value={formData.position_primary} onChange={e=>setFormData({...formData, position_primary: e.target.value})} className="w-full bg-zinc-800 text-white p-3 rounded-lg mt-1">{['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p=><option key={p}>{p}</option>)}</select></div>
             <div><label className="text-xs text-zinc-500 font-bold uppercase">Fuß</label><select value={formData.strong_foot} onChange={e=>setFormData({...formData, strong_foot: e.target.value})} className="w-full bg-zinc-800 text-white p-3 rounded-lg mt-1"><option>Rechts</option><option>Links</option><option>Beidfüßig</option></select></div>
             <div className="col-span-2"><label className="text-xs text-zinc-500 font-bold uppercase">Größe (cm)</label><input type="number" value={formData.height_user} onChange={e=>setFormData({...formData, height_user: e.target.value})} className="w-full bg-zinc-800 text-white p-3 rounded-lg mt-1" /></div>
          </div>
          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex justify-center gap-2 mt-4">{loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Speichern</>}</button>
        </form>
      </div>
    </div>
  );
};

// CHAT WINDOW
const ChatWindow = ({ partner, session, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  useEffect(() => { const fetchMsgs = async () => { const { data } = await supabase.from('direct_messages').select('*').or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).or(`sender_id.eq.${partner.user_id},receiver_id.eq.${partner.user_id}`).order('created_at', { ascending: true }); const chat = (data || []).filter(m => (m.sender_id === session.user.id && m.receiver_id === partner.user_id) || (m.sender_id === partner.user_id && m.receiver_id === session.user.id)); setMessages(chat); scrollToBottom(); }; fetchMsgs(); const interval = setInterval(fetchMsgs, 3000); return () => clearInterval(interval); }, [partner]);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  const handleSend = async (e) => { e.preventDefault(); if(!newMessage.trim()) return; const msg = { sender_id: session.user.id, receiver_id: partner.user_id, content: newMessage }; setMessages([...messages, { ...msg, id: Date.now() }]); setNewMessage(''); scrollToBottom(); await supabase.from('direct_messages').insert(msg); };
  return (
    <div className="fixed inset-0 z-[90] bg-zinc-950 flex flex-col animate-in slide-in-from-right">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900"><button onClick={onClose}><ArrowLeft className="text-zinc-400" /></button><div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">{partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="m-1.5 text-zinc-500"/>}</div><div className="font-bold text-white">{partner.full_name}</div></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">{messages.map(m => (<div key={m.id} className={`flex ${m.sender_id === session.user.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_id === session.user.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>{m.content}</div></div>))}<div ref={messagesEndRef} /></div>
      <form onSubmit={handleSend} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2"><input value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Nachricht..." className="flex-1 bg-zinc-800 text-white rounded-full px-4 py-3 outline-none" /><button type="submit" className="bg-indigo-600 p-3 rounded-full text-white"><Send size={20} /></button></form>
    </div>
  );
};

// COMMENTS MODAL
const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  useEffect(() => { supabase.from('media_comments').select('*').eq('video_id', video.id).order('created_at', {ascending:false}).then(({data}) => setComments(data||[])) }, [video]);
  const handleSend = async (e) => { e.preventDefault(); if (!newComment.trim() || !session) { if(!session) onLoginReq(); return; } const { data } = await supabase.from('media_comments').insert({ video_id: video.id, user_id: session.user.id, content: newComment }).select().single(); if(data) { setComments([data, ...comments]); setNewComment(''); } };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 rounded-t-2xl h-[60vh] flex flex-col shadow-2xl border-t border-zinc-800 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800"><div className="text-sm font-bold text-white w-full text-center">{comments.length} Kommentare</div><button onClick={onClose}><X size={16} className="text-zinc-400" /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{comments.map(c => (<div key={c.id} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"><User size={14} className="text-zinc-400"/></div><div><div className="text-xs text-zinc-500 font-bold mb-0.5">User {c.user_id.slice(0,4)}</div><p className="text-sm text-zinc-200">{c.content}</p></div></div>))}</div>
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 flex gap-2 bg-zinc-900"><input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Kommentieren..." className="flex-1 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm outline-none" /><button type="submit" className="p-2 bg-indigo-600 rounded-full text-white"><Send size={16} /></button></form>
      </div>
    </div>
  );
};

// FEED ITEM
const FeedItem = ({ video, onClick, session, onLikeReq, onCommentClick, onUserClick, onClubClick, onReportReq }) => {
  const player = video.players_master;
  const club = player?.clubs;
  const [likes, setLikes] = useState(video.likes_count || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const handleLike = async (e) => { e.stopPropagation(); if (!session) { onLikeReq(); return; } const newStatus = !isLiked; setIsLiked(newStatus); setLikes(p => newStatus ? p+1 : p-1); if(newStatus){ setAnimateHeart(true); setTimeout(()=>setAnimateHeart(false), 800); } try { if(newStatus) { await supabase.from('media_likes').insert({user_id:session.user.id, video_id:video.id}); await supabase.rpc('increment_likes',{row_id:video.id}); } else { await supabase.from('media_likes').delete().match({user_id:session.user.id, video_id:video.id}); } } catch(e){} };
  
  return (
    <div className="bg-zinc-900 border-b border-zinc-800 pb-6 mb-6 last:border-0 relative">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={()=>onUserClick(player)}>
             <div className={`w-10 h-10 rounded-full bg-zinc-800 border flex items-center justify-center overflow-hidden ${getClubStyle(club?.is_icon_league)}`}>
               {player?.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <span className="font-bold text-zinc-500">{player?.full_name?.charAt(0)}</span>}
             </div>
             {club && <div onClick={(e)=>{e.stopPropagation(); onClubClick(club)}} className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-black p-0.5 cursor-pointer hover:scale-110 transition flex items-center justify-center">{club.is_verified ? <img src={club.logo_url} className="w-full h-full object-contain" /> : <Shield size={10} className="text-zinc-500 fill-zinc-200" />}</div>}
          </div>
          <div><h3 className="text-sm font-bold text-white flex items-center gap-1 cursor-pointer" onClick={()=>onUserClick(player)}>{player?.full_name} {player?.is_verified && <CheckCircle size={12} className="text-blue-500" />}</h3><p className="text-xs text-zinc-400 cursor-pointer hover:text-white" onClick={()=>club && onClubClick(club)}>{club?.name || "Vereinslos"}</p></div>
        </div>
        <div className="relative"><button onClick={(e) => {e.stopPropagation(); setShowMenu(!showMenu)}} className="text-zinc-500 hover:text-white p-2"><MoreHorizontal size={20}/></button>{showMenu && (<div className="absolute right-0 top-full bg-black border border-zinc-800 rounded-lg shadow-xl z-20 w-32 overflow-hidden animate-in fade-in"><button onClick={(e) => {e.stopPropagation(); setShowMenu(false); onReportReq(video.id, 'video');}} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-zinc-900 flex items-center gap-2"><Flag size={14}/> Melden</button></div>)}</div>
      </div>
      <div onClick={()=>onClick(video)} className="aspect-[4/5] bg-black relative cursor-pointer overflow-hidden group">
         <video src={video.video_url} className="w-full h-full object-cover" muted loop playsInline onMouseOver={e=>e.target.play()} onMouseOut={e=>e.target.pause()} />
         {animateHeart && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Heart size={80} className="text-white fill-white animate-ping" /></div>}
         <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white">{video.category_tag}</div>
      </div>
      <div className="px-4 py-3 flex items-center gap-6"><button onClick={handleLike} className={`flex items-center gap-2 transition ${isLiked?'text-red-500':'text-white'}`}><Heart size={26} className={isLiked?"fill-red-500":""}/><span className="font-bold text-sm">{likes}</span></button><button onClick={(e)=>{e.stopPropagation(); onCommentClick(video)}} className="flex items-center gap-2 text-white"><MessageCircle size={26} /><span className="font-bold text-sm">Chat</span></button><div className="ml-auto text-zinc-400 flex items-center gap-1"><Activity size={18} /><span className="text-xs">{video.views_count}</span></div></div>
    </div>
  );
};

// --- SCREENS ---
const ClubScreen = ({ club, onBack, onUserClick }) => {
    const [squad, setSquad] = useState([]);
    useEffect(() => { supabase.from('players_master').select('*, clubs(*)').eq('club_id', club.id).then(({data}) => setSquad(data||[])); }, [club]);
    const handleInvite = async () => { const text = `Komm zu ${club.name}!`; const url = window.location.href; if (navigator.share) { try { await navigator.share({ title: club.name, text, url }); } catch(e) {} } else { alert("Link kopiert!"); } };
    const memberCount = squad.length; const needed = 11; const progress = Math.min((memberCount / needed) * 100, 100);

    return (
        <div className="pb-24 animate-in fade-in min-h-screen">
             <div className="bg-zinc-900 pb-8 pt-10 px-6 border-b border-zinc-800 text-center relative">
                 <button onClick={onBack} className="absolute left-4 top-4 p-2 bg-white/10 rounded-full text-white"><ArrowLeft size={20}/></button>
                 <div className={`w-24 h-24 mx-auto mb-4 bg-white rounded-full p-4 shadow-lg flex items-center justify-center ${club.is_icon_league ? 'shadow-[0_0_30px_rgba(251,191,36,0.5)] border-2 border-amber-400' : ''}`}>
                     {club.is_verified ? <img src={club.logo_url} className="w-full h-full object-contain"/> : <Shield size={64} className="text-zinc-400" />}
                 </div>
                 <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">{club.name} {club.is_verified && <CheckCircle size={20} className="text-blue-500 fill-blue-500/20"/>} {club.is_icon_league && <Trophy size={20} className="text-amber-400 fill-amber-400/20"/>}</h1>
                 <p className="text-zinc-400 text-sm mb-6">{club.league || "Amateur"}</p>
                 {!club.is_verified && (<div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 mb-6"><div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-zinc-400 uppercase">Status</span><span className="text-sm font-bold text-white">{memberCount} / {needed} Spieler</span></div><div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${progress}%`}}></div></div><button onClick={handleInvite} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 animate-pulse"><Share2 size={18} /> Einladen</button></div>)}
                 {club.is_verified && (<div className="flex justify-center gap-4 text-sm font-bold text-zinc-300"><div className="bg-zinc-800 px-4 py-2 rounded-lg">{squad.length} Spieler</div></div>)}
             </div>
             <div className="p-4"><h3 className="text-zinc-500 text-xs font-bold uppercase mb-3 ml-1">Kader</h3><div className="space-y-2">{squad.map(p => (<div key={p.id} onClick={()=>onUserClick(p)} className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition"><div className={`w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden ${getClubStyle(club.is_icon_league)}`}>{p.avatar_url?<img src={p.avatar_url} className="w-full h-full object-cover"/>:<span className="font-bold text-zinc-500">{p.full_name?.charAt(0)}</span>}</div><div className="flex-1"><h4 className="text-white font-bold text-sm">{p.full_name}</h4><span className="text-xs text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">{p.position_primary}</span></div><ChevronRight size={16} className="text-zinc-600"/></div>))}</div></div>
        </div>
    );
};

const HomeScreen = ({ onVideoClick, session, onLikeReq, onCommentClick, onUserClick, onClubClick, onReportReq }) => {
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('for_you'); // 'for_you' | 'following'
  
  useEffect(() => {
      const fetchFeed = async () => {
          let query = supabase.from('media_highlights').select(`*, players_master (id, full_name, user_id, position_primary, avatar_url, is_verified, clubs (*))`).order('created_at', {ascending:false});
          if(tab === 'following' && session) {
              const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
              const followingIds = follows?.map(f => f.following_id) || [];
              if(followingIds.length > 0) { const { data: players } = await supabase.from('players_master').select('id').in('user_id', followingIds); const playerIds = players?.map(p => p.id) || []; if(playerIds.length > 0) query = query.in('player_id', playerIds); else { setFeed([]); return; } } else { setFeed([]); return; }
          }
          const { data } = await query.limit(50); setFeed(data||[]);
      };
      fetchFeed();
  }, [tab, session]);

  return (
      <div className="pb-24 pt-4 md:pt-0 max-w-md mx-auto">
          <div className="fixed top-0 left-0 w-full z-30 flex justify-center pt-4 pb-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"><div className="flex gap-4 pointer-events-auto"><button onClick={()=>setTab('for_you')} className={`text-sm font-bold drop-shadow-md ${tab==='for_you'?'text-white scale-110':'text-zinc-400'}`}>Für dich</button><div className="w-px h-4 bg-zinc-500/50 self-center"></div><button onClick={()=>{ if(!session) onLikeReq(); else setTab('following'); }} className={`text-sm font-bold drop-shadow-md ${tab==='following'?'text-white scale-110':'text-zinc-400'}`}>Gefolgt</button></div></div>
          <div className="pt-0">{feed.length > 0 ? feed.map(v => <FeedItem key={v.id} video={v} onClick={onVideoClick} session={session} onLikeReq={onLikeReq} onCommentClick={onCommentClick} onUserClick={onUserClick} onClubClick={onClubClick} onReportReq={onReportReq} />) : (<div className="min-h-screen flex flex-col items-center justify-center text-zinc-500 pb-20"><p>Keine Videos gefunden.</p></div>)}</div>
      </div>
  );
};

// SEARCH SCREEN
const SearchScreen = ({ onUserClick }) => {
  const [query, setQuery] = useState(''); const [res, setRes] = useState([]); const [pos, setPos] = useState('Alle'); const [foot, setFoot] = useState('Alle'); const [status, setStatus] = useState('Alle');
  useEffect(() => { const t = setTimeout(async () => { let q = supabase.from('players_master').select('*, clubs(*)'); if(query) q = q.ilike('full_name', `%${query}%`); if(pos !== 'Alle') q = q.eq('position_primary', pos); if(foot !== 'Alle') q = q.eq('strong_foot', foot); if(status !== 'Alle') q = q.eq('transfer_status', status); const { data } = await q.limit(20); setRes(data||[]); }, 300); return () => clearTimeout(t); }, [query, pos, foot, status]);
  const getStatusColor = (s) => { if(s === 'Suche Verein') return 'bg-emerald-500'; if(s === 'Vertrag läuft aus') return 'bg-amber-500'; return 'bg-red-500'; };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen">
      <h2 className="text-2xl font-bold text-white mb-4">Scouting</h2>
      <div className="relative mb-4"><div className="absolute left-3 top-3 text-zinc-400"><Search size={20}/></div><input placeholder="Suchen..." value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500" /></div>
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2"><select onChange={e=>setStatus(e.target.value)} className={`text-xs px-3 py-2 rounded-full font-bold outline-none border ${status!=='Alle' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-white border-zinc-800'}`}><option value="Alle">Status: Alle</option><option value="Suche Verein">🟢 Suche neuen Verein</option><option value="Vertrag läuft aus">🟡 Vertrag läuft aus</option><option value="Gebunden">🔴 Gebunden</option></select><select onChange={e=>setPos(e.target.value)} className="bg-zinc-800 text-white text-xs px-3 py-2 rounded-full outline-none"><option value="Alle">Pos: Alle</option>{['ST','ZOM','ZM','IV','TW'].map(p=><option key={p}>{p}</option>)}</select><select onChange={e=>setFoot(e.target.value)} className="bg-zinc-800 text-white text-xs px-3 py-2 rounded-full outline-none"><option value="Alle">Fuß: Alle</option><option>Rechts</option><option>Links</option></select></div>
      <div className="space-y-3">{res.map(p => (<div key={p.id} onClick={()=>onUserClick(p)} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-800 transition relative overflow-hidden"><div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(p.transfer_status)}`}></div><div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 ml-2">{p.avatar_url?<img src={p.avatar_url} className="w-full h-full object-cover"/>:<span className="font-bold text-zinc-500">{p.full_name?.charAt(0)}</span>}</div><div className="flex-1"><div className="flex justify-between items-center"><h3 className="font-bold text-white text-sm flex items-center gap-2">{p.full_name}{p.transfer_status === 'Suche Verein' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}</h3><span className="text-xs bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-500 font-bold">{p.position_primary}</span></div><div className="flex justify-between mt-1"><p className="text-xs text-zinc-400">{p.clubs?.name || "Vereinslos"}</p><p className="text-[10px] text-zinc-500 uppercase">{p.transfer_status || 'Gebunden'}</p></div></div></div>))}{res.length === 0 && <div className="text-center py-10 text-zinc-500 text-sm">Keine Spieler gefunden.</div>}</div>
    </div>
  );
};

const InboxScreen = ({ session }) => {
    const [subTab, setSubTab] = useState('notifications'); const [notis, setNotis] = useState([]);
    useEffect(() => { if(subTab==='notifications') supabase.from('notifications').select('*, actor:players_master!actor_id(full_name, avatar_url)').order('created_at', {ascending:false}).limit(20).then(({data}) => setNotis(data||[])); }, [subTab]);
    return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen">
            <h2 className="text-2xl font-bold text-white mb-4">Posteingang</h2>
            <div className="flex gap-6 border-b border-zinc-800 mb-6"><button onClick={()=>setSubTab('notifications')} className={`pb-2 text-sm font-bold ${subTab==='notifications'?'text-white border-b-2 border-indigo-500':'text-zinc-500'}`}>Mitteilungen</button><button onClick={()=>setSubTab('messages')} className={`pb-2 text-sm font-bold ${subTab==='messages'?'text-white border-b-2 border-indigo-500':'text-zinc-500'}`}>Nachrichten</button></div>
            <div className="space-y-4">{subTab === 'notifications' && (notis.length > 0 ? notis.map(n => (<div key={n.id} className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50"><div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">{n.actor?.avatar_url?<img src={n.actor.avatar_url} className="w-full h-full object-cover"/>:<User size={16} className="text-zinc-500"/>}</div><div className="flex-1 text-sm text-white"><span className="font-bold">{n.actor?.full_name||"Jemand"}</span> <span className="text-zinc-400">{n.type==='like'?'hat dein Video geliked.':n.type==='follow'?'folgt dir jetzt.':'hat kommentiert.'}</span></div></div>)) : <div className="text-center text-zinc-500 py-10">Keine neuen Mitteilungen.</div>)}{subTab === 'messages' && (<div className="text-center text-zinc-500 py-10"><Mail size={48} className="mx-auto mb-3 opacity-20" /><p>Chats erscheinen hier.</p></div>)}</div>
        </div>
    );
};

// ADMIN DASHBOARD
const AdminDashboard = ({ session }) => {
    const [tab, setTab] = useState('clubs'); const [pendingClubs, setPendingClubs] = useState([]); const [reports, setReports] = useState([]); const [editingClub, setEditingClub] = useState(null); const [editForm, setEditForm] = useState({ logo_url: '', league: '' });
    const fetchPending = async () => { const { data } = await supabase.from('clubs').select('*').eq('is_verified', false); setPendingClubs(data || []); };
    const fetchReports = async () => { const { data } = await supabase.from('reports').select('*').eq('status', 'pending'); setReports(data || []); };
    useEffect(() => { fetchPending(); fetchReports(); }, []);
    const handleVerify = async (club) => { if(!editForm.logo_url || !editForm.league) return alert("Bitte Logo und Liga ausfüllen"); const { error } = await supabase.from('clubs').update({ is_verified: true, logo_url: editForm.logo_url, league: editForm.league }).eq('id', club.id); if(error) alert(error.message); else { setEditingClub(null); fetchPending(); } };
    const handleResolveReport = async (id) => { const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id); if(error) alert(error.message); else fetchReports(); };
    return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen"><h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Database className="text-indigo-500"/> Admin Dashboard</h2><div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2"><button onClick={()=>setTab('clubs')} className={`text-sm font-bold pb-2 ${tab==='clubs'?'text-white border-b-2 border-indigo-500':'text-zinc-500'}`}>Vereine ({pendingClubs.length})</button><button onClick={()=>setTab('reports')} className={`text-sm font-bold pb-2 ${tab==='reports'?'text-white border-b-2 border-indigo-500':'text-zinc-500'}`}>Meldungen ({reports.length})</button></div>{tab === 'clubs' && (<div className="space-y-4">{pendingClubs.length === 0 && <div className="text-zinc-500 text-center py-10">Keine offenen Vereine. Gute Arbeit! 🧹</div>}{pendingClubs.map(c => (<div key={c.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-white">{c.name}</h3><span className="text-xs text-zinc-500">ID: {c.id}</span></div><ShieldAlert className="text-amber-500" size={20}/></div>{editingClub === c.id ? (<div className="space-y-3"><input placeholder="Logo URL (Wikimedia...)" value={editForm.logo_url} onChange={e=>setEditForm({...editForm, logo_url: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 rounded text-xs text-white"/><select value={editForm.league} onChange={e=>setEditForm({...editForm, league: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 rounded text-xs text-white"><option value="">Liga wählen...</option><option>1. Bundesliga</option><option>2. Bundesliga</option><option>3. Liga</option><option>Regionalliga</option><option>Oberliga</option><option>Verbandsliga</option><option>Landesliga</option><option>Bezirksliga</option><option>Kreisliga</option></select><div className="flex gap-2"><button onClick={()=>handleVerify(c)} className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded flex-1 flex items-center justify-center gap-1"><Check size={14}/> Verifizieren</button><button onClick={()=>setEditingClub(null)} className="bg-zinc-700 text-white text-xs px-3 py-2 rounded">Abbruch</button></div></div>) : (<div className="flex gap-2"><button onClick={()=>{setEditingClub(c.id); setEditForm({logo_url: c.logo_url||'', league: c.league||''})}} className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded flex-1">Bearbeiten</button><button onClick={()=>handleDelete(c.id)} className="bg-red-900/50 text-red-500 text-xs font-bold px-3 py-2 rounded"><Trash2 size={16}/></button></div>)}</div>))}</div>)}{tab === 'reports' && (<div className="space-y-4">{reports.map(r => (<div key={r.id} className="bg-zinc-900 border border-red-900/30 p-4 rounded-xl"><div className="flex justify-between items-start mb-2"><span className="text-red-400 text-xs font-bold uppercase bg-red-900/20 px-2 py-1 rounded">{r.reason}</span><span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span></div><p className="text-white text-sm mb-4">Gemeldetes Objekt: <span className="font-mono text-zinc-400">{r.target_type} {r.target_id.slice(0,6)}...</span></p><div className="flex gap-2"><button onClick={()=>handleResolveReport(r.id)} className="flex-1 bg-zinc-800 text-white text-xs font-bold py-2 rounded hover:bg-zinc-700">Als erledigt markieren</button></div></div>))}</div>)}</div>
    );
};

// PROFILE SCREEN (MIT ICON LEAGUE STYLING)
const ProfileScreen = ({ player, highlights, onVideoClick, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onClubClick, onAdminReq, onSettingsReq }) => {
    if (!player) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Lädt...</div>;
    const statusColors = { 'Gebunden': 'bg-red-500', 'Vertrag läuft aus': 'bg-amber-500', 'Suche Verein': 'bg-emerald-500' };
    const statusColor = statusColors[player.transfer_status] || 'bg-zinc-500';

    return (
        <div className="pb-24 animate-in fade-in">
             <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 pb-6 pt-10 px-6 border-b border-zinc-800 text-center relative">
                 {!isOwnProfile && <button onClick={onBack} className="absolute left-4 top-4 p-2 bg-white/10 rounded-full text-white"><ArrowLeft size={20}/></button>}
                 
                 {/* SETTINGS BUTTON (ZAHNRAD) */}
                 {isOwnProfile && <button onClick={onSettingsReq} className="absolute right-4 top-4 p-2 bg-white/10 rounded-full text-white"><Settings size={20}/></button>}
                 
                 <div className={`w-24 h-24 rounded-full bg-zinc-800 border-4 flex items-center justify-center overflow-hidden relative mx-auto mb-3 ${getClubStyle(player.clubs?.is_icon_league)}`}>
                     {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-zinc-600">{player.full_name?.charAt(0)}</span>}
                 </div>

                 <h1 className="text-2xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                     {player.full_name} 
                     {player.is_verified && <CheckCircle size={18} className="text-blue-500 fill-blue-500/20"/>}
                     {player.clubs?.is_icon_league && <Crown size={18} className="text-amber-400 fill-amber-400"/>}
                 </h1>
                 
                 <div className="flex justify-center mb-3"><div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1"><div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div><span className="text-xs font-bold text-zinc-300">{player.transfer_status || 'Gebunden'}</span></div></div>
                 <div className="flex justify-center gap-4 mb-4">{player.instagram_handle && <a href={`https://instagram.com/${player.instagram_handle}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-pink-500 transition"><Instagram size={20}/></a>}{player.tiktok_handle && <a href={`https://tiktok.com/@${player.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition"><Video size={20}/></a>}{player.youtube_handle && <a href={`https://youtube.com/@${player.youtube_handle}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-red-500 transition"><Youtube size={20}/></a>}</div>
                 <p className="text-zinc-400 text-sm mb-4 cursor-pointer hover:text-white transition" onClick={()=>player.clubs && onClubClick(player.clubs)}>{player.clubs ? (<span className="flex items-center gap-1 justify-center">{player.clubs.is_verified ? <img src={player.clubs.logo_url} className="w-4 h-4 object-contain"/> : <Shield size={12} />} {player.clubs.name}</span>) : "Vereinslos"} • {player.position_primary}</p>
                 <div className="flex justify-center gap-4 text-xs text-zinc-500 mb-6 bg-zinc-900/50 p-2 rounded-lg inline-flex mx-auto border border-zinc-800/50"><div><span className="block text-white font-bold">{player.height_user ? `${player.height_user} cm` : '-'}</span> Größe</div><div className="w-px bg-zinc-800"></div><div><span className="block text-white font-bold">{player.strong_foot || '-'}</span> Fuß</div></div>
                 <div className="flex justify-center gap-6 text-sm mb-6 border-t border-b border-zinc-800 py-4"><div className="flex flex-col"><span className="font-bold text-white text-lg">{player.followers_count || 0}</span><span className="text-zinc-500 text-xs uppercase">Follower</span></div><div className="flex flex-col"><span className="font-bold text-white text-lg">{highlights.length}</span><span className="text-zinc-500 text-xs uppercase">Clips</span></div></div>
                 {isOwnProfile ? (<div className="space-y-2"><button onClick={onEditReq} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-semibold text-sm border border-zinc-700 transition">Profil bearbeiten</button>{player.is_admin && <button onClick={onAdminReq} className="w-full bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-500/30 py-2.5 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"><Database size={16}/> Admin Dashboard</button>}</div>) : (<div className="flex gap-2"><button className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm">Folgen</button><button onClick={onChatReq} className="flex-1 bg-zinc-800 text-white py-2.5 rounded-lg font-semibold text-sm border border-zinc-700">Nachricht</button></div>)}
             </div>
             <div className="grid grid-cols-3 gap-0.5 bg-black">{highlights.map(v => (<div key={v.id} onClick={() => onVideoClick(v)} className="aspect-[3/4] bg-zinc-900 relative cursor-pointer"><video src={v.video_url} className="w-full h-full object-cover opacity-80" /></div>))}</div>
        </div>
    )
}

// --- 4. MAIN APP ---
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
  const [showSettings, setShowSettings] = useState(false); // Settings State
  const [activeChatPartner, setActiveChatPartner] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  // PWA STATE
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchMyProfile(session.user.id); });
    supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchMyProfile(session.user.id); else setCurrentUserProfile(null); });
    
    // PWA INSTALL LISTENER
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallApp = () => {
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
              setDeferredPrompt(null);
          }
      });
  };

  const fetchMyProfile = async (userId) => { const { data } = await supabase.from('players_master').select('*, clubs(*)').eq('user_id', userId).single(); if (data) { setCurrentUserProfile(data); if(!data.full_name || data.full_name === 'Neuer Spieler') setShowOnboarding(true); } };
  const loadProfile = async (player) => { setViewedProfile(player); const { data } = await supabase.from('media_highlights').select('*').eq('player_id', player.id).order('created_at', { ascending: false }); setProfileHighlights(data || []); setActiveTab('profile'); };
  const loadClub = (club) => { setViewedClub(club); setActiveTab('club'); };
  const handleProfileTabClick = () => { if (session && currentUserProfile) loadProfile(currentUserProfile); else setShowLogin(true); };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      {!session && <button onClick={() => setShowLogin(true)} className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-indigo-700 transition"><LogIn size={14} /> Login</button>}
      
      {activeTab === 'home' && <HomeScreen onVideoClick={setActiveVideo} session={session} onLikeReq={() => setShowLogin(true)} onCommentClick={setActiveCommentsVideo} onUserClick={loadProfile} onClubClick={loadClub} onReportReq={(id, type) => setReportTarget({id, type})} />}
      {activeTab === 'search' && <SearchScreen onUserClick={loadProfile} />}
      {activeTab === 'inbox' && <InboxScreen session={session} />}
      
      {activeTab === 'profile' && (
          <ProfileScreen 
            player={viewedProfile} 
            highlights={profileHighlights} 
            onVideoClick={setActiveVideo}
            isOwnProfile={session && viewedProfile?.user_id === session.user.id}
            onBack={() => setActiveTab('home')}
            onLogout={() => supabase.auth.signOut().then(() => setActiveTab('home'))}
            onEditReq={() => setShowEditProfile(true)}
            onSettingsReq={() => setShowSettings(true)}
            onChatReq={() => { if(!session) setShowLogin(true); else setActiveChatPartner(viewedProfile); }}
            onClubClick={loadClub}
            onAdminReq={()=>setActiveTab('admin')}
          />
      )}
      
      {activeTab === 'club' && viewedClub && <ClubScreen club={viewedClub} onBack={() => setActiveTab('home')} onUserClick={loadProfile} />}
      {activeTab === 'admin' && <AdminDashboard session={session} />}
      
      <div className="fixed bottom-0 w-full bg-zinc-950/90 border-t border-zinc-800 px-6 py-3 flex justify-between items-center z-40 pb-6 sm:pb-3"><button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}><Home size={24} /><span className="text-[10px] font-medium">Home</span></button><button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'search' ? 'text-white' : 'text-zinc-600'}`}><Search size={24} /><span className="text-[10px] font-medium">Suche</span></button><div className="relative -top-5"><button onClick={() => session ? setShowUpload(true) : setShowLogin(true)} className="bg-gradient-to-tr from-indigo-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"><Plus size={24} text-white strokeWidth={3} /></button></div><button onClick={() => setActiveTab('inbox')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'inbox' ? 'text-white' : 'text-zinc-600'}`}><Mail size={24} /><span className="text-[10px] font-medium">Inbox</span></button><button onClick={handleProfileTabClick} className={`flex flex-col items-center gap-1 transition ${activeTab === 'profile' ? 'text-white' : 'text-zinc-600'}`}><User size={24} /><span className="text-[10px] font-medium">Profil</span></button></div>
      
      {/* GLOBAL COMPONENTS: Cookie Banner, Modals */}
      <CookieBanner />
      
      {activeVideo && <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4"><button onClick={() => setActiveVideo(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-full"><X size={24}/></button><video src={activeVideo.video_url} controls autoPlay className="max-w-full max-h-full" /></div>}
      {showEditProfile && currentUserProfile && <EditProfileModal player={currentUserProfile} onClose={() => setShowEditProfile(false)} onUpdate={(updated) => { setCurrentUserProfile(updated); setViewedProfile(updated); }} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onLogout={() => { supabase.auth.signOut(); setShowSettings(false); setActiveTab('home'); }} installPrompt={deferredPrompt} onInstallApp={handleInstallApp} />}
      
      {activeCommentsVideo && <CommentsModal video={activeCommentsVideo} onClose={() => setActiveCommentsVideo(null)} session={session} onLoginReq={() => setShowLogin(true)} />}
      {activeChatPartner && <ChatWindow partner={activeChatPartner} session={session} onClose={() => setActiveChatPartner(null)} />}
      {showOnboarding && session && <OnboardingWizard session={session} onComplete={() => { setShowOnboarding(false); fetchMyProfile(session.user.id); }} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      {showUpload && <UploadModal player={currentUserProfile} onClose={() => setShowUpload(false)} onUploadComplete={() => { if(currentUserProfile) loadProfile(currentUserProfile); }} />}
      {reportTarget && session && <ReportModal targetId={reportTarget.id} targetType={reportTarget.type} onClose={() => setReportTarget(null)} session={session} />}
    </div>
  );
};

export default App;