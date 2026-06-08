import React, { useState, useEffect } from 'react';
import { 
    X, User, Save, Camera, Search, Plus, Loader2, Shield, Activity, 
    Share2, Calendar, Globe, MapPin, History, Trash2, Edit, ExternalLink, 
    Check, Clock, Award, Briefcase, Target, Radar, CheckCircle, AlertCircle, 
    ChevronLeft, Trophy, BadgeCheck
} from 'lucide-react';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { getClubBorderColor } from '../lib/helpers';
import { useToast } from '../contexts/ToastContext';
import { ImageCropModal } from './ImageCropModal';
import * as api from '../lib/api';
import { SIGNATURE_BADGES, BADGE_CATEGORIES, MAX_BADGES, getBadgeColors } from '../lib/badges';
import { calculateAgeInfo, AGE_ERROR_MESSAGE, MIN_AGE } from '../lib/ageValidation';
import { CountryCombobox } from './CountryCombobox';
import { ScoutPassportCard } from './ScoutPassportCard';
export const EditProfileModal = ({ profile, onClose, onUpdate, onAdminHubReq }) => {
    const isAdmin = profile?.role === 'admin';
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const { addToast } = useToast();
    const [errors, setErrors] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [isElite, setIsElite] = useState(false);

    // Loading Guard: prevent crash when profile data is not yet available
    if (!profile) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-white">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm font-medium">Profil wird geladen…</span>
                </div>
            </div>
        );
    }

    const initialFirstName = profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : '');
    const initialLastName = profile?.last_name || (profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') : '');

    const isCoach = profile?.role === 'coach';
    const isScout = profile?.role === 'scout';
    const isPlayer = !isCoach && !isScout && profile?.role !== 'admin' && profile?.role !== 'manager';
    const isSystemAccount = profile?.role === 'system' || profile?.is_official || profile?.email === 'kontakt@cavio.me';


    const [formData, setFormData] = useState({
        username: profile?.username || '',
        first_name: initialFirstName,
        last_name: initialLastName,
        position_primary: profile?.position_primary || 'ZOM',
        position_secondary: profile?.position_secondary || '',
        height_user: profile?.height_user || '',
        weight: profile?.weight || '',
        strong_foot: profile?.strong_foot || 'Rechts',
        transfer_status: profile?.transfer_status || 'Gebunden',
        contract_end: profile?.contract_end || '',
        bio: profile?.bio || '',
        city: profile?.city || '',
        instagram_handle: profile?.instagram_handle || '',
        tiktok_handle: profile?.tiktok_handle || '',
        youtube_handle: profile?.youtube_handle || '',
        transfermarkt_url: profile?.transfermarkt_url || '',
        fupa_url: profile?.fupa_url || '',
        birth_date: profile?.birth_date || '',
        jersey_number: profile?.jersey_number || '',
        nationality: profile?.nationality || '',
        nationality_2: profile?.nationality_2 || '',
        player_archetype: profile?.player_archetype || '',
        signature_badges: profile?.signature_badges || [],
        // Coach-specific fields
        preferred_formation: profile?.preferred_system || '',
        coaching_license: (profile?.licenses && profile.licenses[0]) || '',
        experience_years: profile?.experience_years || '',
        leadership_styles: profile?.specializations || [],
        tactical_identity: profile?.tactical_identity || [],
        // Scout-specific fields
        scout_title: profile?.club_affiliation || '',
        focus_age_groups: profile?.tactical_identity || [],
        scout_expertise: profile?.specializations || [],
        scout_radius: profile?.preferred_system || ''
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(profile?.avatar_url);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [clubSearch, setClubSearch] = useState('');

    // Agency States
    const [agencySearch, setAgencySearch] = useState(profile?.agencies?.name || '');
    const [agencyResults, setAgencyResults] = useState([]);
    const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);
    const [selectedAgencyName, setSelectedAgencyName] = useState(profile?.agencies?.name || '');
    const [selectedAgencyLogo, setSelectedAgencyLogo] = useState(profile?.agencies?.logo_url || null);
    const [selectedAgencyId, setSelectedAgencyId] = useState(profile?.agency_id || null);

    useEffect(() => {
        if (agencySearch.length < 2) {
            setAgencyResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const results = await api.fetchAgencies(agencySearch);
                setAgencyResults(results || []);
            } catch (err) {
                console.error("Error fetching agencies:", err);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [agencySearch]);

    // Nationality 2 States
    const [nat2Request, setNat2Request] = useState(null);
    const [nat2Loading, setNat2Loading] = useState(false);
    const [passportFile, setPassportFile] = useState(null);
    const [passportPreview, setPassportPreview] = useState(null);

    useEffect(() => {
        const fetchNat2Request = async () => {
            if (!profile?.id) return;
            const { data } = await supabase
                .from('nationality_verifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            setNat2Request(data);
        };
        fetchNat2Request();
    }, [profile]);
    const [clubResults, setClubResults] = useState([]);
    const [selectedClub, setSelectedClub] = useState(profile?.clubs || null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState(null);

    // Career History State
    const [careerEntries, setCareerEntries] = useState([]);
    const [careerLoading, setCareerLoading] = useState(false);
    const [showCareerForm, setShowCareerForm] = useState(false);
    const [editingCareer, setEditingCareer] = useState(null);
    const [careerForm, setCareerForm] = useState({
        club_name: '', league: '', start_date: '', end_date: '', proof_url: '', is_current: false, wants_transfer_post: true, is_captain: false, club_id: null
    });
    const [careerClubSearch, setCareerClubSearch] = useState('');
    const [careerClubResults, setCareerClubResults] = useState([]);
    const [showCareerClubDropdown, setShowCareerClubDropdown] = useState(false);
    
    const [suggestForm, setSuggestForm] = useState({
        name: '',
        city: '',
        league: ''
    });
    const [showSuggestModal, setShowSuggestModal] = useState(false);

    const [careerError, setCareerError] = useState('');

    // Elite Station Detector
    const checkIfElite = (data, club = null) => {
        const playerKeywords = ['bundesliga', 'regionalliga', 'nlz', 'nationalmannschaft', 'oberliga', 'akademie'];
        const coachKeywords = ['uefa pro', 'uefa a', 'uefa b', 'dfb elite'];
        const scoutKeywords = ['profi', '1. liga', '2. liga', 'fifa', 'agentur'];

        const clubName = (club?.name || '').toLowerCase();
        const leagueName = (club?.leagues?.name || club?.league || '').toLowerCase();
        const isVerifiedClub = club?.is_verified === true;

        if (isPlayer) {
            const input = `${clubName} ${leagueName}`.toLowerCase();
            return playerKeywords.some(kw => input.includes(kw));
        }

        if (isCoach) {
            const license = (data.coaching_license || '').toLowerCase();
            return coachKeywords.some(kw => license.includes(kw));
        }

        if (isScout) {
            const title = (data.scout_title || '').toLowerCase();
            const expertise = (data.scout_expertise || []).join(' ').toLowerCase();
            const input = `${title} ${expertise} ${clubName} ${leagueName}`.toLowerCase();
            return scoutKeywords.some(kw => input.includes(kw)) || isVerifiedClub;
        }

        return false;
    };

    // Keep legacy check for career history
    const checkIfPremium = (leagueName, clubName) => {
        const premiumKeywords = ['bundesliga', 'regionalliga', 'oberliga', 'profi', 'nationalmannschaft', 'nlz', 'akademie', 'u19', 'u17', 'jbl', 'auswahl', 'stützpunkt'];
        const input = `${leagueName || ''} ${clubName || ''}`.toLowerCase();
        return premiumKeywords.some(kw => input.includes(kw));
    };

    // Real-time Elite Detection
    useEffect(() => {
        setIsElite(checkIfElite(formData, selectedClub));
    }, [formData, selectedClub]);

    const hasDateOverlap = (newStartStr, newEndStr, existingEntries, currentId) => {
        if (!newStartStr) return null;
        const newStart = new Date(newStartStr + '-01');
        const newEnd = newEndStr ? new Date(newEndStr + '-01') : new Date();

        for (const entry of existingEntries) {
            if (currentId && entry.id === currentId) continue;

            const entryStart = new Date(entry.start_date);
            const entryEnd = entry.end_date ? new Date(entry.end_date) : new Date();

            // Overlap logic: (StartA <= EndB) && (EndA >= StartB)
            if (newStart <= entryEnd && newEnd >= entryStart) {
                return entry.club_name;
            }
        }
        return null;
    };

    const handleCloseAttempt = () => {
        if (hasUnsavedChanges) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    const confirmClose = () => {
        setShowCloseWarning(false);
        onClose();
    };

    // Fetch career entries
    useEffect(() => {
        if (!profile.user_id) return;
        const loadCareer = async () => {
            setCareerLoading(true);
            try {
                const { data, error } = await supabase
                    .from('career_history')
                    .select('*, clubs(is_verified)')
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
        setCareerForm({ club_name: '', league: '', start_date: '', end_date: '', proof_url: '', is_current: false, club_id: null, wants_transfer_post: true, is_captain: false });
        setCareerClubSearch('');
        setCareerClubResults([]);
        setShowCareerClubDropdown(false);
        setEditingCareer(null);
        setShowCareerForm(false);
        setCareerError('');
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

    const handleCreateNewClub = async () => {
        if (!careerClubSearch || careerClubSearch.length < 3) return;
        setCareerLoading(true);
        try {
            const { data, error } = await supabase
                .from('clubs')
                .insert({
                    name: careerClubSearch.trim(),
                    is_verified: false,
                    created_by: profile.user_id
                })
                .select()
                .single();

            if (error) throw error;

            setCareerForm({
                ...careerForm,
                club_name: data.name,
                club_id: data.id,
                league: ''
            });
            setCareerClubSearch(data.name);
            setShowCareerClubDropdown(false);
            setCareerClubResults([]);
            addToast(`"${data.name}" wurde als neuer Verein angelegt.`, 'success');
        } catch (e) {
            addToast('Fehler beim Anlegen des Vereins: ' + e.message, 'error');
        } finally {
            setCareerLoading(false);
        }
    };

    const handleCaptainToggle = async (checked) => {
        if (!editingCareer) {
            // Local form toggle before saving a new station
            if (checked) {
                const confirmMsg = "Möchtest du angeben, dass du Kapitän dieses Teams bist/warst?\n\n" +
                                   "PROZESS-HINWEIS:\n" +
                                   "Sobald du diese Karrierestation speicherst, wird automatisch ein offizieller Verifizierungsantrag an das Admin-Team übermittelt. " +
                                   "Die Kapitäns-Rolle wird erst nach positiver Prüfung durch einen Administrator auf deinem Profil mit dem goldenen ©-Symbol freigeschaltet.\n\n" +
                                   "Möchtest du diese Angabe vormerken?";
                if (!window.confirm(confirmMsg)) return;
            } else {
                const confirmMsg = "Möchtest du die Kapitäns-Angabe für diese neue Station wieder entfernen?\n\n" +
                                   "PROZESS-HINWEIS:\n" +
                                   "Dadurch wird die Vormerkung gelöscht und beim Speichern wird kein Verifizierungsantrag für den Kapitäns-Status an das Admin-Team gesendet.\n\n" +
                                   "Möchtest du die Kapitäns-Angabe entfernen?";
                if (!window.confirm(confirmMsg)) return;
            }
            setCareerForm(prev => ({ ...prev, is_captain: checked }));
            return;
        }

        if (checked) {
            const confirmMsg = "Möchtest du die Kapitänsbinde für dieses Team beantragen?\n\n" +
                               "PROZESS-HINWEIS:\n" +
                               "Dadurch wird SOFORT ein offizieller Verifizierungsantrag an das Admin-Team gesendet. " +
                               "Deine Anfrage wird in die Admin-Prüfwarteschlange eingereiht. Das goldene ©-Symbol erscheint erst auf deinem Profil, " +
                               "sobald ein Administrator deinen Antrag positiv geprüft und freigegeben hat.\n\n" +
                               "Möchtest du diesen Verifizierungsprozess jetzt starten?";
            if (!window.confirm(confirmMsg)) return;
        } else {
            const confirmMsg = "MÖCHTEST DU DEINEN KAPITÄNS-STATUS FÜR DIESES TEAM WIRKLICH ABLEGEN?\n\n" +
                               "⚠️ ACHTUNG - DIREKTER DATENBANK-EINGRIFF:\n" +
                               "- Deine Kapitänsbinde (©) wird SOFORT von deinem Profil entfernt.\n" +
                               "- Es ist KEINE Freigabe durch einen Admin erforderlich (Sofortiges Bypass-Update).\n" +
                               "- Das goldene ©-Symbol erlischt augenblicklich für alle Nutzer.\n\n" +
                               "Bist du dir absolut sicher, dass du deinen Kapitäns-Status jetzt unwiderruflich entfernen möchtest?";
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            const stationId = editingCareer.id;
            if (checked) {
                // Promotion (checking): Set is_captain_request to true
                const { data, error } = await supabase
                    .from('career_history')
                    .update({ is_captain_request: true })
                    .eq('id', stationId)
                    .select()
                    .single();
                if (error) throw error;
                
                // Update React states
                setCareerForm(prev => ({ ...prev, is_captain: true }));
                setEditingCareer(data);
                setCareerEntries(prev => prev.map(e => e.id === stationId ? data : e));
                addToast('👑 Kapitäns-Anfrage an den Admin gesendet!', 'success');
            } else {
                // Demotion (unchecking): Immediately set is_captain and is_captain_request to false
                const { data, error } = await supabase
                    .from('career_history')
                    .update({ is_captain: false, is_captain_request: false })
                    .eq('id', stationId)
                    .select()
                    .single();
                if (error) throw error;

                // Update React states
                setCareerForm(prev => ({ ...prev, is_captain: false }));
                setEditingCareer(data);
                setCareerEntries(prev => prev.map(e => e.id === stationId ? data : e));
                addToast('Kapitänsbinde abgelegt.', 'success');
            }
        } catch (err) {
            console.error('Error toggling captain status:', err);
            addToast('Fehler beim Aktualisieren des Kapitäns-Status: ' + err.message, 'error');
        }
    };

    const handleCareerSave = async () => {
        if (!careerForm.club_name.trim() || !careerForm.start_date) {
            addToast('Vereinsname und Startdatum sind Pflichtfelder.', 'error');
            return;
        }

        const overlapClub = hasDateOverlap(careerForm.start_date, careerForm.is_current ? '' : careerForm.end_date, careerEntries, editingCareer?.id);
        if (overlapClub) {
            const errorMsg = `Überschneidung erkannt: Dieser Zeitraum überschneidet sich mit deiner Station bei "${overlapClub}".`;
            setCareerError(errorMsg);
            addToast(errorMsg, 'error');
            return;
        }
        setCareerError('');

        setCareerLoading(true);
        try {
            const formatForDB = (dateString) => {
                if (!dateString) return null;
                // Wenn es nur YYYY-MM ist (z.B. "2012-04"), mache "2012-04-01" daraus
                if (dateString.length === 7 && dateString.includes('-')) {
                    return `${dateString}-01`;
                }
                return dateString;
            };

            const isPremium = checkIfPremium(careerForm.league, careerForm.club_name);

            // 2. Den Status erzwingen
            let finalVerificationStatus = 'pending'; // Standard für echte neue Anträge

            if (editingCareer) {
                // Bei Editierung bleibt der Verifizierungsstatus erhalten, außer wichtige Felder ändern sich
                const criticalChanged = editingCareer.club_name !== careerForm.club_name.trim() ||
                                        editingCareer.league !== (careerForm.league.trim() || null) ||
                                        editingCareer.start_date !== formatForDB(careerForm.start_date) ||
                                        editingCareer.end_date !== (careerForm.is_current ? null : (formatForDB(careerForm.end_date) || null));
                
                finalVerificationStatus = criticalChanged ? 'pending' : editingCareer.verification_status;
            }

            // Kapitäns-Status wird separat/autonom verwaltet.
            // Beim Speichern der restlichen Formulardaten übernehmen wir einfach den aktuellen Status aus editingCareer (falls vorhanden).
            const finalIsCaptain = editingCareer ? (editingCareer.is_captain ?? false) : false;
            const finalIsCaptainRequest = editingCareer ? (editingCareer.is_captain_request ?? false) : (careerForm.is_captain ?? false);

            // 3. Payload zusammenbauen
            const payload = {
                user_id: profile.user_id,
                club_name: careerForm.club_name.trim(),
                league: careerForm.league.trim() || null,
                start_date: formatForDB(careerForm.start_date),
                end_date: careerForm.is_current ? null : (formatForDB(careerForm.end_date) || null),
                proof_url: careerForm.proof_url.trim() || null,
                club_id: careerForm.club_id,
                is_premium: isPremium,
                verification_status: finalVerificationStatus,
                wants_transfer_post: careerForm.wants_transfer_post ?? true,
                is_captain: finalIsCaptain,
                is_captain_request: finalIsCaptainRequest,
                squad_category: profile.ecosystem
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
                addToast('Eintrag gespeichert! Deine Station wird geprüft und erscheint auf deinem Profil, sobald sie verifiziert wurde.', 'success');
            } else {
                const { data, error } = await supabase
                    .from('career_history')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                setCareerEntries(prev => [data, ...prev]);
                addToast('Eintrag gespeichert! Deine Station wird geprüft und erscheint auf deinem Profil, sobald sie verifiziert wurde.', 'success');
            }

            // Sync with profile if "is_current" is checked
            if (careerForm.is_current && careerForm.club_id) {
                try {
                    const { error: syncError } = await supabase
                        .from('players_master')
                        .update({ club_id: careerForm.club_id })
                        .eq('id', profile.id);
                    
                    if (syncError) throw syncError;
                    
                    // Also auto-join the team via RPC (creates club_teams entry if needed)
                    try {
                        const ageCategory = profile.ecosystem === 'jugend' ? 'U19' : 'Senioren';
                        const gender = 'Männlich'; // Default; can be refined later
                        await api.joinOrCreateTeam(
                            careerForm.club_name.trim(),
                            ageCategory,
                            gender
                        );
                    } catch (teamErr) {
                        console.warn("Auto team-join during career sync skipped:", teamErr.message);
                    }
                    
                    // Update local selectedClub to reflect change in Profile tab
                    const { data: newClubData } = await supabase
                        .from('clubs')
                        .select('*, leagues(name)')
                        .eq('id', careerForm.club_id)
                        .single();
                    
                    if (newClubData) {
                        setSelectedClub(newClubData);
                        setFormData(prev => ({ ...prev, club_id: newClubData.id }));
                    }
                } catch (syncErr) {
                    console.error("Profile sync failed:", syncErr);
                }
            }

            onUpdate(profile);
            resetCareerForm();
        } catch (e) {
            addToast('Fehler: ' + e.message, 'error');
        } finally {
            setCareerLoading(false);
        }
    };

    const handleCareerDelete = async (id) => {
        if (!window.confirm('Möchtest du diese Karrierestation wirklich unwiderruflich löschen?')) return;
        setCareerLoading(true);
        try {
            const { error } = await supabase.from('career_history').delete().eq('id', id);
            if (error) throw error;
            setCareerEntries(prev => prev.filter(e => e.id !== id));
            onUpdate(profile);
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
            is_current: !entry.end_date,
            wants_transfer_post: entry.wants_transfer_post ?? true,
            is_captain: entry.is_captain ?? false,
            club_id: entry.club_id || null
        });
        setCareerClubSearch(entry.club_name || '');
        setEditingCareer(entry);
        setShowCareerForm(true);
        setCareerError('');
    };

    useEffect(() => {
        if (clubSearch.length < 2) { setClubResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const { data } = await supabase
                    .from('clubs')
                    .select('*, leagues(name, tier), countries(iso_code, flag_url)')
                    .ilike('name', `%${clubSearch}%`)
                    .limit(8);
                setClubResults(data || []);
            } catch (e) { /* silent */ }
        }, 300);
        return () => clearTimeout(t);
    }, [clubSearch]);

    const handleCreateClub = async (e) => {
        if (e) e.preventDefault();
        if (!suggestForm.name.trim() || !suggestForm.city.trim()) {
            addToast('Vereinsname und Stadt sind Pflichtfelder.', 'error');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clubs')
                .insert({ 
                    name: suggestForm.name.trim(), 
                    city: suggestForm.city.trim(),
                    league: suggestForm.league.trim() || null,
                    is_verified: false 
                })
                .select()
                .single();

            if (error) throw error;
            
            setSelectedClub(data);
            setClubSearch('');
            setClubResults([]);
            setShowSuggestModal(false);
            addToast(`"${data.name}" wurde vorgeschlagen und für dich ausgewählt!`, 'success');
        } catch (e) {
            addToast('Fehler: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // Phishing Protection: Validate reserved words
        const reservedWords = ['cavio', 'support', 'admin', 'system', 'official', 'verified', 'moderator'];
        const nameFields = [formData.first_name, formData.last_name, formData.username];
        const containsReserved = nameFields.some(field => 
            field && reservedWords.some(word => field.toLowerCase().includes(word))
        );

        if (containsReserved && profile.role !== 'system') {
            addToast('Reservierter Name: Begriffe wie "CAVIO" oder "Support" sind offiziellen Accounts vorbehalten.', 'error');
            return;
        }

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
                const p = `${profile.user_id}/${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage.from('avatars').upload(p, avatarFile);
                if (uploadErr) throw uploadErr;
                const { data } = supabase.storage.from('avatars').getPublicUrl(p);
                av = data.publicUrl;
            }

            // Geocode city if changed
            let latitude = profile.latitude || null;
            let longitude = profile.longitude || null;
            if (formData.city && formData.city !== profile.city) {
                const coords = await api.geocodeCity(formData.city);
                if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                }
            }

            const full_name = `${formData.first_name} ${formData.last_name}`.trim();
            
            // Ensure the user has a vanity slug
            let finalSlug = profile.slug;
            if (!finalSlug) {
                const baseSlug = api.generateSlug(full_name || formData.username || 'user');
                finalSlug = await api.ensureUniqueSlug(baseSlug, profile.id);
            }
            
            const oldClub = profile.clubs;
            const newClub = selectedClub;
            const hasClubChanged = newClub && (!oldClub || oldClub.id !== newClub.id);

            // Build base updates (shared fields)
            const updates = {
                slug: finalSlug,
                first_name: formData.first_name,
                last_name: formData.last_name,
                full_name,
                username: formData.username?.toLowerCase().replace(/[@\s]/g, '') || null,
                bio: formData.bio,
                city: formData.city,
                birth_date: formData.birth_date || null,
                nationality: formData.nationality,
                nationality_2: formData.nationality_2,
                is_nat_2_verified: formData.nationality_2 === profile.nationality_2 ? (profile.is_nat_2_verified || false) : false,
                instagram_handle: formData.instagram_handle,
                tiktok_handle: formData.tiktok_handle,
                youtube_handle: formData.youtube_handle,
                transfermarkt_url: formData.transfermarkt_url,
                fupa_url: formData.fupa_url,
                club_id: selectedClub?.id || null,
                club_verification_status: hasClubChanged ? 'pending' : (profile.club_verification_status || 'approved'),
                latitude,
                longitude,
                signature_badges: formData.signature_badges || [],
                verification_status: isElite ? 'pending' : (profile.verification_status || 'unverified')
            };

            if (isScout) {
                // Scout-specific field mapping
                updates.club_affiliation = formData.scout_title || null;
                updates.tactical_identity = formData.focus_age_groups || [];
                updates.specializations = formData.scout_expertise || [];
                updates.preferred_system = formData.scout_radius || null;
                updates.scout_title = formData.scout_title || null;

                // Handle Agency Logic
                if (selectedAgencyName) {
                    try {
                        const agency = await api.getOrCreateAgency(selectedAgencyName, selectedAgencyLogo);
                        updates.agency_id = agency.id;
                    } catch (err) {
                        console.error("Error saving agency:", err);
                    }
                } else {
                    updates.agency_id = null;
                }
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
            setHasUnsavedChanges(false);
            onUpdate(data);
            addToast("Profil erfolgreich gespeichert! ✅", 'success');

            if (hasClubChanged) {
                setTransferData({
                    old_club_id: oldClub?.id || null,
                    old_club_name: oldClub?.name || 'Vereinslos',
                    new_club_id: newClub.id,
                    new_club_name: newClub.name
                });
                setShowTransferModal(true);
                addToast("Vereinswechsel eingereicht und wartet auf Verifizierung! ⏳", 'info');
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
                <div className="flex items-center justify-between w-full px-4 py-4 border-b border-gray-800 bg-background z-[100] sticky top-0">
                    <div className="flex items-center gap-3">
                        {/* Zurück-Button */}
                        <button 
                            onClick={handleCloseAttempt} 
                            className="p-2 bg-gray-800/50 rounded-full text-white hover:bg-gray-700 flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        
                        {/* Titel */}
                        <h2 className="text-xl font-bold text-white tracking-tight">Profil bearbeiten</h2>
                    </div>

                    {/* Speichern Button im Header für Premium Look */}
                    <button 
                        form="edit-form" 
                        disabled={loading} 
                        className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Speichern</>}
                    </button>
                </div>

                {isSystemAccount ? (
                    <div className="flex justify-center items-center py-5 px-6 bg-slate-950/20 dark:bg-black/30 border-b border-border">
                        <div className="flex items-center justify-center w-full p-4 bg-slate-900/60 backdrop-blur-md border border-blue-500/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <span className="text-white font-bold text-xl tracking-wide">
                                CAVIO Support
                            </span>
                            <BadgeCheck size={20} className="text-blue-500 ml-2 fill-blue-500/10 flex-shrink-0" />
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 py-3 px-4 border-b border-border bg-white dark:bg-zinc-900 overflow-x-auto scrollbar-hide">
                        <TabButton id="general" label="Allgemein" icon={User} />
                        <TabButton id="sport" label={isScout ? 'Scouting' : isCoach ? 'Trainer' : 'Sportlich'} icon={isScout ? Briefcase : Activity} />
                        {isPlayer && <TabButton id="badges" label="Badges" icon={Award} />}
                        <TabButton id="historie" label="Historie" icon={History} />
                        <TabButton id="social" label="Socials" icon={Share2} />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-900/50">
                    <SafeErrorBoundary>
                        <form id="edit-form" onSubmit={handleSave} className="space-y-6">
                        {/* TAB 1: ALLGEMEIN */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="flex justify-center">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 overflow-hidden shadow-xl">
                                            {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <img src="/cavio-icon.png" className="w-full h-full object-contain p-8 opacity-60" />}
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                                            <Camera size={28} className="text-white" />
                                        </div>
                                        <input type="file" accept="image/*" onChange={e => {
                                            const f = e.target.files[0];
                                            if (f) { 
                                                setCropImageSrc(URL.createObjectURL(f));
                                                setHasUnsavedChanges(true);
                                            }
                                            e.target.value = '';
                                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Persönliche Daten</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Vorname</label>
                                            <input value={formData.first_name} onChange={e => { setFormData({ ...formData, first_name: e.target.value }); setHasUnsavedChanges(true); }} className={inputStyle} placeholder="Max" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nachname</label>
                                            <input value={formData.last_name} onChange={e => { setFormData({ ...formData, last_name: e.target.value }); setHasUnsavedChanges(true); }} className={inputStyle} placeholder="Mustermann" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Dein @Handle (Username)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                                            <input 
                                                value={formData.username || ''} 
                                                onChange={e => { setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') }); setHasUnsavedChanges(true); }} 
                                                className={`${inputStyle} pl-7`} 
                                                placeholder="deinname" 
                                            />
                                        </div>
                                        <p className="text-[9px] text-muted-foreground mt-1 ml-1 italic">Wird für Markierungen (@mentions) verwendet.</p>
                                    </div>

                                    {/* Birth date and nationality — each in its own full-width row to prevent
                                        the Combobox dropdown from collapsing sibling cells or getting clipped */}
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Geburtsdatum</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input 
                                                    type="date" 
                                                    value={formData.birth_date} 
                                                    onChange={e => { setFormData({ ...formData, birth_date: e.target.value }); setHasUnsavedChanges(true); }} 
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className={`${inputStyle} pl-10 py-2.5 min-h-[46px] ${calculateAgeInfo(formData.birth_date).isUnder16 ? '!border-rose-500/50 focus:!border-rose-500' : ''}`} 
                                                />
                                            </div>
                                            {calculateAgeInfo(formData.birth_date).isUnder16 && (
                                                <p className="text-rose-500 text-[10px] mt-1.5 ml-1 font-medium leading-tight">
                                                    {AGE_ERROR_MESSAGE}
                                                </p>
                                            )}
                                        </div>
                                        {/* Nationality: full width row so the dropdown overlay doesn't
                                            push or clip any adjacent sibling field */}
                                        <div className="relative min-h-[48px]">
                                            <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Nationalität</label>
                                            <CountryCombobox 
                                                value={formData.nationality}
                                                onChange={(code) => { setFormData({ ...formData, nationality: code }); setHasUnsavedChanges(true); }}
                                            />
                                        </div>

                                        {/* Second Nationality */}
                                        <div className="relative min-h-[48px] mt-4">
                                            <div className="flex items-center justify-between ml-1 mb-1">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase block">Zweite Nationalität</label>
                                                {profile.is_nat_2_verified && formData.nationality_2 === profile.nationality_2 && (
                                                    <span className="text-[9px] text-green-500 font-extrabold uppercase bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                                                        <CheckCircle size={10} /> Verifiziert
                                                    </span>
                                                )}
                                            </div>
                                            <CountryCombobox 
                                                value={formData.nationality_2}
                                                onChange={(code) => { 
                                                    if (profile.is_nat_2_verified && profile.nationality_2 && code !== profile.nationality_2) {
                                                        addToast("Verifizierte Nationalitäten können nicht geändert werden.", "info");
                                                        return;
                                                    }
                                                    setFormData({ ...formData, nationality_2: code }); 
                                                    setHasUnsavedChanges(true); 
                                                }}
                                                disabled={profile.is_nat_2_verified && formData.nationality_2 === profile.nationality_2}
                                            />
                                        </div>

                                        {/* Passport Upload Area */}
                                        {formData.nationality_2 && (!profile.is_nat_2_verified || formData.nationality_2 !== profile.nationality_2) && (
                                            <div className="mt-4 p-4 bg-zinc-950/40 border border-dashed border-white/10 rounded-2xl space-y-3">
                                                <label className="text-[10px] text-zinc-500 font-bold uppercase block">Nachweis zweite Nationalität</label>
                                                
                                                {nat2Request && nat2Request.status === 'pending' && nat2Request.nationality === formData.nationality_2 ? (
                                                    <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-xs font-semibold">
                                                        <Clock size={16} className="animate-pulse shrink-0" />
                                                        <span>Dokument wird geprüft. Eine Verifizierung steht aus. ⏳</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <p className="text-[11px] text-zinc-400 leading-normal">
                                                            Bitte lade ein Foto deines Reisepasses oder Personalausweises hoch, um die Staatsbürgerschaft zu verifizieren.
                                                        </p>
                                                        
                                                        {passportPreview ? (
                                                             <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                                                                 <img src={passportPreview} className="w-full h-full object-contain" />
                                                                 <button 
                                                                     type="button" 
                                                                     onClick={() => { setPassportFile(null); setPassportPreview(null); }}
                                                                     className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition animate-in fade-in"
                                                                 >
                                                                     <X size={14} />
                                                                 </button>
                                                             </div>
                                                         ) : (
                                                             <div className="relative border border-dashed border-white/10 hover:border-cyan-500/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] transition-all group">
                                                                 <Camera size={24} className="text-zinc-600 group-hover:text-cyan-400 mb-2 transition-colors animate-pulse" />
                                                                 <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">Pass-Foto auswählen</span>
                                                                 <span className="text-[9px] text-zinc-600 mt-1">JPEG, PNG oder WEBP</span>
                                                                 <input 
                                                                     type="file" 
                                                                     accept="image/*" 
                                                                     onChange={e => {
                                                                         const file = e.target.files[0];
                                                                         if (file) {
                                                                             setPassportFile(file);
                                                                             setPassportPreview(URL.createObjectURL(file));
                                                                         }
                                                                     }}
                                                                     className="absolute inset-0 opacity-0 cursor-pointer" 
                                                                 />
                                                             </div>
                                                         )}

                                                        {passportFile && (
                                                            <button
                                                                type="button"
                                                                disabled={nat2Loading}
                                                                onClick={async () => {
                                                                    if (!passportFile) return;
                                                                    setNat2Loading(true);
                                                                    try {
                                                                        const fileExt = passportFile.name.split('.').pop();
                                                                        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
                                                                        const path = `${profile.id}/${fileName}`;
                                                                        
                                                                        // Upload file
                                                                        const { error: uploadErr } = await supabase.storage
                                                                            .from('identity_documents')
                                                                            .upload(path, passportFile);
                                                                        if (uploadErr) throw uploadErr;

                                                                        // Get public URL
                                                                        const { data: { publicUrl } } = supabase.storage
                                                                            .from('identity_documents')
                                                                            .getPublicUrl(path);

                                                                        // Create request
                                                                        const { data: reqData, error: reqErr } = await supabase
                                                                            .from('nationality_verifications')
                                                                            .insert({
                                                                                user_id: profile.id,
                                                                                nationality: formData.nationality_2,
                                                                                status: 'pending',
                                                                                verification_type: 'document',
                                                                                document_url: publicUrl
                                                                            })
                                                                            .select()
                                                                            .single();
                                                                        if (reqErr) throw reqErr;

                                                                        setNat2Request(reqData);
                                                                        setPassportFile(null);
                                                                        setPassportPreview(null);
                                                                        addToast("Pass-Dokument erfolgreich hochgeladen! Die Prüfung läuft. ⏳", "success");
                                                                    } catch (err) {
                                                                        console.error("Passport upload failed:", err);
                                                                        addToast("Fehler beim Hochladen: " + err.message, "error");
                                                                    } finally {
                                                                        setNat2Loading(false);
                                                                    }
                                                                }}
                                                                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                                                            >
                                                                {nat2Loading ? <Loader2 className="animate-spin" size={14} /> : "Dokument einreichen"}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Ort</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                placeholder="Berlin" 
                                                value={formData.city} 
                                                onChange={e => { setFormData({ ...formData, city: e.target.value }); setHasUnsavedChanges(true); }} 
                                                className={`${inputStyle} pl-10`} 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Über mich / Motto</label>
                                        <textarea rows={3} placeholder="Erzähl etwas über deinen Spielstil..." value={formData.bio} onChange={e => { setFormData({ ...formData, bio: e.target.value }); setHasUnsavedChanges(true); }} className={`${inputStyle} resize-none`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SPORTLICH */}
                        {activeTab === 'sport' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Club – Auto-Synced from Career History */}
                                <div>
                                    <label className="text-xs text-muted-foreground font-bold uppercase ml-1 mb-1 block">
                                        {isScout ? 'Organisation / Agentur' : isCoach ? 'Aktueller Verein / Organisation' : 'Aktueller Verein'}
                                    </label>
                                    
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-3 shadow-sm shadow-blue-500/5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Trophy size={20} className="text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground leading-tight mb-1">
                                                    Single Source of Truth
                                                </p>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                    Dein aktueller Verein wird automatisch aus deiner verifizierten Karriere-Historie übernommen. Dies sorgt für maximale Datenintegrität auf deinem Profil.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => setActiveTab('historie')}
                                            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <History size={14} />
                                            Zur Karriere-Historie wechseln
                                        </button>
                                    </div>
                                    
                                    {selectedClub && (
                                        <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-border">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                                {selectedClub.logo_url ? <img src={selectedClub.logo_url} className="w-full h-full object-cover" /> : <Shield size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Aktuell gesetzt</span>
                                                <span className="font-bold text-foreground text-sm truncate block">{selectedClub.name}</span>
                                            </div>
                                            {selectedClub.is_verified && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                                        </div>
                                    )}
                                </div>

                                {/* ===== ROLE-SPECIFIC FIELDS ===== */}
                                {isScout ? (
                                    /* ===== SCOUT-SPECIFIC FIELDS ===== */
                                    <>
                                        {/* Berufsbezeichnung & Agentur in 2 Columns */}
                                        <div className="pt-2 border-t border-border">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Briefcase size={14} /> Berufsbezeichnung</h3>
                                                    <select value={formData.scout_title} onChange={e => { setFormData({ ...formData, scout_title: e.target.value }); setHasUnsavedChanges(true); }} className={inputStyle}>
                                                        <option value="">Bitte auswählen</option>
                                                        {['Vereins-Scout', 'Freier Scout', 'Spielervermittler/Agent', 'Kaderplaner/Sportdirektor'].map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="relative">
                                                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Globe size={14} /> Agentur</h3>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                        <input
                                                            type="text"
                                                            value={agencySearch}
                                                            onChange={(e) => {
                                                                setAgencySearch(e.target.value);
                                                                setSelectedAgencyName('');
                                                                setSelectedAgencyLogo(null);
                                                                setShowAgencyDropdown(true);
                                                                setHasUnsavedChanges(true);
                                                            }}
                                                            className={`${inputStyle} pl-10`}
                                                            placeholder="Suchen..."
                                                        />
                                                    </div>
                                                    <AnimatePresence>
                                                        {showAgencyDropdown && agencySearch.length >= 2 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[100]"
                                                            >
                                                                {agencyResults.length > 0 ? (
                                                                    agencyResults.map((ag) => (
                                                                        <button
                                                                            key={ag.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedAgencyName(ag.name);
                                                                                setSelectedAgencyLogo(ag.logo_url);
                                                                                setSelectedAgencyId(ag.id);
                                                                                setAgencySearch(ag.name);
                                                                                setShowAgencyDropdown(false);
                                                                                setHasUnsavedChanges(true);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/80 transition-colors text-left border-b border-slate-800/50 last:border-0"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                                {ag.logo_url ? <img src={ag.logo_url} className="w-full h-full object-cover" /> : <Search size={14} className="text-slate-400" />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-sm text-slate-200">{ag.name}</p>
                                                                                {ag.is_premium && <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-0.5">Premium Partner</p>}
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedAgencyName(agencySearch);
                                                                                setSelectedAgencyLogo(null);
                                                                                setSelectedAgencyId(null);
                                                                                setShowAgencyDropdown(false);
                                                                                setHasUnsavedChanges(true);
                                                                            }}
                                                                            className="w-full p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors text-center"
                                                                        >
                                                                            "{agencySearch}" neu anlegen
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Digital ID Card Preview */}
                                        <div className="pt-6 border-t border-border flex justify-center">
                                            <div className="w-full max-w-sm">
                                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center">Digitale ID-Card Vorschau</h3>
                                                <ScoutPassportCard
                                                    fullName={`${formData.first_name} ${formData.last_name}`}
                                                    scoutTitle={formData.scout_title}
                                                    agencyName={selectedAgencyName || agencySearch}
                                                    agencyLogo={selectedAgencyLogo}
                                                    isAccredited={!!selectedAgencyName}
                                                />
                                            </div>
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

                        {/* TAB: BADGES — player only */}
                        {isPlayer && activeTab === 'badges' && (
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
                                                                    league: c.leagues?.name || c.league || careerForm.league,
                                                                    club_id: c.id
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
                                                    <button
                                                        type="button"
                                                        onClick={handleCreateNewClub}
                                                        className="w-full p-3 bg-cyan-500/10 text-cyan-400 cursor-pointer font-bold text-xs hover:bg-cyan-500/20 flex items-center gap-2 rounded-lg transition"
                                                    >
                                                        <Plus size={14} /> "{careerClubSearch}" als neuen Verein anlegen
                                                    </button>
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
                                        <div className="grid grid-cols-2 gap-4 w-full">
                                            <div className="w-full">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Von *</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
                                                    <input
                                                        type="date"
                                                        value={careerForm.start_date}
                                                        onChange={e => setCareerForm({ ...careerForm, start_date: e.target.value })}
                                                        className={`${inputStyle} w-full pl-9 [color-scheme:dark]`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-full">
                                                <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Bis</label>
                                                <div className="relative">
                                                    <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${careerForm.is_current ? 'opacity-30' : ''}`} size={14} />
                                                    <input
                                                        type="date"
                                                        value={careerForm.end_date}
                                                        min={careerForm.start_date}
                                                        onChange={e => setCareerForm({ ...careerForm, end_date: e.target.value })}
                                                        className={`${inputStyle} w-full pl-9 [color-scheme:dark] ${careerForm.is_current ? 'opacity-50 cursor-not-allowed bg-slate-200/10' : ''}`}
                                                        disabled={careerForm.is_current}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {careerError && (
                                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                <p className="text-[11px] font-medium text-red-400 leading-tight">
                                                    {careerError}
                                                </p>
                                            </div>
                                        )}
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer py-1">
                                            <input
                                                type="checkbox"
                                                checked={careerForm.is_current}
                                                onChange={e => setCareerForm({ ...careerForm, is_current: e.target.checked, end_date: '' })}
                                                className="w-4 h-4 rounded border-border text-cyan-500 focus:ring-cyan-500"
                                            />
                                            Bis heute (aktueller Verein)
                                        </label>
                                        {isPlayer && (
                                            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={careerForm.is_captain ?? false}
                                                    onChange={e => handleCaptainToggle(e.target.checked)}
                                                    className="w-4 h-4 rounded border-border text-cyan-500 focus:ring-cyan-500"
                                                />
                                                Ich bin/war Kapitän dieses Teams (©)
                                            </label>
                                        )}
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

                                        {checkIfPremium(careerForm.league, careerForm.club_name) && (
                                            <div className="p-3 mb-4 bg-green-900/30 border border-green-600 rounded-lg animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Award size={18} className="text-green-400" />
                                                    <span className="font-bold text-green-400 uppercase text-sm tracking-wide">Elite-Station erkannt!</span>
                                                </div>
                                                <p className="text-xs text-green-300/80 leading-snug">
                                                    Diese Angabe erfüllt unsere Premium-Kriterien. Nach dem Speichern wird sie zur offiziellen Verifizierung vorgemerkt.
                                                </p>
                                            </div>
                                        )}

                                        {/* Opt-In: Transfer Post */}
                                        <div className="p-3 bg-slate-100/50 dark:bg-zinc-800/30 border border-border rounded-xl">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={careerForm.wants_transfer_post}
                                                    onChange={e => setCareerForm({ ...careerForm, wants_transfer_post: e.target.checked })}
                                                    className="w-5 h-5 mt-0.5 rounded border-border text-cyan-500 focus:ring-cyan-500 shrink-0"
                                                />
                                                <div>
                                                    <span className="text-sm font-bold text-foreground block">Wechsel als "Done Deal" Beitrag teilen</span>
                                                    <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">Nach erfolgreicher Verifizierung wird automatisch ein Transfer-Post in deinem Feed erstellt.</span>
                                                </div>
                                            </label>
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
                                                        {entry.verification_status === 'approved' ? (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-bold uppercase tracking-widest rounded border border-green-500/20 ml-2 shadow-sm shadow-green-500/5">
                                                                <CheckCircle size={10} />
                                                                Verifiziert
                                                            </div>
                                                        ) : entry.verification_status === 'pending' ? (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-widest rounded border border-amber-500/20 ml-2 shadow-sm shadow-amber-500/5">
                                                                <Clock size={10} />
                                                                Ausstehend
                                                            </div>
                                                        ) : entry.is_verified ? (
                                                            <span className="text-emerald-400 ml-2" title="Station Verifiziert"><CheckCircle size={14} /></span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {entry.league && `${entry.league} · `}
                                                        {entry.start_date ? new Date(entry.start_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '?'}
                                                        {' – '}
                                                        {entry.end_date ? new Date(entry.end_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : 'Heute'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => startEditCareer(entry)} className="p-1.5 rounded-lg hover:bg-white/10 transition text-muted-foreground hover:text-foreground">
                                                        <Edit size={14} />
                                                    </button>
                                                    {entry.verification_status !== 'approved' && (
                                                        <button type="button" onClick={() => handleCareerDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-muted-foreground hover:text-red-400">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
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
                    </SafeErrorBoundary>

                    {isAdmin && (
                        <div className="px-4 pb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (onAdminHubReq) onAdminHubReq();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 border border-slate-800 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:border-cyan-500/50 rounded-2xl transition-all group relative overflow-hidden mt-4"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <Shield size={20} className="text-cyan-400" />
                                <span className="font-black tracking-widest text-white uppercase text-sm">CAVIO Command Center</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-8 pt-2">
                    {activeTab === 'sport' && isElite && (
                        <div className="p-3 mb-4 bg-green-900/30 border border-green-600 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Award size={18} className="text-green-400" />
                                <span className="font-bold text-green-400 uppercase text-sm tracking-wide">Elite-Station erkannt!</span>
                            </div>
                            <p className="text-xs text-green-300/80 leading-snug">
                                Diese Angabe erfüllt unsere Premium-Kriterien. Nach dem Speichern wird sie zur offiziellen Verifizierung vorgemerkt.
                            </p>
                        </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center opacity-50">Änderungen werden nach dem Speichern sofort übernommen.</p>
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
                        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                            Möchtest du deinen Wechsel offiziell im Feed teilen? Der Beitrag wird automatisch veröffentlicht, sobald ein Admin deine Station verifiziert hat.
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        // Find the latest career station for this user that matches the new club
                                        const { data: station } = await supabase
                                            .from('career_history')
                                            .select('id')
                                            .eq('user_id', profile.user_id)
                                            .eq('club_name', transferData.new_club_name)
                                            .order('created_at', { ascending: false })
                                            .limit(1)
                                            .maybeSingle();

                                        if (station) {
                                            const { error: updErr } = await supabase
                                                .from('career_history')
                                                .update({ 
                                                    wants_transfer_post: true,
                                                    verification_status: 'pending' 
                                                })
                                                .eq('id', station.id);
                                            if (updErr) throw updErr;
                                            addToast("Transfer-Wunsch gespeichert! Der Post erscheint nach der Verifizierung. 🎉", "success");
                                        } else {
                                            // Failsafe: if no station was found, we just let it be. 
                                            // The user can still check the box in the career history form.
                                            addToast("Profil aktualisiert. Erstelle einen Eintrag in deiner Historie, um den Transfer zu verkünden.", "info");
                                        }
                                    } catch(e) {
                                        addToast("Fehler: " + e.message, "error");
                                    } finally {
                                        setLoading(false);
                                        setShowTransferModal(false);
                                        onClose();
                                    }
                                }}
                                className={`${btnPrimary} w-full py-4 text-base shadow-lg shadow-blue-500/20 active:scale-95 transition-all`}
                            >
                                <div className="flex items-center justify-center">
                                    {loading && <Loader2 className="animate-spin mr-2" size={20} />}
                                    <span className="text-white font-bold">Ja, als Done Deal markieren</span>
                                </div>
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

            {/* Suggest Club Modal */}
            {showSuggestModal && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-zinc-900 border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-black text-foreground tracking-tight">Verein vorschlagen</h2>
                                    <p className="text-xs text-muted-foreground mt-1 font-medium">Hilf uns, die Vereins-Datenbank aktuell zu halten.</p>
                                </div>
                                <button onClick={() => setShowSuggestModal(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Vereinsname</label>
                                    <input 
                                        value={suggestForm.name} 
                                        onChange={e => setSuggestForm({ ...suggestForm, name: e.target.value })} 
                                        className={inputStyle} 
                                        placeholder="z.B. FC Beispielstadt" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Stadt *</label>
                                    <input 
                                        value={suggestForm.city} 
                                        onChange={e => setSuggestForm({ ...suggestForm, city: e.target.value })} 
                                        className={inputStyle} 
                                        placeholder="z.B. Berlin" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase ml-1 mb-1 block">Liga (Optional)</label>
                                    <input 
                                        value={suggestForm.league} 
                                        onChange={e => setSuggestForm({ ...suggestForm, league: e.target.value })} 
                                        className={inputStyle} 
                                        placeholder="z.B. Kreisliga A" 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setShowSuggestModal(false)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-border font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                                >
                                    Abbrechen
                                </button>
                                <button 
                                    onClick={handleCreateClub}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Vorschlagen
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Unsaved Changes Warning Modal */}
            <AnimatePresence>
                {showCloseWarning && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="text-amber-500" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-foreground">Ungespeicherte Änderungen</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden. Möchtest du das Fenster wirklich schließen?</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={confirmClose}
                                        className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition shadow-lg shadow-rose-500/20 active:scale-95"
                                    >
                                        Ja, Änderungen verwerfen
                                    </button>
                                    <button 
                                        onClick={() => setShowCloseWarning(false)}
                                        className="w-full py-4 rounded-2xl bg-white/5 border border-border font-bold text-sm hover:bg-white/10 transition"
                                    >
                                        Weiter bearbeiten
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
