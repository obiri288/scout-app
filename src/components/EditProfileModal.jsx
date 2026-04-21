import React, { useState, useEffect } from 'react';
import { X, User, Save, Camera, Search, Plus, Loader2, Shield, Activity, Share2, Calendar, Globe, MapPin, History, Trash2, Edit, ExternalLink, Check, Clock, Award, Briefcase, Target, Radar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { getClubBorderColor } from '../lib/helpers';
import { useToast } from '../contexts/ToastContext';
import { ImageCropModal } from './ImageCropModal';
import { geocodeCity } from '../lib/api';
import { SIGNATURE_BADGES, BADGE_CATEGORIES, MAX_BADGES, getBadgeColors } from '../lib/badges';
import { calculateAgeInfo, AGE_ERROR_MESSAGE, MIN_AGE } from '../lib/ageValidation';
export const EditProfileModal = ({ profile, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const { addToast } = useToast();
    const [errors, setErrors] = useState({});

    const initialFirstName = profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : '');
    const initialLastName = profile.last_name || (profile.full_name ? profile.full_name.split(' ').slice(1).join(' ') : '');

    const isCoach = profile.role === 'coach';
    const isScout = profile.role === 'scout';

    const [formData, setFormData] = useState({
        username: profile.username || '',
        first_name: initialFirstName,
        last_name: initialLastName,
        position_primary: profile.position_primary || 'ZOM',
        position_secondary: profile.position_secondary || '',
        height_user: profile.height_user || '',
        weight: profile.weight || '',
        strong_foot: profile.strong_foot || 'Rechts',
        transfer_status: profile.transfer_status || 'Gebunden',
        contract_end: profile.contract_end || '',
        bio: profile.bio || '',
        zip_code: profile.zip_code || '',
        city: profile.city || '',
        instagram_handle: profile.instagram_handle || '',
        tiktok_handle: profile.tiktok_handle || '',
        youtube_handle: profile.youtube_handle || '',
        transfermarkt_url: profile.transfermarkt_url || '',
        fupa_url: profile.fupa_url || '',
        birth_date: profile.birth_date || '',
        jersey_number: profile.jersey_number || '',
        nationality: profile.nationality || '',
        player_archetype: profile.player_archetype || '',
        signature_badges: profile.signature_badges || [],
        // Coach-specific fields
        preferred_formation: profile.preferred_system || '',
        coaching_license: (profile.licenses && profile.licenses[0]) || '',
        experience_years: profile.experience_years || '',
        leadership_styles: profile.specializations || [],
        tactical_identity: profile.tactical_identity || [],
        // Scout-specific fields
        scout_title: profile.club_affiliation || '',
        focus_age_groups: profile.tactical_identity || [],
        scout_expertise: profile.specializations || [],
        scout_radius: profile.preferred_system || ''
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(profile.avatar_url);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [clubSearch, setClubSearch] = useState('');
    const [clubResults, setClubResults] = useState([]);
    const [selectedClub, setSelectedClub] = useState(profile.clubs || null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState(null);

    // Career History State
    const [careerEntries, setCareerEntries] = useState([]);
    const [careerLoading, setCareerLoading] = useState(false);
    const [showCareerForm, setShowCareerForm] = useState(false);
    const [editingCareer, setEditingCareer] = useState(null);
    const [careerForm, setCareerForm] = useState({
        club_name: '', league: '', start_date: '', end_date: '', proof_url: '', is_current: false
    });
    const [careerClubSearch, setCareerClubSearch] = useState('');
    const [careerClubResults, setCareerClubResults] = useState([]);
    const [showCareerClubDropdown, setShowCareerClubDropdown] = useState(false);

    // Fetch career entries
    useEffect(() => {
        if (!profile.user_id) return;
        const loadCareer = async () => {
            setCareerLoading(true);
            try {
                const { data, error } = await supabase
                    .from('career_history')
                    .select('*')
                    .eq('user_id', profile.user_id)
                    .order('start_date', { ascending: false });
                if (error) throw error;
                setCareerEntries(data || []);
            } catch (e) {
                console.warn('Career fetch failed:', e);
            } finally {
                setCareerLoading(false);
            }
        };
        loadCareer();
    }, [profile.user_id]);

    const resetCareerForm = () => {
        setCareerForm({ club_name: '', league: '', start_date: '', end_date: '', proof_url: '', is_current: false });
        setCareerClubSearch('');
        setCareerClubResults([]);
        setShowCareerClubDropdown(false);
        setEditingCareer(null);
        setShowCareerForm(false);
    };

    // Career club autocomplete search
    useEffect(() => {
        if (careerClubSearch.length < 2) { setCareerClubResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase.from('clubs').select('id, name, logo_url, league, leagues(name)').ilike('name', `%${careerClubSearch}%`).limit(8);
                setCareerClubResults(data || []);
                setShowCareerClubDropdown(true);
            } catch (e) { /* silent */ }
        }, 300);
        return () => clearTimeout(t);
    }, [careerClubSearch]);

    const handleCareerSave = async () => {
        if (!careerForm.club_name.trim() || !careerForm.start_date) {
            addToast('Vereinsname und Startdatum sind Pflichtfelder.', 'error');
            return;
        }
        setCareerLoading(true);
        try {
            const payload = {
                user_id: profile.user_id,
                club_name: careerForm.club_name.trim(),
                league: careerForm.league.trim() || null,
                start_date: careerForm.start_date + '-01',
                end_date: careerForm.is_current ? null : (careerForm.end_date ? careerForm.end_date + '-01' : null),
                proof_url: careerForm.proof_url.trim() || null
            };

            if (editingCareer) {
                const { data, error } = await supabase
                    .from('career_history')
                    .update(payload)
                    .eq('id', editingCareer.id)
                    .select()
                    .single();
                if (error) throw error;
                setCareerEntries(prev => prev.map(e => e.id === data.id ? data : e));
                addToast('Station aktualisiert ✅', 'success');
            } else {
                const { data, error } = await supabase
                    .from('career_history')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                setCareerEntries(prev => [data, ...prev]);
                addToast('Station hinzugefügt ✅', 'success');
            }
            resetCareerForm();
        } catch (e) {
            addToast('Fehler: ' + e.message, 'error');
        } finally {
            setCareerLoading(false);
        }
    };

    const handleCareerDelete = async (id) => {
        setCareerLoading(true);
        try {
            const { error } = await supabase.from('career_history').delete().eq('id', id);
            if (error) throw error;
            setCareerEntries(prev => prev.filter(e => e.id !== id));
            addToast('Station gelöscht.', 'success');
        } catch (e) {
            addToast('Fehler: ' + e.message, 'error');
        } finally {
            setCareerLoading(false);
        }
    };

    const startEditCareer = (entry) => {
        setCareerForm({
            club_name: entry.club_name || '',
            league: entry.league || '',
            start_date: entry.start_date ? entry.start_date.slice(0, 7) : '',
            end_date: entry.end_date ? entry.end_date.slice(0, 7) : '',
            proof_url: entry.proof_url || '',
            is_current: !entry.end_date
        });
        setCareerClubSearch(entry.club_name || '');
        setEditingCareer(entry);
        setShowCareerForm(true);
    };

    useEffect(() => {
        if (clubSearch.length < 2) { setClubResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase.from('clubs').select('*, leagues(name, tier), countries(iso_code, flag_url)').ilike('name', `%${clubSearch}%`).limit(5);
                setClubResults(data || []);
            } catch (e) { /* silent */ }
        }, 300);
        return () => clearTimeout(t);
    }, [clubSearch]);

    const handleCreateClub = async () => {
        if (!clubSearch.trim()) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('clubs').insert({ name: clubSearch, league_id: null, is_verified: false }).select().single();
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
        
        const ageInfo = calculateAgeInfo(formData.birth_date);
        if (ageInfo.isUnder16) {
            addToast(`Du musst mindestens ${MIN_AGE} Jahre alt sein.`, 'error');
            return;
        }

        // Validate sports data
        const newErrors = {};
        if (!isCoach && !isScout) {
            if (formData.jersey_number) {
                const num = parseInt(formData.jersey_number, 10);
                if (isNaN(num) || num < 1 || num > 99) {
                    newErrors.jersey_number = "1 - 99";
                }
            }
            if (formData.height_user) {
                const height = parseInt(formData.height_user, 10);
                if (isNaN(height) || height < 120 || height > 250) {
                    newErrors.height_user = "120 - 250";
                }
            }
            if (formData.weight) {
                const weight = parseInt(formData.weight, 10);
                if (isNaN(weight) || weight < 40 || weight > 150) {
                    newErrors.weight = "40 - 150";
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setActiveTab('sport');
            addToast("Bitte korrigiere die markierten Felder.", 'error');
            return;
        }
        setErrors({});

        setLoading(true);
        try {
            let av = profile.avatar_url;
            if (avatarFile) {
                const p = `${player.user_id}/${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage.from('avatars').upload(p, avatarFile);
                if (uploadErr) throw uploadErr;
                const { data } = supabase.storage.from('avatars').getPublicUrl(p);
                av = data.publicUrl;
            }

            // Geocode city if changed
            let latitude = profile.latitude || null;
            let longitude = profile.longitude || null;
            if (formData.city && formData.city !== profile.city) {
                const coords = await geocodeCity(formData.city);
                if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                }
            }

            const full_name = `${formData.first_name} ${formData.last_name}`.trim();
            
            // Build base updates (shared fields)
            const updates = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                full_name,
                username: formData.username?.toLowerCase().replace(/[@\s]/g, '') || null,
                bio: formData.bio,
                zip_code: formData.zip_code,
                city: formData.city,
                birth_date: formData.birth_date || null,
                nationality: formData.nationality,
                instagram_handle: formData.instagram_handle,
                tiktok_handle: formData.tiktok_handle,
                youtube_handle: formData.youtube_handle,
                transfermarkt_url: formData.transfermarkt_url,
                fupa_url: formData.fupa_url,
                avatar_url: av,
                club_id: selectedClub?.id || null,
                latitude,
                longitude,
                signature_badges: formData.signature_badges || []
            };

            if (isScout) {
                // Scout-specific field mapping
                updates.club_affiliation = formData.scout_title || null;
                updates.tactical_identity = formData.focus_age_groups || [];
                updates.specializations = formData.scout_expertise || [];
                updates.preferred_system = formData.scout_radius || null;
            } else if (isCoach) {
                // Coach-specific field mapping
                updates.preferred_system = formData.preferred_formation || null;
                updates.licenses = formData.coaching_license ? [formData.coaching_license] : [];
                updates.experience_years = formData.experience_years ? parseInt(formData.experience_years) : null;
                updates.specializations = formData.leadership_styles || [];
                updates.tactical_identity = formData.tactical_identity || [];
            } else {
                // Player-specific field mapping
                updates.position_primary = formData.position_primary;
                updates.position_secondary = formData.position_secondary;
                updates.height_user = formData.height_user && !isNaN(parseInt(formData.height_user, 10)) ? parseInt(formData.height_user, 10) : null;
                updates.weight = formData.weight && !isNaN(parseInt(formData.weight, 10)) ? parseInt(formData.weight, 10) : null;
                updates.jersey_number = formData.jersey_number && !isNaN(parseInt(formData.jersey_number, 10)) ? parseInt(formData.jersey_number, 10) : null;
                updates.strong_foot = formData.strong_foot;
                updates.transfer_status = formData.transfer_status;
                updates.contract_end = formData.contract_end || null;
                updates.player_archetype = formData.player_archetype;
            }

            const { data, error } = await supabase.from('players_master').update(updates).eq('id', profile.id).select('*, clubs(*, leagues(name))').single();
            if (error) throw error;
            onUpdate(data);
            addToast("Profil erfolgreich gespeichert! ✅", 'success');

            const oldClub = profile.clubs;
            const newClub = selectedClub;
            const hasClubChanged = newClub && (!oldClub || oldClub.id !== newClub.id);

            if (hasClubChanged) {
                setTransferData({
                    old_club_id: oldClub?.id || null,
                    old_club_name: oldClub?.name || 'Vereinslos',
                    new_club_id: newClub.id,
                    new_club_name: newClub.name
                });
                setShowTransferModal(true);
            } else {
                onClose();
            }
        } catch (e) {
            addToast("Fehler beim Speichern: " + e.message, 'error');
            setLoading(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${activeTab === id ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm' : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-slate-200'}`}
        >
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[90vh] flex flex-col border-t border-border rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-border bg-white dark:bg-zinc-900">
                    <h2 className="text-lg font-bold text-foreground">Profil bearbeiten</h2>
                    <button onClick={onClose}><X className="text-muted-foreground hover:text-foreground" /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 py-3 px-4 border-b border-border bg-white dark:bg-zinc-900 overflow-x-auto scrollbar-hide">
                    <TabButton id="general" label="Allgemein" icon={User} />
                    <TabButton id="sport" label={isScout ? 'Scouting' : 'Sportlich'} icon={isScout ? Briefcase : Activity} />
                    <TabButton id="badges" label="Badges" icon={Award} />
                    <TabButton id="historie" label="Historie" icon={History} />
                    <TabButton id="social" label="Socials" icon={Share2} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-900/50">
                    <form id="edit-form" onSubmit={handleSave} className="space-y-6">
                        {/* TAB 1: ALLGEMEIN */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="flex justify-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 overflow-hidden shadow-xl">
                                            {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-muted-foreground m-8" />}
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                                            <Camera size={28} className="text-white" />
                                        </div>
                                        <input type="file" accept="image/*" onChange={e => {
                                            const f = e.target.files[0];
                                            if (f) { setCropImageSrc(URL.createObjectURL(f)); }
                                            e.target.value = '';
                                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Persönliche Daten</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Vorname</label>
                                            <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputStyle} placeholder="Max" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nachname</label>
                                            <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputStyle} placeholder="Mustermann" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Dein @Handle (Username)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                                            <input 
                                                value={formData.username || ''} 
                                                onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })} 
                                                className={`${inputStyle} pl-7`} 
                                                placeholder="deinname" 
                                            />
                                        </div>
                                        <p className="text-[9px] text-muted-foreground mt-1 ml-1 italic">Wird für Markierungen (@mentions) verwendet.</p>
                                    </div>

                                    <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Geburtsdatum</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input 
                                                    type="date" 
                                                    value={formData.birth_date} 
                                                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })} 
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className={`${inputStyle} pl-10 ${calculateAgeInfo(formData.birth_date).isUnder16 ? '!border-rose-500/50 focus:!border-rose-500' : ''}`} 
                                                />
                                            </div>
                                            {calculateAgeInfo(formData.birth_date).isUnder16 && (
                                                <p className="text-rose-500 text-[10px] mt-1.5 ml-1 font-medium leading-tight">
                                                    {AGE_ERROR_MESSAGE}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nationalität</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input placeholder="z.B. Deutschland" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={`${inputStyle} pl-10`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-1">
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">PLZ</label>
                                            <input placeholder="12345" value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} className={inputStyle} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Ort</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input placeholder="Berlin" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className={`${inputStyle} pl-10`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Über mich / Motto</label>
                                        <textarea rows={3} placeholder="Erzähl etwas über deinen Spielstil..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className={`${inputStyle} resize-none`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SPORTLICH */}
                        {activeTab === 'sport' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Club – shared for all roles */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-bold uppercase ml-1 mb-1 block">{isScout ? 'Organisation / Agentur' : isCoach ? 'Aktueller Verein / Organisation' : 'Aktueller Verein'}</label>
                                    {selectedClub ? (
                                        <div
                                            className="bg-slate-100 dark:bg-zinc-800 p-3 rounded-xl flex justify-between items-center border border-blue-500/30 shadow-lg shadow-blue-900/10 transition-colors"
                                            style={{ borderColor: getClubBorderColor(selectedClub) }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center">
                                                    {selectedClub.logo_url ? <img src={selectedClub.logo_url} className="w-full h-full rounded-full object-cover" /> : <Shield size={14} />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-foreground block text-sm">{selectedClub.name}</span>
                                                    <span className="text-xs text-muted-foreground">{selectedClub.leagues?.name || 'Amateurliga'}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setSelectedClub(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"><X size={16} className="text-muted-foreground" /></button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-4 top-4 text-muted-foreground" size={18} />
                                            <input placeholder="Verein suchen..." value={clubSearch} onChange={e => setClubSearch(e.target.value)} className={`${inputStyle} pl-12`} />
                                            {clubResults.length > 0 && (
                                                <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-2 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                                                    {clubResults.map(c => (
                                                        <div key={c.id} onClick={() => { setSelectedClub(c); setClubSearch(''); }} className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-foreground border-b border-border flex items-center gap-3">
                                                            {c.logo_url && <img src={c.logo_url} className="w-8 h-8 rounded-full border border-white/10" />}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold">{c.name}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                                    {c.countries?.iso_code ? `${c.countries.iso_code} • ` : ''}
                                                                    {c.leagues?.name || 'Amateurliga'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {clubSearch.length > 2 && clubResults.length === 0 && (
                                                <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-2 overflow-hidden shadow-xl p-2">
                                                    <div onClick={handleCreateClub} className="p-3 bg-blue-600/10 text-blue-400 cursor-pointer font-bold text-xs hover:bg-blue-600/20 flex items-center gap-2 rounded-lg">
                                                        <Plus size={14} /> "{clubSearch}" als neuen Verein anlegen
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ===== ROLE-SPECIFIC FIELDS ===== */}
                                {isScout ? (
                                    /* ===== SCOUT-SPECIFIC FIELDS ===== */
                                    <>
                                        {/* Berufsbezeichnung */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Briefcase size={14} /> Berufsbezeichnung</h3>
                                            <select value={formData.scout_title} onChange={e => setFormData({ ...formData, scout_title: e.target.value })} className={inputStyle}>
                                                <option value="">Bitte auswählen</option>
                                                {['Vereins-Scout', 'Freier Scout', 'Spielervermittler/Agent', 'Kaderplaner/Sportdirektor'].map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>

                                        {/* Fokus-Altersklassen */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target size={14} /> Fokus-Altersklassen</h3>
                                            <p className="text-[10px] text-muted-foreground mb-2 ml-1">Wähle die Altersklassen, auf die du dich fokussierst.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['U15 - U17', 'U19', 'U23 / Übergang', 'Herrenbereich'].map(age => {
                                                    const isSelected = formData.focus_age_groups.includes(age);
                                                    return (
                                                        <button
                                                            key={age}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    focus_age_groups: isSelected
                                                                        ? prev.focus_age_groups.filter(a => a !== age)
                                                                        : [...prev.focus_age_groups, age]
                                                                }));
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                isSelected
                                                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-900/10'
                                                                    : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/20 text-foreground/80'
                                                            }`}
                                                        >
                                                            {isSelected && <span className="mr-1">✓</span>}{age}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Expertise & Services */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">⚡ Expertise & Services</h3>
                                            <p className="text-[10px] text-muted-foreground mb-2 ml-1">Wähle max. 3 Schwerpunkte deiner Arbeit.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['Live-Scouting', 'Daten- & Videoanalyse', 'Karriereplanung', 'Vertragsverhandlung'].map(skill => {
                                                    const isSelected = formData.scout_expertise.includes(skill);
                                                    const isMaxed = formData.scout_expertise.length >= 3 && !isSelected;
                                                    return (
                                                        <button
                                                            key={skill}
                                                            type="button"
                                                            disabled={isMaxed}
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    scout_expertise: isSelected
                                                                        ? prev.scout_expertise.filter(s => s !== skill)
                                                                        : [...prev.scout_expertise, skill]
                                                                }));
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                isSelected
                                                                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-400 shadow-lg shadow-violet-900/10'
                                                                    : isMaxed
                                                                        ? 'border-border bg-muted/30 opacity-30 cursor-not-allowed text-muted-foreground'
                                                                        : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/20 text-foreground/80'
                                                            }`}
                                                        >
                                                            {isSelected && <span className="mr-1">✓</span>}{skill}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-2 flex items-center gap-1.5">
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < formData.scout_expertise.length ? 'bg-violet-400' : 'bg-white/20'}`} />
                                                ))}
                                                <span className="text-[10px] text-muted-foreground ml-1">{formData.scout_expertise.length}/3</span>
                                            </div>
                                        </div>

                                        {/* Suchradius */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Radar size={14} /> Suchradius</h3>
                                            <select value={formData.scout_radius} onChange={e => setFormData({ ...formData, scout_radius: e.target.value })} className={inputStyle}>
                                                <option value="">Bitte auswählen</option>
                                                {['Regional', 'National', 'International'].map(r => <option key={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : isCoach ? (
                                    /* ===== COACH-SPECIFIC FIELDS ===== */
                                    <>
                                        {/* Basis-Trainerdaten */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">🎯 Trainerdaten</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Bevorzugte Formation</label>
                                                    <select value={formData.preferred_formation} onChange={e => setFormData({ ...formData, preferred_formation: e.target.value })} className={inputStyle}>
                                                        <option value="">Keine auswählen</option>
                                                        {['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '4-1-4-1', '4-3-1-2', '5-3-2', '3-4-2-1', '4-2-2-2'].map(f => <option key={f}>{f}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Höchste Lizenz</label>
                                                        <select value={formData.coaching_license} onChange={e => setFormData({ ...formData, coaching_license: e.target.value })} className={inputStyle}>
                                                            <option value="">Keine</option>
                                                            {['UEFA Pro', 'UEFA A', 'UEFA B', 'UEFA C', 'Torwart-Lizenz', 'Ohne Lizenz'].map(l => <option key={l}>{l}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Erfahrung (Jahre)</label>
                                                        <input type="number" min="0" max="50" placeholder="z.B. 5" value={formData.experience_years} onChange={e => setFormData({ ...formData, experience_years: e.target.value })} className={inputStyle} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Führungsstil & Charakter */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">⚡ Führungsstil</h3>
                                            <p className="text-[10px] text-muted-foreground mb-2 ml-1">Wähle max. 2 Eigenschaften, die dich als Trainer auszeichnen.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['Motivator', 'Taktiker', 'Detail-verliebt', 'Mentor', 'Schleifer'].map(style => {
                                                    const isSelected = formData.leadership_styles.includes(style);
                                                    const isMaxed = formData.leadership_styles.length >= 2 && !isSelected;
                                                    return (
                                                        <button
                                                            key={style}
                                                            type="button"
                                                            disabled={isMaxed}
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    leadership_styles: isSelected
                                                                        ? prev.leadership_styles.filter(s => s !== style)
                                                                        : [...prev.leadership_styles, style]
                                                                }));
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                isSelected
                                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-900/10'
                                                                    : isMaxed
                                                                        ? 'border-border bg-muted/30 opacity-30 cursor-not-allowed text-muted-foreground'
                                                                        : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/20 text-foreground/80'
                                                            }`}
                                                        >
                                                            {isSelected && <span className="mr-1">✓</span>}{style}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-2 flex items-center gap-1.5">
                                                {[0, 1].map(i => (
                                                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < formData.leadership_styles.length ? 'bg-amber-400' : 'bg-white/20'}`} />
                                                ))}
                                                <span className="text-[10px] text-muted-foreground ml-1">{formData.leadership_styles.length}/2</span>
                                            </div>
                                        </div>

                                        {/* Taktische Identität */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">🧠 Taktische Identität</h3>
                                            <p className="text-[10px] text-muted-foreground mb-2 ml-1">Wähle max. 2 taktische Schwerpunkte.</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['Gegenpressing', 'Ballbesitz-Dominanz', 'Umschaltspiel', 'Defensive Kompaktheit'].map(tactic => {
                                                    const isSelected = formData.tactical_identity.includes(tactic);
                                                    const isMaxed = formData.tactical_identity.length >= 2 && !isSelected;
                                                    return (
                                                        <button
                                                            key={tactic}
                                                            type="button"
                                                            disabled={isMaxed}
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    tactical_identity: isSelected
                                                                        ? prev.tactical_identity.filter(t => t !== tactic)
                                                                        : [...prev.tactical_identity, tactic]
                                                                }));
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                isSelected
                                                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-900/10'
                                                                    : isMaxed
                                                                        ? 'border-border bg-muted/30 opacity-30 cursor-not-allowed text-muted-foreground'
                                                                        : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/20 text-foreground/80'
                                                            }`}
                                                        >
                                                            {isSelected && <span className="mr-1">✓</span>}{tactic}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-2 flex items-center gap-1.5">
                                                {[0, 1].map(i => (
                                                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < formData.tactical_identity.length ? 'bg-cyan-400' : 'bg-white/20'}`} />
                                                ))}
                                                <span className="text-[10px] text-muted-foreground ml-1">{formData.tactical_identity.length}/2</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* ===== PLAYER-SPECIFIC FIELDS ===== */
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Hauptposition</label>
                                                <select value={formData.position_primary} onChange={e => setFormData({ ...formData, position_primary: e.target.value })} className={inputStyle}>
                                                    {['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p => <option key={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nebenposition</label>
                                                <select value={formData.position_secondary} onChange={e => setFormData({ ...formData, position_secondary: e.target.value })} className={inputStyle}>
                                                    <option value="">Keine</option>
                                                    {['TW', 'IV', 'RV', 'LV', 'ZDM', 'ZM', 'ZOM', 'RA', 'LA', 'ST'].map(p => <option key={p}>{p}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Transfer-Status</label>
                                                <select value={formData.transfer_status} onChange={e => setFormData({ ...formData, transfer_status: e.target.value })} className={inputStyle}>
                                                    <option>Gebunden</option>
                                                    <option>Suche Verein</option>
                                                    <option>Vertrag läuft aus</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Vertrag bis</label>
                                                <input type="date" value={formData.contract_end} onChange={e => setFormData({ ...formData, contract_end: e.target.value })} className={inputStyle} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="col-span-1">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nr.</label>
                                                <input type="number" min="1" max="99" placeholder="#" value={formData.jersey_number} onChange={e => { setFormData({ ...formData, jersey_number: e.target.value }); setErrors({...errors, jersey_number: null}); }} className={`${inputStyle} text-center ${errors.jersey_number ? '!border-rose-500 bg-rose-500/10 text-rose-500' : ''}`} />
                                                {errors.jersey_number && <p className="text-rose-500 text-[9px] mt-1 text-center font-bold">{errors.jersey_number}</p>}
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Größe</label>
                                                <input type="number" min="120" max="250" placeholder="cm" value={formData.height_user} onChange={e => { setFormData({ ...formData, height_user: e.target.value }); setErrors({...errors, height_user: null}); }} className={`${inputStyle} ${errors.height_user ? '!border-rose-500 bg-rose-500/10 text-rose-500' : ''}`} />
                                                {errors.height_user && <p className="text-rose-500 text-[9px] mt-1 text-center font-bold">{errors.height_user}</p>}
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Gewicht</label>
                                                <input type="number" min="40" max="150" placeholder="kg" value={formData.weight} onChange={e => { setFormData({ ...formData, weight: e.target.value }); setErrors({...errors, weight: null}); }} className={`${inputStyle} ${errors.weight ? '!border-rose-500 bg-rose-500/10 text-rose-500' : ''}`} />
                                                {errors.weight && <p className="text-rose-500 text-[9px] mt-1 text-center font-bold">{errors.weight}</p>}
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Fuß</label>
                                                <select value={formData.strong_foot} onChange={e => setFormData({ ...formData, strong_foot: e.target.value })} className={`${inputStyle} px-1 text-xs`}>
                                                    <option>Rechts</option>
                                                    <option>Links</option>
                                                    <option>Beidfüßig</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Spielertyp Section */}
                                        <div className="pt-2 border-t border-border">
                                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">⚡ Spielertyp</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Dein Profil</label>
                                                    <select value={formData.player_archetype} onChange={e => setFormData({ ...formData, player_archetype: e.target.value })} className={inputStyle}>
                                                        <option value="">Keinen auswählen</option>
                                                        <option>Spielmacher</option>
                                                        <option>Flügelflitzer</option>
                                                        <option>Knipser</option>
                                                        <option>Zerstörer</option>
                                                        <option>Wandspieler</option>
                                                        <option>Box-to-Box</option>
                                                        <option>Modern Defender</option>
                                                        <option>Sweeper Keeper</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* TAB: BADGES */}
                        {activeTab === 'badges' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-cyan-500/10 p-4 rounded-xl border border-amber-500/20">
                                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-1">⚡ Signature Badges</h3>
                                    <p className="text-xs text-muted-foreground">Wähle bis zu {MAX_BADGES} PlayStyles, die dich als Spieler auszeichnen. Sie werden prominent auf deinem Profil angezeigt.</p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < formData.signature_badges.length ? 'bg-amber-400' : 'bg-white/20'}`} />
                                        ))}
                                        <span className="text-[10px] text-muted-foreground ml-1">{formData.signature_badges.length}/{MAX_BADGES}</span>
                                    </div>
                                </div>

                                {BADGE_CATEGORIES.map(cat => {
                                    const badges = SIGNATURE_BADGES.filter(b => b.category === cat.id);
                                    return (
                                        <div key={cat.id}>
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <span>{cat.emoji}</span> {cat.label}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {badges.map(badge => {
                                                    const isSelected = formData.signature_badges.includes(badge.id);
                                                    const isMaxed = formData.signature_badges.length >= MAX_BADGES && !isSelected;
                                                    const colors = getBadgeColors(badge);
                                                    const Icon = badge.icon;
                                                    return (
                                                        <button
                                                            key={badge.id}
                                                            type="button"
                                                            disabled={isMaxed}
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    signature_badges: isSelected
                                                                        ? prev.signature_badges.filter(id => id !== badge.id)
                                                                        : [...prev.signature_badges, badge.id]
                                                                }));
                                                            }}
                                                            className={`relative p-3 rounded-xl border text-left transition-all duration-200 ${
                                                                isSelected
                                                                    ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
                                                                    : isMaxed
                                                                        ? 'border-border bg-muted/30 opacity-30 cursor-not-allowed'
                                                                        : 'border-border bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <div className="absolute top-1.5 right-1.5">
                                                                    <Check size={12} className={colors.text} />
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`p-1.5 rounded-lg ${isSelected ? colors.bg : 'bg-white/5'}`}>
                                                                    <Icon size={18} className={isSelected ? colors.text : 'text-muted-foreground'} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className={`text-xs font-bold truncate ${isSelected ? colors.text : 'text-foreground/80'}`}>{badge.name}</div>
                                                                    <div className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{badge.description}</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* TAB 3: HISTORIE */}
                        {activeTab === 'historie' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Add Entry Button */}
                                {!showCareerForm && (
                                    <button
                                        type="button"
                                        onClick={() => { resetCareerForm(); setShowCareerForm(true); }}
                                        className="w-full py-3 rounded-xl border-2 border-dashed border-cyan-500/30 text-cyan-400 font-bold text-sm hover:bg-cyan-500/5 hover:border-cyan-500/50 transition flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> Station hinzufügen
                                    </button>
                                )}

                                {/* Career Form */}
                                {showCareerForm && (
                                    <div className="bg-slate-100/50 dark:bg-zinc-800/50 p-4 rounded-xl border border-border space-y-3">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                            {editingCareer ? '✏️ Station bearbeiten' : '➕ Neue Station'}
                                        </h3>
                                        <div className="relative">
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Vereinsname *</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-4 text-muted-foreground" size={16} />
                                                <input
                                                    value={careerClubSearch || careerForm.club_name}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setCareerClubSearch(val);
                                                        setCareerForm({ ...careerForm, club_name: val });
                                                        if (val.length < 2) setShowCareerClubDropdown(false);
                                                    }}
                                                    onFocus={() => { if (careerClubResults.length > 0) setShowCareerClubDropdown(true); }}
                                                    className={`${inputStyle} pl-10`}
                                                    placeholder="Verein suchen oder eingeben..."
                                                />
                                            </div>
                                            {/* Autocomplete Dropdown */}
                                            {showCareerClubDropdown && careerClubResults.length > 0 && (
                                                <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-1 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                                                    {careerClubResults.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                setCareerForm({
                                                                    ...careerForm,
                                                                    club_name: c.name,
                                                                    league: c.leagues?.name || c.league || careerForm.league
                                                                });
                                                                setCareerClubSearch(c.name);
                                                                setShowCareerClubDropdown(false);
                                                            }}
                                                            className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-foreground border-b border-border flex items-center gap-3 transition"
                                                        >
                                                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {c.logo_url ? <img src={c.logo_url} className="w-full h-full rounded-full object-cover" /> : <Shield size={12} className="text-slate-400" />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold truncate">{c.name}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.leagues?.name || c.league || 'Amateurliga'}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Custom value hint */}
                                            {careerClubSearch.length > 2 && careerClubResults.length === 0 && showCareerClubDropdown && (
                                                <div className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-border rounded-xl mt-1 overflow-hidden shadow-xl p-2">
                                                    <div
                                                        onClick={() => setShowCareerClubDropdown(false)}
                                                        className="p-2.5 bg-cyan-500/10 text-cyan-400 cursor-pointer font-bold text-xs hover:bg-cyan-500/20 flex items-center gap-2 rounded-lg transition"
                                                    >
                                                        <Plus size={14} /> "{careerClubSearch}" als Verein übernehmen
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Liga (optional)</label>
                                            <input
                                                value={careerForm.league}
                                                onChange={e => setCareerForm({ ...careerForm, league: e.target.value })}
                                                className={inputStyle}
                                                placeholder="z.B. Bundesliga, Kreisliga A"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Von *</label>
                                                <input
                                                    type="month"
                                                    value={careerForm.start_date}
                                                    onChange={e => setCareerForm({ ...careerForm, start_date: e.target.value })}
                                                    className={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Bis</label>
                                                <input
                                                    type="month"
                                                    value={careerForm.end_date}
                                                    onChange={e => setCareerForm({ ...careerForm, end_date: e.target.value })}
                                                    className={inputStyle}
                                                    disabled={careerForm.is_current}
                                                />
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer py-1">
                                            <input
                                                type="checkbox"
                                                checked={careerForm.is_current}
                                                onChange={e => setCareerForm({ ...careerForm, is_current: e.target.checked, end_date: '' })}
                                                className="w-4 h-4 rounded border-border text-cyan-500 focus:ring-cyan-500"
                                            />
                                            Bis heute (aktueller Verein)
                                        </label>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Beweis-Link (optional)</label>
                                            <input
                                                value={careerForm.proof_url}
                                                onChange={e => setCareerForm({ ...careerForm, proof_url: e.target.value })}
                                                className={inputStyle}
                                                placeholder="z.B. Transfermarkt- oder FuPa-Profil"
                                            />
                                            <p className="text-[10px] text-muted-foreground/60 mt-1 ml-1">Beschleunigt die Verifizierung deiner Station!</p>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={handleCareerSave}
                                                disabled={careerLoading}
                                                className={`${btnPrimary} flex-1 flex items-center justify-center gap-2 text-sm py-2.5`}
                                            >
                                                {careerLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                {editingCareer ? 'Aktualisieren' : 'Hinzufügen'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={resetCareerForm}
                                                className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm border border-border hover:bg-muted/80 transition"
                                            >
                                                Abbrechen
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Existing Entries */}
                                {careerLoading && careerEntries.length === 0 ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 size={20} className="text-muted-foreground animate-spin" />
                                    </div>
                                ) : careerEntries.length === 0 && !showCareerForm ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        <History size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                                        <p>Noch keine Stationen eingetragen.</p>
                                        <p className="text-xs mt-1">Füge deine Vereinshistorie hinzu!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {careerEntries.map(entry => (
                                            <div key={entry.id} className="bg-slate-100/50 dark:bg-zinc-800/30 p-3 rounded-xl border border-border flex items-center gap-3 group">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                                    <Shield size={14} className="text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-foreground text-sm truncate">{entry.club_name}</span>
                                                        {entry.is_verified ? (
                                                            <span className="text-cyan-400" title="Verifiziert"><Check size={14} /></span>
                                                        ) : (
                                                            <span className="text-slate-500" title="Prüfung ausstehend"><Clock size={12} /></span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {entry.league && `${entry.league} · `}
                                                        {entry.start_date ? new Date(entry.start_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '?'}
                                                        {' – '}
                                                        {entry.end_date ? new Date(entry.end_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : 'Heute'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button type="button" onClick={() => startEditCareer(entry)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-muted-foreground hover:text-foreground">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button type="button" onClick={() => handleCareerDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-muted-foreground hover:text-red-400">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: SOCIALS & LINKS */}
                        {activeTab === 'social' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="bg-slate-100/50 dark:bg-zinc-800/30 p-4 rounded-xl border border-border text-center mb-2">
                                    <p className="text-sm text-muted-foreground">Verbinde deine Accounts, damit Scouts mehr von dir sehen können.</p>
                                </div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Social Media</h3>
                                <div className="space-y-3">
                                    <input placeholder="Instagram Username" value={formData.instagram_handle} onChange={e => setFormData({ ...formData, instagram_handle: e.target.value })} className={inputStyle} />
                                    <input placeholder="TikTok Username" value={formData.tiktok_handle} onChange={e => setFormData({ ...formData, tiktok_handle: e.target.value })} className={inputStyle} />
                                    <input placeholder="YouTube Channel" value={formData.youtube_handle} onChange={e => setFormData({ ...formData, youtube_handle: e.target.value })} className={inputStyle} />
                                </div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pt-4">Externe Profile</h3>
                                <div className="space-y-3">
                                    <input placeholder="Transfermarkt Link" value={formData.transfermarkt_url} onChange={e => setFormData({ ...formData, transfermarkt_url: e.target.value })} className={inputStyle} />
                                    <input placeholder="FuPa Link" value={formData.fupa_url} onChange={e => setFormData({ ...formData, fupa_url: e.target.value })} className={inputStyle} />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-border bg-white dark:bg-zinc-900">
                    <button form="edit-form" disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Speichern</>}
                    </button>
                </div>
            </div>

            {/* Transfer Modal Overlay */}
            {showTransferModal && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-blue-500/30 text-center flex flex-col items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                            <Activity className="text-blue-500 w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-foreground">Transfer verkünden? 🚀</h3>
                        <p className="text-sm text-muted-foreground mb-8">
                            Möchtest du deinen Wechsel von <strong className="text-foreground">{transferData?.old_club_name}</strong> zu <strong className="text-foreground">{transferData?.new_club_name}</strong> offiziell im Feed teilen?
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const { error: hlErr } = await supabase.from('media_highlights').insert({
                                            player_id: player.id,
                                            post_type: 'transfer',
                                            transfer_data: transferData,
                                        });
                                        if (hlErr) throw hlErr;
                                        addToast("Transfer im Feed geteilt! 🎉", "success");
                                    } catch(e) {
                                        addToast("Fehler beim Teilen: " + e.message, "error");
                                    } finally {
                                        setLoading(false);
                                        setShowTransferModal(false);
                                        onClose();
                                    }
                                }}
                                className={`${btnPrimary} w-full py-3.5 text-base shadow-lg shadow-blue-500/20`}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Ja, im Feed teilen!'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    onClose();
                                }}
                                className="p-3 text-sm font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition w-full"
                                disabled={loading}
                            >
                                Nein, geheim halten
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Crop Modal */}
            {cropImageSrc && (
                <ImageCropModal
                    imageSrc={cropImageSrc}
                    onClose={() => setCropImageSrc(null)}
                    onCrop={(blob) => {
                        setAvatarFile(blob);
                        setPreviewUrl(URL.createObjectURL(blob));
                        setCropImageSrc(null);
                    }}
                />
            )}
        </div>
    );
};
