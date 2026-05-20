import React, { useEffect, useState, useCallback } from 'react';
import { 
    ShieldAlert, X, Shield, Flag, CheckCircle, AlertTriangle, Loader2, 
    Trash2, Menu, Video, MessageSquare, TrendingUp, Users, AlertOctagon, 
    UserCheck, Trophy, Building, User, Check, ShieldCheck, XCircle, BarChart,
    Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { NotificationBell } from './NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import AdminRequestDetailView from './AdminRequestDetailView';
import { AdminUserIntelligence } from './AdminUserIntelligence';
import { AdminClubAuthority } from './AdminClubAuthority';
import { ChevronRight, Calendar, ChevronLeft, Flame, Sparkles, Rocket, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import * as api from '../lib/api';
import { createNotification } from '../lib/api';
import { getCountryFlag, getCountryNameOnly } from '../lib/countries';

const TARGET_TYPE_LABELS = {
    profile: 'Profil',
    video: 'Video',
    comment: 'Kommentar',
    message: 'Nachricht',
    user: 'Benutzer',
    post: 'Beitrag',
};

// Premium Skeleton Loader Component
const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

// Premium Empty State Component
const PremiumEmptyState = ({ icon: Icon, title, message }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
        <div className="w-20 h-20 bg-zinc-900 text-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Icon size={40} />
        </div>
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 font-medium max-w-xs">{message}</p>
    </div>
);

const AdminDashboard = ({ onClose, onMenuOpen }) => {
    const { currentUserProfile } = useUser();
    const { addToast } = useToast();

    // --- CRITICAL DATA-FIRST RULE ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('dashboard');
    
    const [stats, setStats] = useState({
        openReports: 0,
        newUsers24h: 0,
        newVideos24h: 0,
        pendingAccounts: 0,
        pendingClaims: 0,
        pendingCareers: 0,
        pendingNationality: 0,
        totalUsers: 0
    });
    
    const [reports, setReports] = useState([]);
    const [pendingAccountsList, setPendingAccountsList] = useState([]);
    const [pendingCareersList, setPendingCareersList] = useState([]);
    const [pendingClaimsList, setPendingClaimsList] = useState([]);
    const [pendingNationalityList, setPendingNationalityList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReportGroup, setSelectedReportGroup] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [curationItems, setCurationItems] = useState([]);
    const [isCurationLoading, setIsCurationLoading] = useState(false);

    const loadData = useCallback(async () => {
        if (currentUserProfile?.role !== 'admin') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            // 1. Fetch Metrics & Pending Data
            const [usersRes, videosRes, reportsRes, accountsRes, claimsRes, careersRes, clubPendingRes, totalUsersRes, nationalityRes] = await Promise.all([
                supabase.from('players_master').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
                supabase.from('media_highlights').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
                supabase.from('reports').select('*').order('created_at', { ascending: false }),
                supabase.from('players_master').select('id, full_name, username, role, avatar_url, created_at, verification_status').eq('verification_status', 'pending').order('created_at', { ascending: false }),
                supabase.from('club_claims').select('*, clubs(name)').eq('status', 'pending').order('created_at', { ascending: false }),
                supabase.from('career_history').select('*').eq('verification_status', 'pending').order('created_at', { ascending: false }),
                supabase.from('players_master').select('id, full_name, username, role, avatar_url, created_at, club_verification_status, pending_club_id, clubs(name)').eq('club_verification_status', 'pending').order('created_at', { ascending: false }),
                supabase.from('players_master').select('*', { count: 'exact', head: true }),
                supabase.from('nationality_verifications').select('*').eq('status', 'pending').order('created_at', { ascending: false })
            ]);

            const rolePending = (accountsRes.data || []).map(u => ({ ...u, type: 'role' }));
            const clubPending = (clubPendingRes.data || []).map(u => ({ ...u, type: 'club' }));
            const allPendingAccounts = [...rolePending, ...clubPending];
            
            setPendingAccountsList(allPendingAccounts);
            
            const fetchedNationality = nationalityRes.data || [];
            
            const allReports = reportsRes.data || [];
            
            // Group reports by target
            const groups = {};
            allReports.forEach(r => {
                if (!groups[r.target_id]) {
                    groups[r.target_id] = {
                        target_id: r.target_id,
                        target_type: r.target_type,
                        reports: [],
                        status: r.status,
                        targetData: null,
                        report_count: 0
                    };
                }
                groups[r.target_id].reports.push(r);
                if (r.status === 'pending') groups[r.target_id].status = 'pending';
            });

            const groupedList = Object.values(groups);
            const pendingGroups = groupedList.filter(g => g.status === 'pending');

            const fetchedCareers = careersRes.data || [];
            const fetchedClaims = claimsRes.data || [];
            
            setPendingCareersList(fetchedCareers);
            setPendingClaimsList(fetchedClaims);

            // Update Stats including Notification Badges
            setStats({
                openReports: pendingGroups.length,
                newUsers24h: usersRes.count || 0,
                newVideos24h: videosRes.count || 0,
                pendingAccounts: allPendingAccounts.length,
                pendingClaims: fetchedClaims.length,
                pendingCareers: fetchedCareers.length,
                pendingNationality: fetchedNationality.length,
                totalUsers: totalUsersRes.count || 0
            });

            // 1. Fetch Target Data (Videos, Comments, Profiles, Posts)
            const videoIds = pendingGroups.filter(g => g.target_type === 'video').map(g => g.target_id);
            const commentIds = pendingGroups.filter(g => g.target_type === 'comment').map(g => g.target_id);
            const profileIds = pendingGroups.filter(g => g.target_type === 'profile' || g.target_type === 'user').map(g => g.target_id);
            const postIds = pendingGroups.filter(g => g.target_type === 'post').map(g => g.target_id);

            const [videos, comments, profiles, posts] = await Promise.all([
                videoIds.length > 0 ? supabase.from('media_highlights').select('id, description, video_url, thumbnail_url, player_id, report_count').in('id', videoIds) : Promise.resolve({ data: [] }),
                commentIds.length > 0 ? supabase.from('media_comments').select('id, content, video_id, user_id, report_count').in('id', commentIds) : Promise.resolve({ data: [] }),
                profileIds.length > 0 ? supabase.from('players_master').select('id, full_name, username, avatar_url, role, created_at, report_count').in('id', profileIds) : Promise.resolve({ data: [] }),
                postIds.length > 0 ? supabase.from('posts').select('id, content, type, user_id, metadata').in('id', postIds) : Promise.resolve({ data: [] })
            ]);

            // 2. Fetch Creator Profiles & Reporter Profiles for Dossier (Area A)
            const careerUserIds = [...new Set(fetchedCareers.map(c => c.user_id))];
            const claimUserIds = [...new Set(fetchedClaims.map(c => c.user_id))];
            const nationalityUserIds = [...new Set(fetchedNationality.map(n => n.user_id))];
            const videoCreatorIds = (videos.data || []).map(v => v.player_id);
            const commentCreatorIds = (comments.data || []).map(c => c.user_id);
            const postCreatorIds = (posts.data || []).map(p => p.user_id);
            const reporterIds = allReports.map(r => r.reporter_id).filter(Boolean);

            const allUserIds = [...new Set([
                ...careerUserIds, 
                ...claimUserIds, 
                ...nationalityUserIds,
                ...videoCreatorIds, 
                ...commentCreatorIds, 
                ...postCreatorIds,
                ...reporterIds
            ])];

            const { data: userProfilesRes } = await (allUserIds.length > 0 
                ? supabase.from('players_master').select('user_id, id, full_name, username, avatar_url, role, created_at').in('user_id', allUserIds) 
                : Promise.resolve({ data: [] }));

            const videoMap = (videos.data || []).reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
            const commentMap = (comments.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
            const profileMap = (profiles.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            const postMap = (posts.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            const userProfileMap = (userProfilesRes || []).reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});

            const enrichedCareers = fetchedCareers.map(c => ({
                ...c,
                profile: userProfileMap[c.user_id] || null
            }));
            setPendingCareersList(enrichedCareers);

            const enrichedClaims = fetchedClaims.map(c => ({
                ...c,
                profile: userProfileMap[c.user_id] || null
            }));
            setPendingClaimsList(enrichedClaims);

            const enrichedNationality = fetchedNationality.map(n => ({
                ...n,
                profile: userProfileMap[n.user_id] || null
            }));
            setPendingNationalityList(enrichedNationality);

            const enrichedGroups = pendingGroups.map(group => {
                let targetData = null;
                if (group.target_type === 'video') targetData = videoMap[group.target_id];
                else if (group.target_type === 'comment') targetData = commentMap[group.target_id];
                else if (group.target_type === 'profile' || group.target_type === 'user') targetData = profileMap[group.target_id];
                else if (group.target_type === 'post') targetData = postMap[group.target_id];

                // Determine profile for Area A (gemeldeter User) in detail view
                let profile = null;
                if (group.target_type === 'profile' || group.target_type === 'user') profile = targetData;
                else if (group.target_type === 'video') profile = userProfileMap[targetData?.player_id];
                else if (group.target_type === 'comment') profile = userProfileMap[targetData?.user_id];
                else if (group.target_type === 'post') profile = userProfileMap[targetData?.user_id];

                const enrichedReports = group.reports.map(r => ({
                    ...r,
                    reporterProfile: userProfileMap[r.reporter_id] || null
                }));

                return {
                    ...group,
                    reports: enrichedReports,
                    targetData,
                    profile,
                    report_count: targetData?.report_count || group.reports.length
                };
            });

            setReports(enrichedGroups);
        } catch (error) {
            console.error("Admin Command Center Fetch Error:", error);
            addToast(`Fehler beim Laden: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUserProfile, addToast]);

    const loadCurationData = useCallback(async () => {
        setIsCurationLoading(true);
        try {
            const [highlightsRes, postsRes] = await Promise.all([
                supabase.from('media_highlights')
                    .select('*, players_master(*)')
                    .eq('is_archived', false)
                    .eq('is_under_review', false)
                    .order('created_at', { ascending: false })
                    .limit(30),
                supabase.from('posts')
                    .select('*, players_master(*)')
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(30)
            ]);

            const combined = [
                ...(highlightsRes.data || []).map(h => ({ ...h, type: 'video' })),
                ...(postsRes.data || []).map(p => ({ ...p, type: 'post' }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setCurationItems(combined);
        } catch (error) {
            console.error("Curation Fetch Error:", error);
            addToast(`Fehler beim Laden der Curation: ${error.message}`, 'error');
        } finally {
            setIsCurationLoading(false);
        }
    }, [addToast]);

    const handleToggleBoost = async (item) => {
        const newBoostState = !item.is_admin_boosted;
        
        setCurationItems(prev => prev.map(x => x.id === item.id && x.type === item.type ? { ...x, is_admin_boosted: newBoostState } : x));
        
        try {
            await api.updateContentBoost(item.id, item.type, newBoostState);
            addToast(newBoostState ? 'Inhalt erfolgreich geboostet! 🚀' : 'Boost entfernt.', 'success');
        } catch (error) {
            console.error("Boost Update Error:", error);
            addToast(`Fehler beim Boosten: ${error.message}`, 'error');
            setCurationItems(prev => prev.map(x => x.id === item.id && x.type === item.type ? { ...x, is_admin_boosted: !newBoostState } : x));
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (activeView === 'content-curation') {
            loadCurationData();
        }
    }, [activeView, loadCurationData]);

    const handleReportAction = async (e, reportGroup, action) => {
        if (e && e.stopPropagation) e.stopPropagation();

        let title = '', message = '', confirmText = '', confirmClass = '';

        if (action === 'dismiss') {
            title = 'Meldung verwerfen?';
            message = 'Alle Meldungen für diesen Inhalt werden als erledigt markiert. Der Post bleibt online.';
            confirmText = 'Verwerfen';
            confirmClass = 'bg-zinc-700 hover:bg-zinc-600';
        } else if (action === 'takedown') {
            title = 'Inhalt entfernen (Takedown)?';
            message = 'Möchtest du diesen Inhalt per Soft-Delete aus dem Feed der Community entfernen?';
            confirmText = 'Löschen / Takedown';
            confirmClass = 'bg-red-600 hover:bg-red-500';
        } else if (action === 'warn_and_takedown') {
            title = 'Ersteller verwarnen & Inhalt entfernen?';
            message = 'Der Inhalt wird per Takedown entfernt und dem Ersteller wird ein offizielles Verwarnungs-Dossier hinterlegt.';
            confirmText = 'Verwarnen & Takedown';
            confirmClass = 'bg-amber-600 hover:bg-amber-500';
        }

        setConfirmAction({
            title, message, confirmText, confirmClass,
            onConfirm: async () => {
                // Optimistic UI Update
                setReports(prev => prev.filter(g => g.target_id !== reportGroup.target_id));
                setStats(prev => ({ ...prev, openReports: Math.max(0, prev.openReports - 1) }));
                setConfirmAction(null);

                try {
                    const targetTable = reportGroup.target_type === 'video' ? 'media_highlights' : 
                                       reportGroup.target_type === 'comment' ? 'media_comments' : 
                                       reportGroup.target_type === 'post' ? 'posts' : 'players_master';

                    // 1. Perform Takedowns / Soft-Deletes / Discards
                    if (action === 'takedown' || action === 'warn_and_takedown') {
                        if (targetTable === 'posts') {
                            const { error: postErr } = await supabase.from('posts').update({ is_deleted: true }).eq('id', reportGroup.target_id);
                            if (postErr) throw postErr;
                        } else if (targetTable === 'media_highlights') {
                            const { error: vidErr } = await supabase.from('media_highlights').update({ is_archived: true }).eq('id', reportGroup.target_id);
                            if (vidErr) throw vidErr;

                            // Send removal notification
                            if (reportGroup.targetData?.player_id) {
                                try {
                                    await api.createNotification({
                                        userId: reportGroup.targetData.player_id,
                                        actorId: currentUserProfile?.id,
                                        type: 'video_removed',
                                        message: 'Dein Video wurde aufgrund von Community-Meldungen entfernt.',
                                        videoId: reportGroup.target_id
                                    });
                                } catch (e) {
                                    console.warn('Could not send removal notification', e);
                                }
                            }
                        } else if (targetTable === 'media_comments') {
                            const { error: comErr } = await supabase.from('media_comments').delete().eq('id', reportGroup.target_id);
                            if (comErr) throw comErr;
                        } else if (targetTable === 'players_master') {
                            const { error: profErr } = await supabase.from('players_master').update({ verification_status: 'rejected' }).eq('id', reportGroup.target_id);
                            if (profErr) throw profErr;
                        }

                        // Log user warning if selected
                        if (action === 'warn_and_takedown' && reportGroup.profile?.id) {
                            const warningText = `Inhalts-Takedown (${TARGET_TYPE_LABELS[reportGroup.target_type] || 'Inhalt'}): "${
                                reportGroup.targetData?.content || reportGroup.targetData?.description || 'Verstoß gegen Richtlinien'
                            }"`;
                            
                            const { error: warnErr } = await supabase.from('user_warnings').insert({
                                user_id: reportGroup.profile.id,
                                reason: warningText,
                                admin_id: currentUserProfile?.id
                            });
                            if (warnErr) throw warnErr;
                        }
                    } else if (action === 'dismiss') {
                        if (targetTable === 'media_highlights' || targetTable === 'media_comments') {
                            await supabase.from(targetTable).update({ is_under_review: false, report_count: 0 }).eq('id', reportGroup.target_id);
                        }
                    }

                    // 2. Mark report status as resolved in Supabase
                    const { error: repErr } = await supabase.from('reports').update({ status: 'resolved' }).eq('target_id', reportGroup.target_id);
                    if (repErr) throw repErr;

                    addToast(action === 'dismiss' ? 'Meldungen verworfen' : 'Inhalt erfolgreich entfernt', 'success');
                    loadData();
                } catch (error) {
                    console.error("Moderation execution failure:", error);
                    addToast(`Fehler: ${error.message}`, 'error');
                    loadData(); // Revert optimistic update on failure
                }
            }
        });
    };

    const handleAccountAction = async (account, action) => {
        // Optimistic UI Update
        setPendingAccountsList(prev => prev.filter(a => a.id !== account.id));
        setStats(prev => ({ ...prev, pendingAccounts: Math.max(0, prev.pendingAccounts - 1) }));

        try {
            if (account.type === 'club') {
                if (action === 'approve') {
                    const { error } = await supabase.from('players_master')
                        .update({ 
                            club_verification_status: 'approved'
                        })
                        .eq('id', account.id);
                    if (error) throw error;
                    addToast(`Verein für ${account.full_name} freigegeben`, 'success');
                } else {
                    const { error } = await supabase.from('players_master')
                        .update({ 
                            club_verification_status: 'rejected'
                        })
                        .eq('id', account.id);
                    if (error) throw error;
                    addToast(`Vereins-Update für ${account.full_name} abgelehnt`, 'info');
                }
            } else {
                const newStatus = action === 'approve' ? 'approved' : 'rejected';
                const { error } = await supabase
                    .from('players_master')
                    .update({ 
                        verification_status: newStatus,
                        is_verified: action === 'approve'
                    })
                    .eq('id', account.id);
                
                if (error) throw error;
                addToast(`Anfrage erfolgreich ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`, 'success');
            }
            loadData();
        } catch (error) {
            addToast(`Fehler: ${error.message}`, 'error');
            loadData(); // Revert optimistic update on failure
        }
    };

    const handleCareerAction = async (career, action) => {
        try {
            // --- CAPTAIN REJECTION: Separate path to preserve club membership ---
            if (career.is_captain_request && action === 'reject') {
                // Only reset captain flags; do NOT touch verification_status
                const { error: captainRejectError } = await supabase
                    .from('career_history')
                    .update({
                        is_captain_request: false,
                        is_captain: false
                    })
                    .eq('id', career.id);

                if (captainRejectError) throw captainRejectError;

                // Send captain rejection notification
                try {
                    const { data: profileData } = await supabase
                        .from('players_master')
                        .select('id')
                        .eq('user_id', career.user_id)
                        .maybeSingle();

                    const recipientId = profileData?.id || career.profile?.id;

                    if (recipientId) {
                        await createNotification({
                            userId: recipientId,
                            actorId: currentUserProfile?.id,
                            type: 'system_alert',
                            message: "Deine Anfrage für die Kapitänsbinde deines Vereins wurde vom System-Admin abgelehnt. Bei Fragen wende dich bitte an den CAVIO Support.",
                            entityId: career.id
                        });
                    }
                } catch (notifErr) {
                    console.warn('Could not send captain rejection notification:', notifErr);
                }

                // Update local state
                setPendingCareersList(prev => prev.filter(c => c.id !== career.id));
                setStats(prev => ({ ...prev, pendingCareers: Math.max(0, prev.pendingCareers - 1) }));

                addToast('Kapitäns-Antrag abgelehnt und Spieler benachrichtigt', 'success');
                return;
            }

            // --- STANDARD PATH: Regular career station approve/reject ---
            const newStatus = action === 'approve' ? 'approved' : 'rejected';

            // 1. Perform the update in Supabase FIRST
            const updatePayload = {
                verification_status: newStatus, 
                is_verified: action === 'approve' 
            };

            if (career.is_captain_request) {
                updatePayload.is_captain_request = false;
                updatePayload.is_captain = true;
            }

            const { error: updateError } = await supabase
                .from('career_history')
                .update(updatePayload)
                .eq('id', career.id);

            if (updateError) throw updateError;

            // Auto-Sync: If approved and it's a current station, update the profile's club_id
            if (action === 'approve' && !career.end_date && career.club_id) {
                try {
                    await supabase
                        .from('players_master')
                        .update({ club_id: career.club_id })
                        .eq('user_id', career.user_id);
                    console.log('Profile club_id synced from verified career station');
                } catch (syncErr) {
                    console.warn('Could not sync profile club_id:', syncErr);
                }

                // Single Active Captain Rule: If the approved station has is_captain === true, demote other active captains
                const willBeCaptain = career.is_captain || (career.is_captain_request && action === 'approve');
                if (willBeCaptain) {
                    try {
                        await supabase
                            .from('career_history')
                            .update({ is_captain: false })
                            .eq('club_id', career.club_id)
                            .is('end_date', null)
                            .eq('verification_status', 'approved')
                            .neq('id', career.id);
                        console.log('Other active captains demoted for club:', career.club_id);
                    } catch (demotionErr) {
                        console.warn('Could not demote other captains:', demotionErr);
                    }
                }
            }

            // 2. Send verification notification to the user
            if (action === 'approve') {
                try {
                    const { data: profileData } = await supabase
                        .from('players_master')
                        .select('id')
                        .eq('user_id', career.user_id)
                        .maybeSingle();

                    const recipientId = profileData?.id || career.profile?.id;

                    if (recipientId) {
                        if (career.is_captain_request) {
                            await createNotification({
                                userId: recipientId,
                                actorId: currentUserProfile?.id,
                                type: 'system_success',
                                message: `Glückwunsch! Deine Anfrage wurde bestätigt. Du trägst nun offiziell die digitale Kapitänsbinde für ${career.club_name}. 👑`,
                                entityId: career.id 
                            });
                        } else {
                            await createNotification({
                                userId: recipientId,
                                actorId: currentUserProfile?.id,
                                type: 'verification_success',
                                message: `Deine Karriere-Station bei "${career.club_name}" wurde erfolgreich verifiziert! 🎉`,
                                entityId: career.id 
                            });
                        }
                    }
                } catch (notifErr) {
                    console.warn('Could not send verification notification:', notifErr);
                }
            }

            // 3. Update local state ONLY after successful database update
            setPendingCareersList(prev => prev.filter(c => c.id !== career.id));
            setStats(prev => ({ ...prev, pendingCareers: Math.max(0, prev.pendingCareers - 1) }));

            addToast(`Karriere-Station ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`, 'success');
        } catch (error) {
            console.error("Career Action Error:", error);
            addToast(`Fehler: ${error.message}`, 'error');
            loadData();
        }
    };

    const handleClaimAction = async (claim, action) => {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        try {
            const { error: updateError } = await supabase
                .from('club_claims')
                .update({ status: newStatus })
                .eq('id', claim.id);

            if (updateError) throw updateError;

            if (action === 'approve') {
                // Also update the profile to set is_official and club_id
                const { error: profileError } = await supabase
                    .from('players_master')
                    .update({ 
                        is_official: true,
                        club_id: claim.club_id
                    })
                    .eq('user_id', claim.user_id);
                
                if (profileError) throw profileError;
            }

            setPendingClaimsList(prev => prev.filter(c => c.id !== claim.id));
            setStats(prev => ({ ...prev, pendingClaims: Math.max(0, prev.pendingClaims - 1) }));

            addToast(`Vereins-Claim ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`, 'success');
            loadData();
        } catch (error) {
            addToast(`Fehler: ${error.message}`, 'error');
        }
    };
    const handleNationalityAction = async (req, action) => {
        try {
            if (action === 'approve') {
                await api.approveNationalityVerification(req.id, currentUserProfile.id);
                addToast("Zweite Nationalität erfolgreich verifiziert! ✅", 'success');
            } else {
                await api.rejectNationalityVerification(req.id, currentUserProfile.id);
                addToast("Antrag abgelehnt. ❌", 'info');
            }
            setPendingNationalityList(prev => prev.filter(n => n.id !== req.id));
            setStats(prev => ({ ...prev, pendingNationality: Math.max(0, prev.pendingNationality - 1) }));
            loadData();
        } catch (error) {
            console.error("Nationality Action Error:", error);
            addToast(`Fehler: ${error.message}`, 'error');
        }
    };
    if (currentUserProfile?.role !== 'admin') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md">
                <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center">
                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white">Zugriff verweigert</h2>
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-full mt-6">Schließen</button>
                </div>
            </div>
        );
    }

    const MENU_ITEMS = [
        { id: 'dashboard', label: 'Übersicht', icon: Shield, badge: 0 },
        { id: 'status-freigaben', label: 'Status-Freigaben', icon: UserCheck, badge: stats.pendingAccounts },
        { id: 'karriere-stationen', label: 'Karriere-Stationen', icon: Trophy, badge: stats.pendingCareers },
        { id: 'vereins-rechte', label: 'Vereins-Rechte', icon: Building, badge: stats.pendingClaims },
        { id: 'nationality-verifications', label: 'Zweite Nationalität', icon: Globe, badge: stats.pendingNationality },
        { id: 'meldungen', label: 'Moderation Hub', icon: Flag, badge: stats.openReports },
        { id: 'content-curation', label: 'Content Curation', icon: Flame, badge: 0 },
        { id: 'user-intelligence', label: 'User Intelligence', icon: Users, badge: 0 },
        { id: 'club-authority', label: 'Club Authority', icon: ShieldCheck, badge: 0 },
        { id: 'analytics', label: 'Analytics', icon: BarChart, badge: 0 },
    ];

    const renderSkeletonList = () => (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl">
                    <SkeletonBlock className="w-12 h-12" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBlock className="w-24 h-3" />
                        <SkeletonBlock className="w-48 h-4" />
                        <SkeletonBlock className="w-32 h-3" />
                    </div>
                </div>
            ))}
        </div>
    );

    // --- Sub-Views ---
    const renderDashboardView = () => (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* KPI GRID */}
            <div>
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-1 flex items-center gap-2">
                    <Activity size={14} className="text-cyan-500" /> Live App-Gesundheit
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-bl-[80px] -z-10 transition-transform group-hover:scale-110" />
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                            <Users size={16} />
                        </div>
                        <p className="text-2xl font-black text-white">{isLoading ? <SkeletonBlock className="w-10 h-6" /> : stats.totalUsers}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Registrierte User</p>
                    </div>
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-bl-[80px] -z-10 transition-transform group-hover:scale-110" />
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-2">
                            <Trophy size={16} />
                        </div>
                        <p className="text-2xl font-black text-white">{isLoading ? <SkeletonBlock className="w-10 h-6" /> : stats.pendingCareers}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Offene Anträge</p>
                    </div>
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-[80px] -z-10 transition-transform group-hover:scale-110" />
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                            <AlertTriangle size={16} />
                        </div>
                        <p className="text-2xl font-black text-white">{isLoading ? <SkeletonBlock className="w-10 h-6" /> : stats.openReports}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Moderation Hub</p>
                    </div>
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-[80px] -z-10 transition-transform group-hover:scale-110" />
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                            <Video size={16} />
                        </div>
                        <p className="text-2xl font-black text-white">{isLoading ? <SkeletonBlock className="w-10 h-6" /> : stats.newVideos24h}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Content (24h)</p>
                    </div>
                </div>
            </div>

            {/* NAVIGATION GRID */}
            <div>
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pl-1 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-blue-500" /> Admin Module
                </h3>
                <div className="space-y-3">
                    <button onClick={() => setActiveView('status-freigaben')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <UserCheck size={20} className="text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Status-Freigaben</h4>
                                {stats.pendingAccounts > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingAccounts}</span>}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Scouts & Trainer verifizieren</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('karriere-stationen')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Trophy size={20} className="text-yellow-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Karriere-Stationen</h4>
                                {stats.pendingCareers > 0 && <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingCareers}</span>}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Eingereichte Stationen prüfen</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('vereins-rechte')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Building size={20} className="text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Vereins-Rechte</h4>
                                {stats.pendingClaims > 0 && <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingClaims}</span>}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Manager-Anträge verwalten</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('nationality-verifications')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Globe size={20} className="text-teal-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Zweite Nationalität</h4>
                                {stats.pendingNationality > 0 && <span className="bg-teal-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingNationality}</span>}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Staatsbürgerschafts-Nachweise prüfen</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('meldungen')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Flag size={20} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Content Moderation Hub</h4>
                                {stats.openReports > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.openReports}</span>}
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Reports & Takedowns verwalten</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('content-curation')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Flame size={20} className="text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Content Curation</h4>
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Algorithmus-Booster & Heating</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('user-intelligence')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <Users size={20} className="text-cyan-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">User Intelligence</h4>
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">Nutzerverwaltung & Rollen</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    <button onClick={() => setActiveView('club-authority')} className="w-full flex items-center p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                            <ShieldCheck size={20} className="text-teal-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">Club Authority</h4>
                            </div>
                            <p className="text-zinc-500 text-xs mt-0.5">SSOT Vereins-Datenbank</p>
                        </div>
                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderMeldungenView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <Flag size={16} className="text-red-500" />
                Moderation Hub Queue
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : reports.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Plattform ist sauber" 
                    message="Es gibt aktuell keine offenen Meldungen. Alle Inhalte wurden geprüft." 
                />
            ) : (
                <div className="space-y-3">
                    {reports.map(group => {
                        const isQuarantine = group.report_count >= 5;
                        const firstReport = group.reports[0];
                        const reporterName = firstReport?.reporterProfile?.full_name || 'Anonymer User';
                        
                        return (
                            <div 
                                key={group.target_id} 
                                onClick={() => {
                                    setSelectedRequest(group);
                                    setSelectedRequestType('report');
                                }}
                                className="flex items-center justify-between p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-800 transition w-full group"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                                        {group.target_type === 'video' && group.targetData?.thumbnail_url ? (
                                            <img src={group.targetData.thumbnail_url} className="w-full h-full object-cover" />
                                        ) : group.target_type === 'video' ? (
                                            <Video size={18} className="text-zinc-600" />
                                        ) : group.target_type === 'comment' ? (
                                            <MessageSquare size={18} className="text-zinc-600" />
                                        ) : group.target_type === 'post' ? (
                                            <MessageSquare size={18} className="text-zinc-600" />
                                        ) : (
                                            <User size={18} className="text-zinc-600" />
                                        )}
                                    </div>

                                    <div className="flex flex-col min-w-0 w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                                {TARGET_TYPE_LABELS[group.target_type] || 'Inhalt'}
                                            </span>
                                            {isQuarantine && (
                                                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded border border-red-500/20">
                                                    QUARANTÄNE
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-white text-base truncate">
                                            {group.target_type === 'comment' ? group.targetData?.content : 
                                             group.target_type === 'post' ? group.targetData?.content : 
                                             (group.targetData?.description || group.targetData?.full_name || 'Unbekannter Inhalt')}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                            <span className="text-indigo-400 font-bold">Ersteller:</span> {group.profile?.full_name || 'Unbekannt'} • <span className="text-zinc-500 font-bold">Gemeldet von:</span> {reporterName}
                                        </p>
                                        <p className="text-[11px] text-zinc-500 italic mt-0.5 truncate">
                                            "{firstReport?.reason || 'Kein Grund angegeben'}"
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 pl-2">
                                    <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderAnalyticsView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <BarChart size={16} className="text-purple-500" />
                Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                        <Users size={20} />
                    </div>
                    <p className="text-4xl font-black text-white mb-1">
                        {isLoading ? <SkeletonBlock className="w-16 h-8" /> : `+${stats.newUsers24h}`}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Neuanmeldungen 24h</p>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-4xl font-black text-white mb-1">
                        {isLoading ? <SkeletonBlock className="w-16 h-8" /> : `+${stats.newVideos24h}`}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Video-Uploads 24h</p>
                </div>
            </div>
        </div>
    );

    const renderAccountsView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <UserCheck size={16} className="text-blue-500" />
                Ausstehende Verifizierungen
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : pendingAccountsList.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Keine offenen Freigaben" 
                    message="Alle Scouts und Trainer wurden verifiziert. Aktuell gibt es keine neuen Anfragen." 
                />
            ) : (
                <div className="space-y-3">
                    {pendingAccountsList.map(account => (
                        <div 
                            key={account.id} 
                            onClick={() => {
                                setSelectedRequest(account);
                                setSelectedRequestType('account');
                            }}
                            className="flex items-center justify-between p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-800 transition w-full group"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center">
                                    {account.avatar_url ? (
                                        <img src={account.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black text-zinc-500">
                                            {account.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0 w-full">
                                    <div className="flex items-center mb-1">
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${
                                            account.type === 'club' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                            {account.type === 'club' ? 'VEREINS-UPDATE' : (account.role === 'scout' ? 'SCOUT' : 'TRAINER') + '-ANFRAGE'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white text-base truncate">{account.full_name}</h4>
                                    <p className="text-sm text-gray-400 truncate mt-0.5">
                                        {account.type === 'club' ? `Anfrage für "${account.clubs?.name}"` : `@${account.username}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-shrink-0 pl-2">
                                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderCareersView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <Trophy size={16} className="text-yellow-500" />
                Ausstehende Karriere-Stationen
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : pendingCareersList.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Alle Stationen geprüft" 
                    message="Es gibt keine offenen Karriere-Stationen zur Verifizierung." 
                />
            ) : (
                <div className="space-y-3">
                    {pendingCareersList.map(career => (
                        <div 
                            key={career.id} 
                            onClick={() => {
                                setSelectedRequest(career);
                                setSelectedRequestType('career');
                            }}
                            className="flex items-center justify-between p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-800 transition w-full group"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center">
                                    {career.profile?.avatar_url ? (
                                        <img src={career.profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black text-zinc-500">
                                            {career.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col min-w-0 w-full">
                                    <div className="flex items-center mb-1">
                                        {career.is_captain_request ? (
                                            <span className="text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                                👑 KAPITÄNS-ANTRAG
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                                                {career.profile?.role === 'player' ? 'SPIELER-STATION' : 'STAFF-STATION'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold text-white text-base truncate">{career.profile?.full_name || 'Unbekannt'}</span>
                                    {career.is_captain_request ? (
                                        <span className="text-sm text-amber-400/90 font-bold truncate mt-0.5 flex items-center gap-1">
                                            👑 Beantragt Kapitäns-Rolle für {career.club_name}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 truncate mt-0.5">
                                            {career.club_name} {career.position ? `- ${career.position}` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 pl-2">
                                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderClaimsView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <Building size={16} className="text-indigo-500" />
                Vereins-Rechte
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : pendingClaimsList.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Keine offenen Claims" 
                    message="Aktuell gibt es keine Anfragen für Vereins-Inhaberschaften." 
                />
            ) : (
                <div className="space-y-3">
                    {pendingClaimsList.map(claim => (
                        <div 
                            key={claim.id} 
                            onClick={() => {
                                setSelectedRequest(claim);
                                setSelectedRequestType('claim');
                            }}
                            className="flex items-center justify-between p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-800 transition w-full group"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center">
                                    {claim.profile?.avatar_url ? (
                                        <img src={claim.profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black text-zinc-500">
                                            {claim.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0 w-full">
                                    <div className="flex items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                            VEREINS-CLAIM
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white text-base truncate">{claim.clubs?.name}</h4>
                                    <p className="text-sm text-gray-400 truncate mt-0.5">Eingereicht von: {claim.profile?.full_name}</p>
                                </div>
                            </div>

                            <div className="flex-shrink-0 pl-2">
                                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderNationalityView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <Globe size={16} className="text-teal-400" />
                Zweite Nationalität Freigaben
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : pendingNationalityList.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Keine ausstehenden Freigaben" 
                    message="Alle eingereichten Reisepässe wurden geprüft. Aktuell gibt es keine neuen Anfragen." 
                />
            ) : (
                <div className="space-y-3">
                    {pendingNationalityList.map(req => (
                        <div 
                            key={req.id} 
                            onClick={() => {
                                setSelectedRequest(req);
                                setSelectedRequestType('nationality');
                            }}
                            className="flex items-center justify-between p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl cursor-pointer hover:bg-gray-800 transition w-full group"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center">
                                    {req.profile?.avatar_url ? (
                                        <img src={req.profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-black text-zinc-500">
                                            {req.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-col min-w-0 w-full">
                                    <div className="flex items-center mb-1">
                                        <span className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                            {getCountryFlag(req.nationality)} {getCountryNameOnly(req.nationality)}
                                        </span>
                                    </div>
                                    <span className="font-bold text-white text-base truncate">{req.profile?.full_name || 'Unbekannt'}</span>
                                    <span className="text-sm text-gray-400 truncate mt-0.5">
                                        Antrag auf Staatsbürgerschafts-Verifizierung ({req.verification_type === 'document' ? 'Dokument' : 'Verein'})
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 pl-2">
                                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderContentCurationView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <button onClick={() => setActiveView('dashboard')} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <Flame size={16} className="text-amber-500" />
                Content Curation & Heating
            </h3>

            {isCurationLoading ? (
                renderSkeletonList()
            ) : curationItems.length === 0 ? (
                <PremiumEmptyState 
                    icon={Sparkles} 
                    title="Kein Content vorhanden" 
                    message="Es gibt aktuell keine neuen Posts oder Videos zum Kuratieren." 
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {curationItems.map(item => {
                        const isBoosted = item.is_admin_boosted;
                        const score = (item.likes_count || 0) * 1 + (item.comments_count || 0) * 3;
                        
                        return (
                            <div 
                                key={`${item.type}-${item.id}`}
                                className={`flex flex-col justify-between p-5 bg-[#111] rounded-2xl border transition-all duration-300 relative ${
                                    isBoosted 
                                        ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-gradient-to-b from-amber-500/[0.02] to-transparent' 
                                        : 'border-white/5 hover:border-white/10 bg-zinc-900/[0.1]'
                                }`}
                            >
                                <div>
                                    {/* User header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                {item.players_master?.avatar_url ? (
                                                    <img src={item.players_master.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-zinc-500 uppercase">
                                                        {item.players_master?.full_name?.charAt(0) || '?'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-white truncate leading-tight">
                                                    {item.players_master?.full_name || 'Unbekannt'}
                                                </h4>
                                                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                    {item.type === 'video' ? 'Highlight-Video' : 'Textbeitrag'}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider shrink-0 ${
                                            item.type === 'video' 
                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        }`}>
                                            {item.type === 'video' ? 'Video' : 'Post'}
                                        </span>
                                    </div>

                                    {/* Preview text or thumbnail */}
                                    <div className="mb-4">
                                        {item.type === 'video' && item.thumbnail_url && (
                                            <div className="w-full h-24 rounded-xl overflow-hidden mb-2 relative border border-white/5 bg-black">
                                                <img src={item.thumbnail_url} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <Video size={20} className="text-white" />
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-xs text-zinc-300 font-medium line-clamp-3 leading-relaxed">
                                            {item.content || item.description || <span className="italic text-zinc-600">Kein Textinhalt</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Engagement & Boost toggle footer */}
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Trending Score</span>
                                        <span className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                                            {score}
                                            <span className="text-[9px] text-zinc-500 font-bold">
                                                ({item.likes_count || 0}L + {item.comments_count || 0}C)
                                            </span>
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleToggleBoost(item)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                                            isBoosted
                                                ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        <Rocket size={14} className={isBoosted ? 'animate-bounce' : ''} />
                                        {isBoosted ? 'BOOSTED' : 'BOOST'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl">
            <div className="w-full max-w-3xl h-[90vh] bg-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col sm:rounded-3xl relative overflow-hidden font-inter">
                
                {/* 1. Header (Hamburger Menu integration) */}
                <div className="relative flex justify-between items-center px-4 py-4 sm:px-6 sm:py-5 bg-[#050505] shrink-0 border-b border-white/5 z-20">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-zinc-400 hover:text-white"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-white leading-tight">
                                {MENU_ITEMS.find(i => i.id === activeView)?.label || 'Übersicht'}
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Command Center 2.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <NotificationBell />
                            {false && (
                                <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 2. Content Area with Routing */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative z-10">
                    {activeView === 'dashboard' && renderDashboardView()}
                    {activeView === 'status-freigaben' && renderAccountsView()}
                    {activeView === 'karriere-stationen' && renderCareersView()}
                    {activeView === 'vereins-rechte' && renderClaimsView()}
                    {activeView === 'nationality-verifications' && renderNationalityView()}
                    {activeView === 'user-intelligence' && <AdminUserIntelligence onBack={() => setActiveView('dashboard')} />}
                    {activeView === 'club-authority' && <AdminClubAuthority onBack={() => setActiveView('dashboard')} />}
                    {activeView === 'meldungen' && renderMeldungenView()}
                    {activeView === 'content-curation' && renderContentCurationView()}
                    {activeView === 'analytics' && renderAnalyticsView()}
                </div>

                {/* 2.5 Admin Request Detail Modal */}
                <AnimatePresence>
                    {selectedRequest && (
                        <AdminRequestDetailView 
                            request={selectedRequest}
                            type={selectedRequestType}
                            onClose={() => {
                                setSelectedRequest(null);
                                setSelectedRequestType(null);
                            }}
                            onApprove={async (actionSubtype) => {
                                if (selectedRequestType === 'account') await handleAccountAction(selectedRequest, 'approve');
                                else if (selectedRequestType === 'career') await handleCareerAction(selectedRequest, 'approve');
                                else if (selectedRequestType === 'report') await handleReportAction({ stopPropagation: () => {} }, selectedRequest, actionSubtype || 'dismiss');
                                else if (selectedRequestType === 'claim') await handleClaimAction(selectedRequest, 'approve');
                                else if (selectedRequestType === 'nationality') await handleNationalityAction(selectedRequest, 'approve');
                                setSelectedRequest(null);
                            }}
                            onReject={async (actionSubtype) => {
                                if (selectedRequestType === 'account') await handleAccountAction(selectedRequest, 'reject');
                                else if (selectedRequestType === 'career') await handleCareerAction(selectedRequest, 'reject');
                                else if (selectedRequestType === 'report') await handleReportAction({ stopPropagation: () => {} }, selectedRequest, actionSubtype || 'takedown');
                                else if (selectedRequestType === 'claim') await handleClaimAction(selectedRequest, 'reject');
                                else if (selectedRequestType === 'nationality') await handleNationalityAction(selectedRequest, 'reject');
                                setSelectedRequest(null);
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* 3. Off-Canvas Sidebar */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setIsSidebarOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[40000]" 
                            />
                            
                            {/* Sidebar Menu */}
                            <motion.div 
                                initial={{ x: '-100%' }} 
                                animate={{ x: 0 }} 
                                exit={{ x: '-100%' }} 
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute top-0 left-0 bottom-0 w-64 bg-[#0A0A0A] border-r border-white/10 shadow-2xl z-[50000] flex flex-col"
                            >
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="text-blue-600" size={24} />
                                        <h3 className="font-black text-white text-lg">Admin Menü</h3>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)}>
                                        <X size={20} className="text-zinc-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-1">
                                    {MENU_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeView === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveView(item.id);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all ${
                                                    isActive 
                                                    ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' 
                                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={18} />
                                                    <span className="text-sm">{item.label}</span>
                                                </div>
                                                {item.badge > 0 && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                                                    }`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Confirmation Modal */}
                {confirmAction && (
                    <div className="fixed inset-0 z-[70000] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-[#111] border border-white/10 p-6 rounded-3xl shadow-2xl text-center">
                            <AlertTriangle className="mx-auto text-blue-500 mb-4" size={40} />
                            <h3 className="text-xl font-black text-white mb-2">{confirmAction.title}</h3>
                            <p className="text-zinc-400 text-sm mb-6">{confirmAction.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Abbrechen</button>
                                <button onClick={confirmAction.onConfirm} className={`flex-1 py-3 text-white font-black rounded-xl transition-all ${confirmAction.confirmClass}`}>{confirmAction.confirmText}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
