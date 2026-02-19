import React, { useState, useEffect } from 'react';
import { X, User, Save, Camera, Search, Plus, Loader2, Shield, Activity, Share2, Calendar, Globe, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { getClubBorderColor } from '../lib/helpers';
import { useToast } from '../contexts/ToastContext';

export const EditProfileModal = ({ player, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const { addToast } = useToast();

    const initialFirstName = player.first_name || (player.full_name ? player.full_name.split(' ')[0] : '');
    const initialLastName = player.last_name || (player.full_name ? player.full_name.split(' ').slice(1).join(' ') : '');

    const [formData, setFormData] = useState({
        first_name: initialFirstName,
        last_name: initialLastName,
        position_primary: player.position_primary || 'ZOM',
        position_secondary: player.position_secondary || '',
        height_user: player.height_user || '',
        weight: player.weight || '',
        strong_foot: player.strong_foot || 'Rechts',
        transfer_status: player.transfer_status || 'Gebunden',
        contract_end: player.contract_end || '',
        bio: player.bio || '',
        zip_code: player.zip_code || '',
        city: player.city || '',
        instagram_handle: player.instagram_handle || '',
        tiktok_handle: player.tiktok_handle || '',
        youtube_handle: player.youtube_handle || '',
        transfermarkt_url: player.transfermarkt_url || '',
        fupa_url: player.fupa_url || '',
        birth_date: player.birth_date || '',
        jersey_number: player.jersey_number || '',
        nationality: player.nationality || ''
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(player.avatar_url);
    const [clubSearch, setClubSearch] = useState('');
    const [clubResults, setClubResults] = useState([]);
    const [selectedClub, setSelectedClub] = useState(player.clubs || null);

    useEffect(() => {
        if (clubSearch.length < 2) { setClubResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase.from('clubs').select('*').ilike('name', `%${clubSearch}%`).limit(5);
                setClubResults(data || []);
            } catch (e) { /* silent */ }
        }, 300);
        return () => clearTimeout(t);
    }, [clubSearch]);

    const handleCreateClub = async () => {
        if (!clubSearch.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('clubs').insert({ name: clubSearch, league: 'Kreisliga', is_verified: false }).select().single();
            if (error) throw error;
            setSelectedClub(data);
            setClubSearch('');
            setClubResults([]);
            addToast(`"${data.name}" als Verein angelegt.`, 'success');
        } catch (e) {
            addToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let av = player.avatar_url;
            if (avatarFile) {
                const p = `${player.user_id}/${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage.from('avatars').upload(p, avatarFile);
                if (uploadErr) throw uploadErr;
                const { data } = supabase.storage.from('avatars').getPublicUrl(p);
                av = data.publicUrl;
            }

            const full_name = `${formData.first_name} ${formData.last_name}`.trim();
            const updates = {
                ...formData,
                full_name,
                height_user: formData.height_user ? parseInt(formData.height_user) : null,
                weight: formData.weight ? parseInt(formData.weight) : null,
                jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
                avatar_url: av,
                club_id: selectedClub?.id || null
            };

            const { data, error } = await supabase.from('players_master').update(updates).eq('id', player.id).select('*, clubs(*)').single();
            if (error) throw error;
            onUpdate(data);
            addToast("Profil erfolgreich gespeichert! ✅", 'success');
            onClose();
        } catch (e) {
            addToast("Fehler beim Speichern: " + e.message, 'error');
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
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
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
                    <TabButton id="social" label="Socials & Links" icon={Share2} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50">
                    <form id="edit-form" onSubmit={handleSave} className="space-y-6">
                        {/* TAB 1: ALLGEMEIN */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
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
                                            if (f) { setAvatarFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Persönliche Daten</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Vorname</label>
                                            <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputStyle} placeholder="Max" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nachname</label>
                                            <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputStyle} placeholder="Mustermann" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Geburtsdatum</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                                <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className={`${inputStyle} pl-10`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nationalität</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                                <input placeholder="z.B. Deutschland" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={`${inputStyle} pl-10`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">PLZ</label>
                                            <input placeholder="12345" value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} className={inputStyle} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Ort</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                                                <input placeholder="Berlin" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className={`${inputStyle} pl-10`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Über mich / Motto</label>
                                        <textarea rows={3} placeholder="Erzähl etwas über deinen Spielstil..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className={`${inputStyle} resize-none`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SPORTLICH */}
                        {activeTab === 'sport' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div>
                                    <label className="text-xs text-zinc-500 font-bold uppercase ml-1 mb-1 block">Aktueller Verein</label>
                                    {selectedClub ? (
                                        <div className="bg-zinc-800 p-3 rounded-xl flex justify-between items-center border border-blue-500/30 shadow-lg shadow-blue-900/10" style={{ borderColor: getClubBorderColor(selectedClub) }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                                    {selectedClub.logo_url ? <img src={selectedClub.logo_url} className="w-full h-full rounded-full object-cover" /> : <Shield size={14} />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-white block text-sm">{selectedClub.name}</span>
                                                    <span className="text-xs text-zinc-500">{selectedClub.league}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setSelectedClub(null)} className="p-2 hover:bg-white/10 rounded-full transition"><X size={16} className="text-zinc-400" /></button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-4 top-4 text-zinc-500" size={18} />
                                            <input placeholder="Verein suchen..." value={clubSearch} onChange={e => setClubSearch(e.target.value)} className={`${inputStyle} pl-12`} />
                                            {clubResults.length > 0 && (
                                                <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                                                    {clubResults.map(c => (
                                                        <div key={c.id} onClick={() => { setSelectedClub(c); setClubSearch(''); }} className="p-3 hover:bg-zinc-800 cursor-pointer text-white border-b border-white/5 flex items-center gap-3">
                                                            {c.logo_url && <img src={c.logo_url} className="w-6 h-6 rounded-full" />}
                                                            <span className="text-sm">{c.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {clubSearch.length > 2 && clubResults.length === 0 && (
                                                <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-700 rounded-xl mt-2 overflow-hidden shadow-xl p-2">
                                                    <div onClick={handleCreateClub} className="p-3 bg-blue-600/10 text-blue-400 cursor-pointer font-bold text-xs hover:bg-blue-600/20 flex items-center gap-2 rounded-lg">
                                                        <Plus size={14} /> "{clubSearch}" als neuen Verein anlegen
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Hauptposition</label>
                                        <select value={formData.position_primary} onChange={e => setFormData({ ...formData, position_primary: e.target.value })} className={inputStyle}>
                                            {['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nebenposition</label>
                                        <select value={formData.position_secondary} onChange={e => setFormData({ ...formData, position_secondary: e.target.value })} className={inputStyle}>
                                            <option value="">Keine</option>
                                            {['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Transfer-Status</label>
                                        <select value={formData.transfer_status} onChange={e => setFormData({ ...formData, transfer_status: e.target.value })} className={inputStyle}>
                                            <option>Gebunden</option>
                                            <option>Suche Verein</option>
                                            <option>Vertrag läuft aus</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Vertrag bis</label>
                                        <input type="date" value={formData.contract_end} onChange={e => setFormData({ ...formData, contract_end: e.target.value })} className={inputStyle} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Nr.</label>
                                        <input type="number" min="0" placeholder="#" value={formData.jersey_number} onChange={e => setFormData({ ...formData, jersey_number: e.target.value })} className={`${inputStyle} text-center`} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Größe</label>
                                        <input type="number" min="0" placeholder="cm" value={formData.height_user} onChange={e => setFormData({ ...formData, height_user: e.target.value })} className={inputStyle} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Gewicht</label>
                                        <input type="number" min="0" placeholder="kg" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className={inputStyle} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase ml-1 mb-1 block">Fuß</label>
                                        <select value={formData.strong_foot} onChange={e => setFormData({ ...formData, strong_foot: e.target.value })} className={`${inputStyle} px-1 text-xs`}>
                                            <option>Rechts</option>
                                            <option>Links</option>
                                            <option>Beidfüßig</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: SOCIALS & LINKS */}
                        {activeTab === 'social' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="bg-zinc-800/30 p-4 rounded-xl border border-white/5 text-center mb-2">
                                    <p className="text-sm text-zinc-400">Verbinde deine Accounts, damit Scouts mehr von dir sehen können.</p>
                                </div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Social Media</h3>
                                <div className="space-y-3">
                                    <input placeholder="Instagram Username" value={formData.instagram_handle} onChange={e => setFormData({ ...formData, instagram_handle: e.target.value })} className={inputStyle} />
                                    <input placeholder="TikTok Username" value={formData.tiktok_handle} onChange={e => setFormData({ ...formData, tiktok_handle: e.target.value })} className={inputStyle} />
                                    <input placeholder="YouTube Channel" value={formData.youtube_handle} onChange={e => setFormData({ ...formData, youtube_handle: e.target.value })} className={inputStyle} />
                                </div>
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pt-4">Externe Profile</h3>
                                <div className="space-y-3">
                                    <input placeholder="Transfermarkt Link" value={formData.transfermarkt_url} onChange={e => setFormData({ ...formData, transfermarkt_url: e.target.value })} className={inputStyle} />
                                    <input placeholder="FuPa Link" value={formData.fupa_url} onChange={e => setFormData({ ...formData, fupa_url: e.target.value })} className={inputStyle} />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-900">
                    <button form="edit-form" disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Speichern</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
